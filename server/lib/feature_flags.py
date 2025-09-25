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

import random

from flask import current_app

# URL Query Parameters
FEATURE_FLAG_URL_OVERRIDE_ENABLE_PARAM = 'enable_feature'
FEATURE_FLAG_URL_OVERRIDE_DISABLE_PARAM = 'disable_feature'

# Feature Flags
AUTOCOMPLETE_FEATURE_FLAG = 'autocomplete'
BIOMED_NL_FEATURE_FLAG = 'biomed_nl'
DATA_OVERVIEW_FEATURE_FLAG = 'data_overview'
STANDARDIZED_VIS_TOOL_FEATURE_FLAG = 'standardized_vis_tool'
VAI_FOR_STATVAR_SEARCH_FEATURE_FLAG = 'vai_for_statvar_search'
VAI_MEDIUM_RELEVANCE_FEATURE_FLAG = 'vai_medium_relevance_threshold'
ENABLE_STAT_VAR_AUTOCOMPLETE = 'enable_stat_var_autocomplete'


def is_feature_override_enabled(feature_name: str, request=None) -> bool:
  """Check if a URL param to manually enable a feature is present.

  Args:
    feature_name: feature flag string to look for in the URL
    request: HTTP request as a flask.Request object
  
  Returns:
      True if URL param override to enable is present, False otherwise
  """
  if request is None:
    return False
  return request.args.get(
      FEATURE_FLAG_URL_OVERRIDE_ENABLE_PARAM) == feature_name


def is_feature_override_disabled(feature_name: str, request=None) -> bool:
  """Check if a URL param to manually disable a feature is present.

  Args:
      feature_name: feature flag string to look for in the URL
      request: HTTP request as a flask.Request object

  Returns:
      True if URL param override to disable is present, False otherwise
  """
  if request is None:
    return False
  return request.args.get(
      FEATURE_FLAG_URL_OVERRIDE_DISABLE_PARAM) == feature_name


def is_feature_enabled(feature_name: str, app=None, request=None) -> bool:
  """Returns whether the feature with `feature_name` is enabled.
  
  If both the enable and disable feature flags are present, will default to
  enabling the feature.
  """
  if not app:
    app = current_app

  if is_feature_override_enabled(feature_name, request):
    return True

  if is_feature_override_disabled(feature_name, request):
    return False

  feature_flags = app.config['FEATURE_FLAGS']
  is_feature_enabled = feature_flags.get(feature_name, {}).get('enabled', False)
  if is_feature_enabled and 'rollout_percentage' in feature_flags.get(
      feature_name, {}):
    rollout_percentage = feature_flags[feature_name]['rollout_percentage']
    return random.random() * 100 < rollout_percentage

  return is_feature_enabled