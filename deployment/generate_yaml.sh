#!/bin/bash
# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Script to generate deployment yaml files

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

function create_deployment {
  # Add esp deployment
  yq merge -a=append \
    $DIR/website.yaml.tmpl \
    $ROOT/mixer/deployment/template/esp.yaml.tmpl \
    > deployment.yaml
  # Add mixer deployment
  yq merge -i -a=append \
    deployment.yaml \
    $ROOT/mixer/deployment/template/mixer.yaml.tmpl
}

function set_replicas {
  yq w -i deployment.yaml \
    spec.replicas \
    $(yq r $DIR/config.yaml scaling.replicas.$env)
}

function set_website {
  # Website memory request
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[0].resources.requests.memory \
    $(yq r $DIR/config.yaml mem.website.req.$env)
  # Website memory limit
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[0].resources.limits.memory \
    $(yq r $DIR/config.yaml mem.website.limit.$env)
  # Website cpu request
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[0].resources.requests.cpu \
    $(yq r $DIR/config.yaml cpu.website.req.$env)
  # Website cpu limit
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[0].resources.limits.cpu \
    $(yq r $DIR/config.yaml cpu.website.limit.$env)

  # Website container
  # TODO(shifucun): update this to use github commit hash for ci/cd
  yq w -i deployment.yaml \
    spec.template.spec.containers[0].image $(yq r $DIR/config.yaml image.website.$env)
  # Pull policy, should be local docker image for deve env
  yq w -i deployment.yaml \
    spec.template.spec.containers[0].imagePullPolicy $(yq r $DIR/config.yaml pull_policy.$env)
  # Set FLASK_ENV
  yq w -i deployment.yaml \
    spec.template.spec.containers[0].env[1].value "gke"
  # Set GCS_BUCKET
  yq w -i deployment.yaml \
    spec.template.spec.containers[0].env[2].value $(yq r $DIR/config.yaml gcs_bucket.$env)
  # Set PROJECT
  yq w -i deployment.yaml \
    spec.template.spec.containers[0].env[3].value $(yq r $DIR/config.yaml project.$env)
}

function set_esp {
  project=$(yq r $DIR/config.yaml project.$env)
  if [[ $env == "dev" ]]; then
      email=$(git config user.email)
      prefix="${email/@/.}.website-esp"
  else
      prefix="website-esp"
  fi
  service_name="$prefix.endpoints.$project.cloud.goog"

  # ESP service name
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[1].args[1] \
    $service_name
  # ESP memory request
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[1].resources.requests.memory \
    $(yq r $DIR/config.yaml mem.esp.req.$env)
  # ESP memory limit
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[1].resources.limits.memory \
    $(yq r $DIR/config.yaml mem.esp.limit.$env)
  # ESP cpu request
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[1].resources.requests.cpu \
    $(yq r $DIR/config.yaml cpu.esp.req.$env)
  # ESP cpu limit
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[1].resources.limits.cpu \
    $(yq r $DIR/config.yaml cpu.esp.limit.$env)
  # Need to set "non_gcp" flag to make ESP working on Minikube
  if [[ $env == "dev" ]]; then
    yq w -i --style=double --inplace -- deployment.yaml \
      spec.template.spec.containers[1].args[+] '--non_gcp'
  fi
  # ESP service configuration
  yq w --style=double $ROOT/mixer/deployment/template/endpoints.yaml.tmpl \
    name $service_name > endpoints.yaml
  yq w -i endpoints.yaml title $service_name
}

function set_mixer {
  # Mixer memory request
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].resources.requests.memory \
    $(yq r $DIR/config.yaml mem.mixer.req.$env)
  # Mixer memory limit
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].resources.limits.memory \
    $(yq r $DIR/config.yaml mem.mixer.limit.$env)
  # Mixer cpu request
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].resources.requests.cpu \
    $(yq r $DIR/config.yaml cpu.mixer.req.$env)
  # Mixer cpu limit
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].resources.limits.cpu \
    $(yq r $DIR/config.yaml cpu.mixer.limit.$env)
  # Mixer image
  yq w -i deployment.yaml \
    spec.template.spec.containers[2].image \
    $(yq r $DIR/config.yaml image.mixer)
  # Mixer pull policy
  yq w -i deployment.yaml \
    spec.template.spec.containers[2].imagePullPolicy \
    "Always"
  # Bigquery dataset
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].args[1] "$(head -1 $ROOT/mixer/deployment/bigquery.txt)"
  # Bigtable table name
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].args[3] "$(head -1 $ROOT/mixer/deployment/bigtable.txt)"
  # Bigtable project
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].args[5] "$(yq r $DIR/config.yaml args.mixer.bt_project)"
  # Bigtable instance
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].args[7] "$(yq r $DIR/config.yaml args.mixer.bt_instance)"
  # Bigquery billing project
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].args[9] "$(yq r $DIR/config.yaml project.$env)"
  # Branch cache folder
  yq w -i --style=double deployment.yaml \
    spec.template.spec.containers[2].args[11] "$(yq r $DIR/config.yaml args.mixer.branch_folder.$env)"
}


# Valid argument would be: "dev", "staging", "prod"
env=$1
if [[ $env != "dev" ]] && [[ $env != "staging" ]] && [[ $env != "prod" ]]; then
    echo "Invalid environment: $env"
    exit
fi

create_deployment
set_replicas
set_website
set_esp
set_mixer