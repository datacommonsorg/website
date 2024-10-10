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


class Config(_base.Config):
  CDC_WEBDRIVER = True
  API_ROOT = 'https://dc-autopush-kqb7thiuka-uc.a.run.app'
  SECRET_PROJECT = 'datcom-website-dev'
  SCHEME = 'http'
  SHOW_TOPIC = True
  USE_LLM = True
  ENABLE_BQ = True
