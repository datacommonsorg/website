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

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

# Update mixer
cd $ROOT
git submodule update --init --recursive
cd $ROOT/mixer
git remote set-url origin https://github.com/datacommonsorg/mixer.git
git pull origin master
git checkout master

# Deploy autopush instance
gsutil cp gs://datcom-control/latest_base_bigquery_version.txt deploy/storage/bigquery.version
yq eval -i 'del(.tables)' deploy/storage/base_bigtable_info.yaml
yq eval -i '.tables = []' deploy/storage/base_bigtable_info.yaml
for src in $(gsutil ls gs://datcom-control/autopush/*_latest_base_cache_version.txt); do
  echo "Copying $src"
  export TABLE="$(gsutil cat "$src")"
  yq eval -i '.tables += [env(TABLE)]' deploy/storage/base_bigtable_info.yaml
done
$ROOT/scripts/deploy_gke.sh autopush us-central1
$ROOT/scripts/deploy_gke.sh autopush europe-west2

# Deploy stanford instance
# yq eval -i 'del(.tables)' deploy/overlays/stanford/custom_bigtable_info.yaml
# yq eval -i '.tables = []' deploy/overlays/stanford/custom_bigtable_info.yaml
# for src in $(gsutil ls gs://datcom-stanford-resources/control/latest_base_cache_version.txt); do
#   echo "Copying $src"
#   export TABLE="$(gsutil cat "$src")"
#   yq eval -i '.tables += [env(TABLE)]' deploy/overlays/stanford/custom_bigtable_info.yaml
# done
# $ROOT/scripts/deploy_gke.sh stanford us-central1
