import tempfile
import unittest

from services.discovery import configure_endpoints_from_ingress
from services.discovery import DEFAULT_INGRESS_RULES
from services.discovery import get_all_endpoint_paths
from services.discovery import get_service_url


class TestServiceDiscovery(unittest.TestCase):

  def test_default_config(self):
    """Test default rules point all endpoints to API_ROOT(test config)."""
    configure_endpoints_from_ingress(DEFAULT_INGRESS_RULES)

    for endpoint_path in get_all_endpoint_paths():
      assert get_service_url(
          endpoint_path) == f'https://api-root{endpoint_path}'

  def test_configure_endpoints_from_ingress_1(self):
    """Tests simple ingress configuration."""
    configure_endpoints_from_ingress('tests/test_data/ingress/test1.yaml')

    assert get_service_url('/query') == 'https://query-host:8080/query'
    assert get_service_url(
        '/stat-var/match') == 'https://stat-var-host:8080/stat-var/match'

    assert get_service_url(
        '/v1/bulk/observations/series'
    ) == 'https://bulk-observation-host:8080/v1/bulk/observations/series'
    # Test prefix match overriding wildcard.
    assert get_service_url(
        '/v1/bulk/observations/series/linked'
    ) == 'https://observation-series-linked-host:8080/v1/bulk/observations/series/linked'

    assert get_service_url(
        '/node/related-locations'
    ) == 'https://default-host:8080/node/related-locations'

  def test_configure_endpoints_from_ingress_2(self):
    """Tests ingress configuration."""
    configure_endpoints_from_ingress('tests/test_data/ingress/test2.yaml')

    assert get_service_url(
        '/v1/bulk/observation-dates/linked'
    ) == 'https://observations-api:5000/v1/bulk/observation-dates/linked'

    assert get_service_url(
        '/v1/bulk/observations/series/linked'
    ) == 'https://observations-api:5000/v1/bulk/observations/series/linked'

    assert get_service_url(
        '/v1/variables') == 'https://stat-var-svc/v1/variables'

    assert get_service_url('/v1/bulk/property/values'
                          ) == 'https://stat-var-svc/v1/bulk/property/values'

    assert get_service_url('/query') == 'https://bq-service/query'
