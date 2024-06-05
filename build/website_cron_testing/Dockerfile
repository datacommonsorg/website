# Copyright 2023 Google LLC
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

FROM gcr.io/datcom-ci/webdriver-chrome:2024-06-05

WORKDIR /resources

# Install python requirements
COPY build/website_cron_testing/requirements.txt .
RUN python3 -m pip install --upgrade pip setuptools
RUN pip3 install -r requirements.txt

# Copy scripts and folders needed for nodejs query testing
COPY server/integration_tests/standalone/nodejs_query.py .
COPY tools/nl/nodejs_query_differ/differ.py .
COPY tools/send_email/send_email.py .
COPY tools/nl/nodejs_query_differ/goldens/ goldens/

# Copy scripts for adversarial tests
COPY server/integration_tests/standalone/adversarial.py .

# Copy scripts for sanity tests
COPY server/webdriver/tests/standalone/sanity.py .

# Copy scripts and make folders needed for screenshot tests
COPY server/webdriver/screenshot/remote/main.py screenshot.py
# Screenshot test requires other files from the webdriver folder so copy
# the whole folder over
COPY server/webdriver/. server/webdriver/
# Screenshot tests save screenshots to a folder called screenshots so add
# this folder
RUN mkdir screenshots

# Copy and make executable the script for running all the tests
COPY build/website_cron_testing/run_website_cron_tests.sh .
RUN chmod +x run_website_cron_tests.sh
