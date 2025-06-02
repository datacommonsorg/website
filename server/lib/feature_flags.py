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
"""Common library for functions related to feature flags"""

from flask import current_app

AUTOCOMPLETE_FEATURE_FLAG = 'autocomplete'
BIOMED_NL_FEATURE_FLAG = 'biomed_nl'
DATA_OVERVIEW_FEATURE_FLAG = 'data_overview'


def is_feature_enabled(feature_name: str, app=None) -> bool:
  """Returns whether the feature with `feature_name` is enabled."""
  if not app:
    app = current_app
  return app.config['FEATURE_FLAGS'].get(feature_name, False)
