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

set -e

cd static
npm install --update

# TODO(beets): Add stats_var_titles when that bundle is ready
for MODULE in stats_var_labels place;
do
  for LANG in de en es fr hi it ja ko pt-BR ru zh-CN;
  do
    npm run compile -- js/i18n/strings/$LANG/$MODULE.json --ast --out-file js/i18n/compiled-lang/$LANG/$MODULE.json
  done
done
cd ..

python3 -m venv .env
source .env/bin/activate
pip3 install -r server/requirements.txt -q
.env/bin/pybabel compile -d server/l10n -f -D all
