# Copyright 2026 Google LLC
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
"""Utility functions for integration tests."""

import contextlib
import urllib.parse

import requests

# Central dictionary of feature flags to override for all integration tests.
# Set value to True to force enable, False to force disable.
FEATURE_OVERRIDES = {
    'disable_explore_more_in_nl_search_for_spanner': False,
}


def post_request(url, **kwargs):
  """Wraps requests.post, automatically appending override parameters to the URL."""
  if not FEATURE_OVERRIDES:
    return requests.post(url, **kwargs)

  parsed_url = urllib.parse.urlparse(url)
  query_params = urllib.parse.parse_qs(parsed_url.query, keep_blank_values=True)

  for flag, enabled in FEATURE_OVERRIDES.items():
    param_name = 'enable_feature' if enabled else 'disable_feature'
    if param_name not in query_params:
      query_params[param_name] = []
    if flag not in query_params[param_name]:
      query_params[param_name].append(flag)

  # Reconstruct the URL query string
  flat_params = []
  for k, vs in query_params.items():
    for v in vs:
      flat_params.append((k, v))
  new_query = urllib.parse.urlencode(flat_params)

  new_url = urllib.parse.urlunparse((
      parsed_url.scheme,
      parsed_url.netloc,
      parsed_url.path,
      parsed_url.params,
      new_query,
      parsed_url.fragment,
  ))
  return requests.post(new_url, **kwargs)


@contextlib.contextmanager
def feature_overrides(overrides):
  """Temporarily overrides feature flags in integration tests."""
  original = FEATURE_OVERRIDES.copy()
  FEATURE_OVERRIDES.update(overrides)
  try:
    yield
  finally:
    FEATURE_OVERRIDES.clear()
    FEATURE_OVERRIDES.update(original)
