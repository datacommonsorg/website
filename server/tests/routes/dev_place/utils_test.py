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
"""Unit tests for server.routes.dev_place.utils."""

import random
import copy
import unittest
from unittest import mock
from dataclasses import asdict

from flask import Flask

from server.lib import fetch
from server.routes.dev_place import utils
from server.routes.dev_place.types import Place
from server.routes.dev_place.types import ServerBlockMetadata
from server.routes.dev_place.types import ServerChartConfiguration
from server.routes.dev_place.types import ServerChartMetadata
import server.routes.shared_api.place as place_api
from server.services import datacommons as dc

NANTERRE = Place(dcid="wikidataId/Q170507", name="Nanterre", types=["City"])
ARR_NANTERRE = Place(dcid="wikidataId/Q385728",
                     name="arrondissement of Nanterre",
                     types=["AdministrativeArea3"])
ILE_DE_FRANCE = Place(dcid="nuts/FR10",
                      name="Ile-de-France",
                      types=["EurostatNUTS2"])
ILE_DE_FRANCE_NUTS1 = Place(dcid="nuts/FR1",
                            name="Île-de-France",
                            types=["EurostatNUTS1"])
FRANCE = Place(dcid="country/FRA", name="France", types=["Country"])
EUROPE = Place(dcid="europe", name="Europe", types=["Continent"])

ZIP_94041 = Place(dcid="zip/94041",
                  name="94041",
                  types=["CensusZipCodeTabulationArea"])
MOUNTAIN_VIEW = Place(dcid="geoId/0649670",
                      name="Mountain View",
                      types=["City"])
SANTA_CLARA_COUNTY = Place(dcid="geoId/06085",
                           name="Santa Clara County",
                           types=["County"])
CALIFORNIA = Place(dcid="geoId/06", name="California", types=["State"])
USA = Place(dcid="geoId/US", name="United States", types=["Country"])
NORTH_AMERICA = Place(dcid="northamerica",
                      name="North America",
                      types=["Continent"])
EARTH = Place(dcid="Earth", name="Earth", types=["Place"])

PLACE_BY_ID = {
    NANTERRE.dcid: NANTERRE,
    ARR_NANTERRE.dcid: ARR_NANTERRE,
    ILE_DE_FRANCE.dcid: ILE_DE_FRANCE,
    ILE_DE_FRANCE_NUTS1.dcid: ILE_DE_FRANCE_NUTS1,
    FRANCE.dcid: FRANCE,
    EUROPE.dcid: EUROPE,
    ZIP_94041.dcid: ZIP_94041,
    MOUNTAIN_VIEW.dcid: MOUNTAIN_VIEW,
    SANTA_CLARA_COUNTY.dcid: SANTA_CLARA_COUNTY,
    CALIFORNIA.dcid: CALIFORNIA,
    USA.dcid: USA,
    NORTH_AMERICA.dcid: NORTH_AMERICA,
    EARTH.dcid: EARTH,
}


class TestUtils(unittest.IsolatedAsyncioTestCase):

  def setUp(self):
    super().setUp()

    app = Flask(__name__)
    app.config['BABEL_DEFAULT_LOCALE'] = 'en'
    app.config['SERVER_NAME'] = 'example.com'
    self.app_context = app.app_context()
    self.app_context.push()

    self.mock_fetch_place = self.patch(utils, "fetch_place")

    def fetch_place_side_effect(place_dcid, locale=None):
      if place_dcid in PLACE_BY_ID:
        return PLACE_BY_ID[place_dcid]
      return None

    self.mock_fetch_place.side_effect = fetch_place_side_effect

    def fetch_api_place_type_side_effect(place_dcid):
      if place_dcid in PLACE_BY_ID:
        return PLACE_BY_ID[place_dcid].types[0]
      return None

    self.mock_api_place_type = self.patch(place_api, "api_place_type")
    self.mock_api_place_type.side_effect = fetch_api_place_type_side_effect

    self.mock_fetch_places = self.patch(utils, "fetch_places")
    self.mock_fetch_raw_property_values = self.patch(fetch,
                                                     "raw_property_values")
    self.mock_fetch_descendent_places = self.patch(fetch, "descendent_places")
    self.mock_multi_prop_values = self.patch(fetch, "multiple_property_values")

    def fetch_get_i18n_name_side_effect(place_dcids):
      return {p: PLACE_BY_ID[p].name for p in place_dcids if p in PLACE_BY_ID}

    self.mock_get_i18n_name = self.patch(place_api, "get_i18n_name")
    self.mock_get_i18n_name.side_effect = fetch_get_i18n_name_side_effect

    def place_to_place_resp(place: Place):
      return {'name': place.name, 'dcid': place.dcid, 'type': place.types[0]}

    def fetch_api_parent_places_side_effect(place_dcids, include_admin_areas):
      return {
          CALIFORNIA.dcid: [
              place_to_place_resp(USA),
              place_to_place_resp(NORTH_AMERICA),
              place_to_place_resp(EARTH)
          ]
      }

    self.mock_api_parent_places = self.patch(place_api, "parent_places")
    self.mock_api_parent_places.side_effect = fetch_api_parent_places_side_effect

    # @mock.patch('server.routes.dev_place.utils.flask.url_for')  # Mock the url_for function
    def mock_url_for_side_effect(endpoint, **values):
      if endpoint == 'place.place':
        return f"/place/{values['place_dcid']}"
      return None

    self.mock_place_url = self.patch(utils, "get_place_url")
    self.mock_place_url.side_effect = mock_url_for_side_effect

    def fetch_translate(string: str, **kwargs):
      if 'placeType' in kwargs and 'parentPlaces' in kwargs:
        return f"{kwargs['placeType']} in {kwargs['parentPlaces']}"
      return string

    self.mock_translate = self.patch(place_api, "translate")
    self.mock_translate.side_effect = fetch_translate

    self.mock_obs_point = self.patch(dc, "obs_point")
    self.mock_obs_point_within = self.patch(dc, "obs_point_within")
    self.mock_v2node = self.patch(dc, "v2node")
    self.mock_fetch_peer_places_within = self.patch(utils,
                                                    "fetch_peer_places_within")
    self.mock_fetch_similar_place_dcids = self.patch(
        utils, "fetch_similar_place_dcids")
    self.mock_fetch_child_place_dcids = self.patch(utils,
                                                   "fetch_child_place_dcids")
    self.mock_fetch_places_from_dcids = self.patch(utils,
                                                   "extract_places_from_dcids")

  def tearDown(self):
    self.app_context.pop()
    super().tearDown()

  def patch(self, module, name):
    patcher = mock.patch.object(module, name)
    mock_obj = patcher.start()
    self.addCleanup(patcher.stop)
    return mock_obj

  # def test_get_place_html_link(self):
  #   """Tests the get_place_html_link generates the proper link."""
  #   with self.app_context: # Simulate a request
  #     ca_link = utils.get_place_html_link("geoId/06", "California")
  #     africa_link = utils.get_place_html_link("africa", "Africa")

  #   self.assertEqual(ca_link, '<a href="/place?place_dcid=geoId/06">California</a>')
  #   self.assertEqual(africa_link, '<a href="/place?place_dcid=africa">Africa</a>')

  def test_get_parent_places(self):
    """Tests that getting parent places returns the proper values."""
    self.mock_api_parent_places.return_value = {
        "geoId/06": [{
            "dcid": "geoId/06",
            "name": "California",
            "type": "State"
        }, {
            "dcid": "country/USA",
            "name": "United States",
            "type": "Country"
        }]
    }
    parents = utils.get_parent_places("geoId/06")
    self.assertEqual(len(parents), 2)
    self.assertEqual([p.dcid for p in parents], ["geoId/06", "country/USA"])

  def test_get_parent_places_filters_invalid(self):
    """Tests that getting parent places returns the proper values."""
    self.mock_api_parent_places.return_value = {
        "geoId/06": [
            {
                "dcid": "geoId/06",
                "type": "State"  # missing name.
            },
            {
                "dcid": "country/USA",
                "name": "United States"  # missing types.
            },
            {
                "name": "United States",
                "types": "Continent"  # missing dcid.
            }
        ]
    }

    self.assertEqual(len(utils.get_parent_places("geoId/06")), 0)

  def test_get_ordered_by_place_type_to_highlight_usa_place(self):
    """Tests that getting parent places returns the proper values in the right order for the USA place format."""
    places = [
        ZIP_94041, MOUNTAIN_VIEW, SANTA_CLARA_COUNTY, CALIFORNIA, USA,
        NORTH_AMERICA, EARTH
    ]
    # Zips should be removed, the order above is expected.
    expected_order = copy.deepcopy(places[1:])

    # randomize the order in place.
    random.shuffle(places)

    actual_order = utils.get_ordered_by_place_type_to_highlight(places)

    self.assertEqual(actual_order, expected_order)

  def test_get_ordered_by_place_type_to_highlight_eu_place(self):
    """Tests that getting parent places returns the proper values in the right order for the EU place format."""
    places = [
        NANTERRE, ARR_NANTERRE, ILE_DE_FRANCE, ILE_DE_FRANCE_NUTS1, FRANCE,
        EUROPE, EARTH
    ]

    # ARR_NANTERRE is an AA3 so remove it.
    expected_places = [places[0]] + places[2:]

    expected_order = copy.deepcopy(expected_places)

    # randomize the order in place.
    random.shuffle(places)

    actual_order = utils.get_ordered_by_place_type_to_highlight(places)

    self.assertEqual(actual_order, expected_order)

  def test_get_place_override_zip(self):
    places = [
        ZIP_94041, MOUNTAIN_VIEW, SANTA_CLARA_COUNTY, CALIFORNIA, USA,
        NORTH_AMERICA, EARTH
    ]

    random.shuffle(places)

    place = utils.get_place_override(places)
    self.assertEqual(place.dcid, MOUNTAIN_VIEW.dcid)

  def test_get_place_override_mtv(self):
    places = [
        MOUNTAIN_VIEW, SANTA_CLARA_COUNTY, CALIFORNIA, USA, NORTH_AMERICA, EARTH
    ]

    random.shuffle(places)

    place = utils.get_place_override(places)
    self.assertEqual(place.dcid, MOUNTAIN_VIEW.dcid)

  def test_get_place_override_ile_de_france(self):
    places = [ILE_DE_FRANCE, ILE_DE_FRANCE_NUTS1, FRANCE, EUROPE, EARTH]

    random.shuffle(places)

    place = utils.get_place_override(places)
    self.assertEqual(place.dcid, ILE_DE_FRANCE.dcid)

  def test_get_place_type_with_parent_places_links(self):
    place_str = utils.get_place_type_with_parent_places_links(CALIFORNIA.dcid)
    self.assertEqual(
        place_str,
        'singular_state in <a href="None">United States</a>, <a href="None">North America</a>, <a href="None">Earth</a>'
    )

  def test_place_type_to_highlight(self):
    self.assertEqual(
        utils.place_type_to_highlight(["City", "State"]), "State")
    self.assertIsNone(utils.place_type_to_highlight(["City"]))
    self.assertIsNone(utils.place_type_to_highlight([]))

  # def test_filter_chart_config_for_category(self):
  #   config = [
  #       ServerChartConfiguration(
  #           category="Overview",
  #           blocks=[
  #               ServerBlockMetadata(
  #                   is_overview=True,
  #                   charts=[ServerChartMetadata(type="LINE")])
  #           ]),
  #       ServerChartConfiguration(
  #           category="Economics",
  #           blocks=[ServerBlockMetadata(charts=[ServerChartMetadata(type="BAR")])
  #                  ])
  #   ]
  #   overview_config = utils.filter_chart_config_for_category("Overview", config)
  #   self.assertEqual(len(overview_config), 1)
  #   self.assertEqual(overview_config.category, "Overview")

  #   economics_config = utils.filter_chart_config_for_category("Economics",
  #                                                            config)
  #   self.assertEqual(len(economics_config), 1)
  #   self.assertEqual(economics_config.category, "Economics")

  # def test_count_places_per_stat_var(self):
  #   # TODO.
  #   pass
