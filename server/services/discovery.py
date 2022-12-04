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
"""Discovery module discoveres hosts based on API names."""

from dataclasses import dataclass
import itertools
from typing import Dict, List, Union
import yaml

import lib.config as libconfig

cfg = libconfig.get_config()


class InvalidEndpointException(Exception):
  pass


class InvalidIngressConfig(Exception):
  pass


# By default, all endpoints are expected on localhost port 8081.
DEFAULT_INGRESS_RULES = dict({cfg.API_ROOT: ['/*']})


@dataclass
class Endpoint:
  name: str  # Reference of the endpoint, use only within this server.
  path: str  # Path to a specific API defined by mixer.


class Endpoints:
  """Container for endpoint."""

  def __init__(self, endpoints: List[Endpoint]):
    self.endpoints = endpoints
    self.endpoint_name_to_path = {e.name: e.path for e in self.endpoints}
    self.endpoint_name_to_host = dict()  # unconfigured.

  def configure(self, ingress_rules: Dict[str, List[str]]):
    """Sets endpoint name to host mapping from ingress rules."""
    patterns = itertools.chain(*ingress_rules.values())
    if '/*' not in patterns:
      raise Exception('Invalid ingress rules: Must have a "/*" route.')

    # Find a matching host for each endpoint from ingress rules.
    for endpoint in self.endpoints:
      host = self.find_host(endpoint.path, ingress_rules)
      self.endpoint_name_to_host[endpoint.name] = host

  def get_all_hosts(self) -> List[str]:
    """Returns a list of all hosts."""
    return sorted(self.endpoint_name_to_host.values())

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
    find)host('xyz/def', rules) -> 'svc-b'

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

  def get_service_url(self, endpoint_name: str) -> str:
    """Returns a callable url for an endpoint.

    Caller is responsible for making sure that endpoint exists in config.
    """
    path = self.endpoint_name_to_path[endpoint_name]
    host = self.endpoint_name_to_host[endpoint_name]
    if host.startswith('http'):
      return f'{host}{path}'
    return f"https://{host}{path}"


# Source of truth for all mixer endpoints.
endpoints = Endpoints([
    Endpoint(name='query', path='/query'),
    Endpoint(name='translate', path='/translate'),
    Endpoint(name='search', path='/search'),
    Endpoint(name='point', path='/v1/bulk/observations/point'),
    Endpoint(name='point_within', path='/v1/bulk/observations/point/linked'),
    Endpoint(name='series', path='/v1/bulk/observations/series'),
    Endpoint(name='series_within', path='/v1/bulk/observations/series/linked'),
    Endpoint(name='series_dates', path='/v1/bulk/observation-dates/linked'),
    Endpoint(name='triples', path='/v1/triples'),
    Endpoint(name='stat_vars', path='/v1/variables'),
    Endpoint(name='stat_var_ancestors', path='/v1/variable/ancestors'),
    Endpoint(name='v0_triples', path='/node/triples'),
    Endpoint(name='properties', path='/v1/properties'),
    Endpoint(name='property_values', path='/v1/bulk/property/values'),
    Endpoint(name='v0_property_values', path='/node/property-values'),
    Endpoint(name='get_places_in', path='/node/places-in'),
    Endpoint(name='get_place_ranking', path='/node/ranking-locations'),
    Endpoint(name='get_stat_vars_union', path='/v1/place/stat-vars/union'),
    # TODO(shifucun): switch back to /node/related-places after data switch.
    Endpoint(name='get_related_places', path='/node/related-locations'),
    Endpoint(name='search_statvar', path='/stat-var/search'),
    Endpoint(name='match_statvar', path='/stat-var/match'),
    Endpoint(name='get_statvar_summary', path='/stat-var/summary'),
    Endpoint(name='variable_group_info', path='/v1/info/variable-group'),
    # Recon APIs
    Endpoint(name='resolve_id', path='/v1/recon/resolve/id'),
    # Bio APIs
    Endpoint(name='bio', path='/internal/bio'),
    # Misc
    Endpoint(name='get_landing_page_data', path='/v1/internal/page/place'),
])


def configure_endpoints_from_ingress(ingress_rules: Union[str,
                                                          Dict[str,
                                                               List[str]]]):
  """Must be called at server startup, before server is considered ready."""
  if isinstance(ingress_rules, str):
    with open(ingress_rules, encoding='utf-8') as f:
      try:
        ingress_rules = yaml.safe_load(f)
      except yaml.YAMLError as exc:
        raise InvalidIngressConfig(
            f'Ingress config file is invalid: {ingress_rules}') from exc

  endpoints.configure(ingress_rules)


def get_service_url(endpoint_name: str) -> str:
  """Returns the full url of a service.

    Args:
        endpoint_name: path of the API.
    Returns:
        Full service url.
    """
  if endpoint_name not in endpoints.endpoint_name_to_host:
    raise InvalidEndpointException("endpoint %s was not configured" %
                                   endpoint_name)
  return endpoints.get_service_url(endpoint_name)


def get_health_check_urls():
  """Return healthcheck urls for all set of hosts."""
  return [f'{host}/version' for host in sorted(endpoints.get_all_hosts())]
