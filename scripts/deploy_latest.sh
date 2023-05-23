#!/bin/bash
#
# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# Deploy various website instances with the latest mixer and base cache
# ENV refers to the name of the .yaml file in deploy/gke

# !!! WARNING: Run this script in a clean Git checkout at the desired commit.

set -e

ENV=$1
if [[ $ENV == "" ]]; then
  ENV="autopush"
fi
echo "Run autopush for env: $ENV"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

# Update mixer
cd $ROOT
git submodule update --init --recursive
cd $ROOT/mixer
git remote set-url origin https://github.com/datacommonsorg/mixer.git
git checkout master
git pull origin master

# Deploy autopush instance
gsutil cp gs://datcom-control/latest_base_bigquery_version.txt deploy/storage/bigquery.version
yq eval -i 'del(.tables)' deploy/storage/base_bigtable_info.yaml
yq eval -i '.tables = []' deploy/storage/base_bigtable_info.yaml
for src in $(gsutil ls gs://datcom-control/autopush/*_latest_base_cache_version.txt); do
  echo "Copying $src"
  export TABLE="$(gsutil cat "$src")"
  if [[ $TABLE != '' ]]; then
    yq eval -i '.tables += [env(TABLE)]' deploy/storage/base_bigtable_info.yaml
  fi
done

cd $ROOT

# Deploy in primary region
PRIMARY_REGION=$(yq eval '.region.primary' deploy/gke/autopush.yaml)
$ROOT/scripts/deploy_gke_helm.sh -e $ENV -l $PRIMARY_REGION

# Deploy in other regions
len=$(yq eval '.region.others | length' deploy/gke/"$ENV".yaml)
for index in $(seq 0 $(($len-1)));
do
  export index=$index
  REGION=$(yq eval '.region.others[env(index)]' deploy/gke/"$ENV".yaml)
  echo $REGION
  if [[ $REGION != '' ]]; then
    $ROOT/scripts/deploy_gke_helm.sh -e $ENV -l $REGION
  fi
done