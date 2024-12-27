# Copyright 2023 Google LLC
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

from server.app_env import _base


class AutopushConfig(_base.Config):
  INTEGRATION = True
  API_ROOT = 'https://autopush.api.datacommons.org'
  SECRET_PROJECT = 'datcom-website-dev'
  SCHEME = 'http'
  USE_LLM = True


class StagingConfig(_base.Config):
  INTEGRATION = True
  API_ROOT = 'https://staging.api.datacommons.org'
  SECRET_PROJECT = 'datcom-website-staging'
  SCHEME = 'http'
  USE_LLM = True


# This is only used for testing bad-words file before push.
class BadWordsConfig(StagingConfig):
  BAD_WORDS_FILE = 'nl_bad_words_staging.txt'