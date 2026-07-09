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

import hashlib
import random

from flask import current_app
from flask import has_request_context
from flask import request as flask_request

from server.lib.util import resolve_flask_app

# URL Query Parameters
FEATURE_FLAG_URL_OVERRIDE_ENABLE_PARAM = 'enable_feature'
FEATURE_FLAG_URL_OVERRIDE_DISABLE_PARAM = 'disable_feature'

# Feature Flags
AUTOCOMPLETE_FEATURE_FLAG = 'autocomplete'
BIOMED_NL_FEATURE_FLAG = 'biomed_nl'
DATA_OVERVIEW_FEATURE_FLAG = 'data_overview'
VAI_FOR_STATVAR_SEARCH_FEATURE_FLAG = 'vai_for_statvar_search'
ENABLE_STAT_VAR_AUTOCOMPLETE = 'enable_stat_var_autocomplete'
ENABLE_NL_AGENT_DETECTOR = 'enable_nl_agent_detector'
NEW_RANKING_PAGE = 'new_ranking_page'
# This flag controls the switching of detect-and-fulfill API to use v2/resolve from current nl search vars
USE_V2_RESOLVE_FOR_NL_SEARCH_VARS = 'use_v2_resolve_for_nl_search_vars'
ENABLE_NL_V2NODE_FETCHALL = 'enable_nl_v2node_fetchall'
CROISSANT_JSON_LD_FEATURE = 'show_croissant_json_ld'


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

  Args:
    feature_name: feature flag string to look for in the URL
    app: Optional Flask application instance. If None, it will be inferred from
         the current Flask context.
    request: HTTP request as a flask.Request object. If None, it will be inferred from
             the current request context.
  
  Returns:
    True if the feature is enabled, False otherwise
  """
  app = resolve_flask_app(app)

  # If no app object is available, we cannot check feature flags, so default to False.
  if app is None:
    return False

  # If request is not provided, try to get it from the request context.
  if request is None and has_request_context():
    request = flask_request

  if feature_name == 'divert_to_spanner' and has_request_context():
    from flask import g
    if 'use_spanner' not in g:
      g.use_spanner = assign_spanner_cohort(app, request)
    return g.use_spanner

  # Check for URL parameter overrides
  if is_feature_override_enabled(feature_name, request):
    return True

  if is_feature_override_disabled(feature_name, request):
    return False

  # Check for feature flags in the app config
  feature_flags = app.config.get('FEATURE_FLAGS', {})
  is_feature_enabled = feature_flags.get(feature_name, {}).get('enabled', False)

  # Apply rollout percentage if specified
  if is_feature_enabled and 'rollout_percentage' in feature_flags.get(
      feature_name, {}):
    rollout_percentage = feature_flags[feature_name]['rollout_percentage']
    return random.random() * 100 < rollout_percentage

  return is_feature_enabled


def assign_spanner_cohort(app, request) -> bool:
  """Deterministically assigns the request to a Spanner cohort if enabled.

  Args:
    app: Flask application instance.
    request: HTTP request as a flask.Request object.

  Returns:
    True if client is in the Spanner diversion cohort, False otherwise.
  """
  # Check for URL parameter overrides
  if is_feature_override_enabled('divert_to_spanner', request):
    return True
  if is_feature_override_disabled('divert_to_spanner', request):
    return False

  # Check feature flag configuration
  feature_flags = app.config.get('FEATURE_FLAGS', {})
  flag_config = feature_flags.get('divert_to_spanner', {})
  if not flag_config.get('enabled', False):
    return False

  rollout_percentage = flag_config.get('rollout_percentage', 0)
  if rollout_percentage >= 100:
    return True
  if rollout_percentage <= 0:
    return False

  # Extract the original client IP (the first/leftmost IP in the X-Forwarded-For chain)
  ip = request.headers.get('X-Forwarded-For', request.remote_addr) or ''
  ip = ip.split(',')[0].strip()
  # Handle bracketed IPv6 with port (e.g., [2001:db8::1]:12345)
  if ip.startswith('['):
    ip = ip.split(']')[0][1:]
  # Handle IPv4 with port (contains exactly one colon, e.g., 198.51.100.1:443)
  elif ip.count(':') == 1:
    ip = ip.split(':')[0]

  ua = request.headers.get('User-Agent', '') or ''
  salt = app.config.get('SPANNER_DIVERT_SALT',
                        'datacommons-spanner-cohort-salt')

  hash_input = f"{ip}|{ua}|{salt}".encode('utf-8')
  hash_val = int(
      hashlib.md5(hash_input, usedforsecurity=False).hexdigest()[:8], 16)

  return (hash_val % 100) < rollout_percentage
