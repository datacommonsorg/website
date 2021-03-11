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

# Script to process translations for serving. Run this from the root directory of the repo.

set -e

cd static
npm list @formatjs/cli || npm install formatjs
npm run extract -- 'js/**/*.ts*' \
  --out-file js/i18n/strings/en/place.json \
  --id-interpolation-pattern '[sha512:contenthash:base64:6]'\
  --ignore '**/i18n/i18n.tsx'

cd ..

python3 -m venv .env
source .env/bin/activate
pip3 install -r server/requirements.txt -q
.env/bin/pybabel extract -F server/babel-mapping.ini \
  -o server/i18n/all.pot \
  -c "TRANSLATORS:" \
  -w 1000 \
  --omit-header \
  --sort-output \
  --strip-comments \
  server/

# All server message Id's must start with an all-caps, underscore-separated prefix e.g. CHART_TITLE-.
python3 tools/i18n/chart_config_extractor.py

# for LOCALE in de en es fr hi it ja ko ru pt-BR zh-CN;
for LOCALE in de en es fr hi it ja ko ru;
do
  .env/bin/pybabel update \
    -i server/i18n/all.pot \
    -d server/i18n \
    -l $LOCALE \
    -D all \
    -w 1000 \
    --previous \
    --no-fuzzy-matching \
    --omit-header
done

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "Please double-check changes in server/i18n/en/LC_MESSAGES/all.po which "
echo "is the base file for translation."
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"