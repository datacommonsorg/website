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

FROM gcr.io/datcom-ci/webdriver-chrome:2023-12-11

WORKDIR /resources

# Install python requirements
COPY build/website_cron_testing/requirements.txt .
RUN python3 -m pip install --upgrade pip setuptools
RUN pip3 install -r /resources/requirements.txt

# Copy script for running the cron tests
COPY server/integration_tests/standalone/nodejs_query.py .
COPY server/webdriver/tests/standalone/sanity.py .
COPY build/website_cron_testing/run_website_cron_tests.sh .
RUN chmod +x /resources/run_website_cron_tests.sh
