# Copyright 2025 Google LLC
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
FEATURE_FLAG_URL_OVERRIDE_PARAM = 'enable_feature'
STANDARDIZED_VIS_TOOL_FEATURE_FLAG = 'standardized_vis_tool'


def is_feature_override_enabled(feature_name: str, request=None) -> bool:
  """Check if a URL param override for a feature is present.

  Args:
    feature_name: feature flag string to look for in the URL
    request: HTTP request as a flask.Request object
  
  Returns:
      True if URL param override is present, False otherwise
  """
  if request is None:
    return False
  return request.args.get(FEATURE_FLAG_URL_OVERRIDE_PARAM) == feature_name


def is_feature_enabled(feature_name: str, app=None, request=None) -> bool:
  """Returns whether the feature with `feature_name` is enabled."""
  if not app:
    app = current_app

  if is_feature_override_enabled(feature_name, request):
    return True

  return app.config['FEATURE_FLAGS'].get(feature_name, False)
