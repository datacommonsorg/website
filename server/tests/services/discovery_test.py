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

import unittest

from server.services.discovery import configure_endpoints_from_ingress
from server.services.discovery import DEFAULT_INGRESS_RULES
from server.services.discovery import get_all_endpoint_paths
from server.services.discovery import get_service_url


class TestServiceDiscovery(unittest.TestCase):

  def test_default_config(self):
    """Test default rules point all endpoints to API_ROOT(test config)."""
    configure_endpoints_from_ingress(DEFAULT_INGRESS_RULES)

    for endpoint_path in get_all_endpoint_paths():
      assert get_service_url(endpoint_path) == f'http://api-root{endpoint_path}'

  def test_configure_endpoints_from_ingress_1(self):
    """Tests simple ingress configuration."""
    configure_endpoints_from_ingress(
        'server/tests/test_data/ingress/test1.yaml')

    assert get_service_url('/v1/query') == 'http://query-host:8080/v1/query'
    assert get_service_url(
        '/v1/place/related') == 'http://default-host:8080/v1/place/related'

  def test_configure_endpoints_from_ingress_2(self):
    """Tests ingress configuration."""
    configure_endpoints_from_ingress(
        'server/tests/test_data/ingress/test2.yaml')

    assert get_service_url(
        '/v2/observation') == 'http://observations-api:5000/v2/observation'

    assert get_service_url('/v2/node') == 'http://v0-node-service:8888/v2/node'

    assert get_service_url('/v1/query') == 'http://bq-service/v1/query'
