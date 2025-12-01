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

LOCALES="de en es fr hi it ja ko ru"

cd static
npm list @formatjs/cli || npm install formatjs

for LOCALE in $LOCALES;
do
  npm run compile -- js/i18n/strings/$LOCALE --ast js/i18n/compiled-lang/$LOCALE
done
cd ..

python3 -m venv .venv
source .venv/bin/activate
pip3 install -r server/requirements.txt -q
for LOCALE in $LOCALES;
do
  .venv/bin/pybabel compile -d server/i18n -f -D all -l $LOCALE
done
