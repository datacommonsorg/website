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

# TODO: add support for pt-BR zh-CN;
LOCALES="de en es fr hi it ja ko ru"

cd static
npm list @formatjs/cli || npm install formatjs
npm run extract -- 'js/**/*.ts*' \
  --out-file js/i18n/strings/en/place.json \
  --id-interpolation-pattern '[sha512:contenthash:base64:6]'\
  --ignore '**/i18n/i18n.tsx' \
  --ignore '**/*.d.ts'

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
  --no-location \
  server/

# All server message Id's must start with an all-caps, underscore-separated prefix e.g. CHART_TITLE-.
python3 tools/i18n/chart_config_extractor.py

for LOCALE in $LOCALES;
do
  for BUNDLE in 'stats_var_titles.json' 'stats_var_labels.json';
  do
    if [[ $LOCALE != 'en' ]]; then
      python3 tools/i18n/add_fallback_messages.py $LOCALE $BUNDLE
    fi
  done
done

for LOCALE in $LOCALES;
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
  if [[ $LOCALE != 'en' ]]; then
    # Strip out comments to kept by pybabel update (en is used for TC extraction).
    fname="server/i18n/$LOCALE/LC_MESSAGES/all.po"
    grep -E -v "^#.*$" $fname > tmp.po
    mv tmp.po $fname
  fi
done

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "Please pay special attention to these files as they serve as the base "
echo "for translations: "
echo "> server/i18n/en/LC_MESSAGES/all.po"
echo "> static/js/i18n/en/*.json"
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"

