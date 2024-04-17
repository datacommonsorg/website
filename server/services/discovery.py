# Copyright 2022 Google LLC
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
"""Discovery module discoveres hosts based on API paths.

This module is intended to handle cases where Mixer services live
on multiple hosts where each host has a collection of API paths.

If the target Mixer is on a single host, such as is the case for
local development, then API_ROOT will handle all endpoints.

Usage:
  get_service_url(<API path>) will return a callable url.

Default behaviour:
  API_ROOT from app config will be used for all APIs.
"""

import itertools
from typing import Dict, List, Union

import yaml

import server.lib.config as libconfig

cfg = libconfig.get_config()


class InvalidEndpointException(Exception):
  pass


class InvalidIngressConfig(Exception):
  pass


# By default, all endpoints are expected on localhost port 8081.
DEFAULT_INGRESS_RULES = dict({cfg.API_ROOT: ['/*']})


class Endpoints:
  """Container for endpoint."""

  def __init__(self, endpoint_paths: List[str]):
    self.endpoint_paths = set(endpoint_paths)
    self.endpoint_path_to_host = dict()  # unconfigured.
    self.is_configured = False

  def configure(self, ingress_rules: Dict[str, List[str]]):
    """Sets endpoint name to host mapping from ingress rules."""
    patterns = itertools.chain(*ingress_rules.values())
    if '/*' not in patterns:
      raise Exception('Invalid ingress rules: Must have a "/*" route.')

    # Find a matching host for each endpoint from ingress rules.
    for endpoint_path in self.endpoint_paths:
      host = self.find_host(endpoint_path, ingress_rules)
      self.endpoint_path_to_host[endpoint_path] = host

    self.is_configured = True

  def get_all_hosts(self) -> List[str]:
    """Returns a list of all hosts."""
    return sorted(set(self.endpoint_path_to_host.values()))

  def find_host(self, path: str, ingress_rules: Dict[str, List[str]]) -> str:
    """Returns host with the pattern closest to a given path.

    For example, suppose we have the following.
    rules = {
      'svc-ab': ['a/b/*'],
      'svc-abc': ['a/b/c'],
      'svc-b': ['/*']
    }

    Exact match overrides wildcard ending.
    find_host('a/b/c', rules) -> 'svc-abc'

    Longer prefix match takes precedence.
    find_host('a/b/d/e', rules) -> 'svc-ab'

    Wildcard match catches everything.
    find_host('xyz/def', rules) -> 'svc-b'

    For more on what is a pattern, see GCP doc.
    https://cloud.google.com/load-balancing/docs/url-map-concepts#wildcards-regx-dynamic
    """
    match_host, match_pattern = '', ''
    for host, patterns in ingress_rules.items():
      for pattern in patterns:
        # Pattern has wild card.
        if pattern.endswith('/*'):
          pattern_prefix = pattern[:-len('/*')]
          if not path.startswith(pattern_prefix):
            continue
          if len(pattern) > len(match_pattern):
            match_pattern = pattern
            match_host = host

        # Pattern does not have wild, card -> exact match.
        if not path.startswith(pattern):
          continue
        if len(pattern) > len(match_pattern):
          match_pattern = pattern
          match_host = host

    return match_host

  def get_service_url(self, endpoint_path: str) -> str:
    """Returns a callable url for an endpoint.

    Caller is responsible for making sure that endpoint exists in config.
    """
    host = self.endpoint_path_to_host[endpoint_path]
    if host.startswith('http'):
      return f'{host}{endpoint_path}'
    # Assumes GKE internal addresses and must be http, not https.
    return f"http://{host}{endpoint_path}"


# Source of truth for all mixer endpoints.
endpoints = Endpoints([
    # v0
    '/translate',
    '/search',
    # v1
    '/v1/query',
    '/v1/bulk/info/place',
    '/v1/bulk/info/variable',
    '/v1/bulk/info/variable-group',
    '/v1/bulk/observation-dates/linked',
    '/v1/variable/ancestors',
    '/v1/place/ranking',
    '/v1/place/related',
    '/v1/variable/search',
    '/v1/internal/page/bio',
    '/v1/internal/page/place',
    '/v1/bulk/find/entities',
    '/v1/recognize/places',
    '/v1/recognize/entities',
    # v2
    '/v2/observation',
    '/v2/node',
    '/v2/resolve',
    '/v2/event',
])


def configure_endpoints_from_ingress(
    ingress_rules_or_path: Union[str, Dict[str, List[str]]]):
  """Must be called at server startup, before server is considered ready."""
  if isinstance(ingress_rules_or_path, str):
    with open(ingress_rules_or_path, encoding='utf-8') as f:
      try:
        ingress_rules_or_path = yaml.safe_load(f)
      except yaml.YAMLError as exc:
        raise InvalidIngressConfig(
            f'Ingress config file is invalid: {ingress_rules_or_path}') from exc

  endpoints.configure(ingress_rules_or_path)


# Map all APIs to a single host if no ingress config is supplied.
if not endpoints.is_configured:
  configure_endpoints_from_ingress(DEFAULT_INGRESS_RULES)


def get_all_endpoint_paths():
  """Returns all endpoint paths in sorted order."""
  return sorted(endpoints.endpoint_paths)


def get_service_url(endpoint_path: str) -> str:
  """Returns the full url of a service.

  Args:
      endpoint_name: path of the API.
  Returns:
      Full service url.
  """
  if endpoint_path not in endpoints.endpoint_paths:
    raise InvalidEndpointException('endpoint %s was not configured' %
                                   endpoint_path)
  return endpoints.get_service_url(endpoint_path)


def get_health_check_urls():
  """Return healthcheck urls for all set of hosts."""
  urls = []
  for host in sorted(endpoints.get_all_hosts()):
    if host.startswith('http'):
      urls.append(f'{host}/version')
      continue
    urls.append(f'http://{host}/version')
  return urls
