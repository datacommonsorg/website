import tempfile
import unittest

from services.discovery import configure_endpoints_from_ingress
from services.discovery import get_service_url


class TestServiceDiscovery(unittest.TestCase):

  def test_configure_endpoints_from_ingress(self):
    ingress_rules = '''query-host:8080:
- /query
stat-var-host:8080:
- /stat-var/*
bulk-observation-host:8080:
- /v1/bulk/observations/*
observation-series-linked-host:8080:
- /v1/bulk/observations/series/linked
default-host:8080:
- /*
'''
    tf = tempfile.NamedTemporaryFile()
    with open(tf.name, 'w', encoding='utf-8') as f:
      f.write(ingress_rules)
    configure_endpoints_from_ingress(tf.name)

    assert get_service_url('query') == 'query-host:8080/query'
    assert get_service_url(
        'match_statvar') == 'stat-var-host:8080/stat-var/match'

    assert get_service_url(
        'series') == 'bulk-observation-host:8080/v1/bulk/observations/series'
    # Test prefix match overriding wildcard.
    assert get_service_url(
        'series_within'
    ) == 'observation-series-linked-host:8080/v1/bulk/observations/series/linked'

    assert get_service_url(
        'get_related_places') == 'default-host:8080/node/related-locations'
