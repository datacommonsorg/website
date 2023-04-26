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

from dataclasses import dataclass
from typing import Dict, List
import unittest

from server.routes.api.import_detection.detection_types import DCProperty
from server.routes.api.import_detection.detection_types import DCType
from server.routes.api.import_detection.detection_types import TypeProperty
import server.routes.api.import_detection.place_detection as pd
import server.routes.api.import_detection.utils as utils


class TestPlaceDetection(unittest.TestCase):

  def test_loading_country_mappings(self) -> None:
    try:
      country_mappings: List[Dict[str, str]] = utils.read_json_data(
          "country_mappings.json")
    except Exception as e:
      self.fail("read_country_mappings() returned an unexpected Exception: " +
                str(e))

    # Find some entry and verify it is correct.
    for country in country_mappings:
      if country["dcid"] == "country/TON":
        self.assertEqual(country["name"], "Tonga")
        self.assertEqual(country["isoCode"], "TO")
        self.assertEqual(country["countryAlpha3Code"], "TON")
        self.assertEqual(country["countryNumericCode"], "776")

  def test_loading_state_mappings(self) -> None:
    try:
      state_mappings: List[Dict[str, str]] = utils.read_json_data(
          "state_mappings.json")
    except Exception as e:
      self.fail("read_state_mappings() returned an unexpected Exception: " +
                str(e))

    # Find some entry and verify it is correct.
    for state in state_mappings:
      if state["geoId"] == "geoId/06":
        self.assertEqual(state["name"], "California")
        self.assertEqual(state["isoCode"], "US-CA")
        self.assertEqual(state["fips52AlphaCode"], "CA")

  def test_supported_type_properties(self) -> None:

    got: List[TypeProperty] = pd.supported_type_properties()
    expected: List[TypeProperty] = [
        # Country properties.
        TypeProperty(DCType("Country", "Country"),
                     DCProperty("isoCode", "ISO Code")),
        TypeProperty(DCType("Country", "Country"),
                     DCProperty("countryNumericCode", "Numeric Code")),
        TypeProperty(DCType("Country", "Country"),
                     DCProperty("countryAlpha3Code", "Alpha 3 Code")),
        TypeProperty(DCType("Country", "Country"), DCProperty("dcid", "Dcid")),
        # State properties.
        TypeProperty(DCType("State", "State"),
                     DCProperty("isoCode", "ISO Code")),
        TypeProperty(DCType("State", "State"),
                     DCProperty("fips52AlphaCode", "US State Alpha Code")),
        TypeProperty(DCType("State", "State"), DCProperty("geoId",
                                                          "FIPS Code")),
        TypeProperty(DCType("State", "State"), DCProperty("dcid", "Dcid")),
    ]

    self.assertCountEqual(got, expected)

  def test_country_detection(self) -> None:

    @dataclass
    class TestHelper:
      name: str
      input_vals: List[str]
      expected: TypeProperty

    test_cases: List[TestHelper] = [
        TestHelper(name="country-dcid-detection",
                   input_vals=[
                       "country/USA", "country/NOR", "country/LKA",
                       "country/NZL", "country/ZAF", "country/AUS",
                       "country/PAK", "country/IND", "country/BGD",
                       "country/AFI"
                   ],
                   expected=TypeProperty(DCType("Country", "Country"),
                                         DCProperty("dcid", "Dcid"))),
        TestHelper(name="country-iso-detection",
                   input_vals=[
                       "us", "no", "lk", "nz", "sa", "au", "pk", "in", "bd",
                       "it"
                   ],
                   expected=TypeProperty(DCType("Country", "Country"),
                                         DCProperty("isoCode", "ISO Code"))),
        TestHelper(name="country-alpha3-detection",
                   input_vals=[
                       "usa",
                       "NOR",
                       "lka",
                       "nzl",
                       "zaf",
                       "aus",
                       "pak",
                       "ind",
                       "bgd",
                       "ita",
                   ],
                   expected=TypeProperty(
                       DCType("Country", "Country"),
                       DCProperty("countryAlpha3Code", "Alpha 3 Code"))),
        TestHelper(name="country-numeric-detection",
                   input_vals=[
                       "840",
                       "578",
                       "144",
                       "554",
                       "710",
                       "36",
                       "586",
                       "356",
                       "50",
                       "380",
                   ],
                   expected=TypeProperty(
                       DCType("Country", "Country"),
                       DCProperty("countryNumericCode", "Numeric Code"))),
        TestHelper(name="country-numeric-with-missing",
                   input_vals=[
                       "840",
                       "578",
                       "144",
                       "554",
                       "710",
                       "36",
                       "586",
                       "",
                       "",
                       "",
                   ],
                   expected=TypeProperty(
                       DCType("Country", "Country"),
                       DCProperty("countryNumericCode", "Numeric Code"))),
        TestHelper(name="country-name-no-detection",
                   input_vals=[
                       "United statesssss",
                       "Norwayyyy",
                       "sri lankawwww",
                       "new zealandiiiiii",
                       "north africaaaaaaaaa",
                       "australiayyyyy",
                       "Pakistanyyyyyy",
                       "Indiannnnnn",
                       "bangladesh",
                       "french Afars and Issas",
                   ],
                   expected=None),
        TestHelper(name="country-iso-no-detection",
                   input_vals=[
                       "aaa",
                       "bbb",
                       "ccc",
                       "ddd",
                       "zzz",
                       "yyy",
                       "xxx",
                       "ind",
                       "bgd",
                       "ita",
                   ],
                   expected=None),
        TestHelper(name="country-numeric-no-detection",
                   input_vals=[
                       "0", "1", "2", "-1", "-2", "-3", "-4", "-5", "50", "380"
                   ],
                   expected=None),
    ]

    for tc in test_cases:
      self.assertEqual(pd.detect_column_with_places("", tc.input_vals),
                       tc.expected,
                       msg="Test named %s failed" % tc.name)

  def test_prop_max_score_detection(self) -> None:
    # Column values have both ISO codes and Numeric codes.
    # Numeric codes should have a higher detection percentage, so
    # they should be preferred.
    input_vals: List[str] = [
        # ISO codes.
        "us",
        "no",
        "lk",
        # Numeric codes.
        "840",
        "578",
        "144",
        "554",
        "710",
        "36",
        "586",
    ]
    expected: TypeProperty = TypeProperty(
        DCType("Country", "Country"),
        DCProperty("countryNumericCode", "Numeric Code"))

    self.assertEqual(pd.detect_column_with_places("", input_vals), expected)

    # Now add many more ISO codes to input_vals such that the
    # detection score for ISO codes increases.
    input_vals += ["nz", "sa", "au", "pk", "in", "bd", "it", "ca", "es"]
    expected = TypeProperty(DCType("Country", "Country"),
                            DCProperty("isoCode", "ISO Code"))

    self.assertEqual(pd.detect_column_with_places("", input_vals), expected)

  def test_state_detection(self) -> None:

    @dataclass
    class TestHelper:
      name: str
      input_vals: List[str]
      expected: TypeProperty

    test_cases: List[TestHelper] = [
        TestHelper(name="state-dcid-detection",
                   input_vals=[
                       "geoId/06",
                       "geoId/36",
                       "geoId/25",
                       "geoId/33",
                       "geoId/46",
                       "geoId/38",
                       "geoId/53",
                       "geoId/72",
                       "geoId/26",
                       "geoId/16",
                   ],
                   expected=TypeProperty(DCType("State", "State"),
                                         DCProperty("dcid", "Dcid"))),
        TestHelper(name="state-iso-detection",
                   input_vals=[
                       "US-CA",
                       "US-NY",
                       "US-MA",
                       "US-NH",
                       "US-SD",
                       "US-ND",
                       "US-WA",
                       "US-PR",
                       "US-MI",
                       "US-ID",
                   ],
                   expected=TypeProperty(DCType("State", "State"),
                                         DCProperty("isoCode", "ISO Code"))),
        TestHelper(
            name="state-fips52alpha-detection",
            input_vals=["nm", "ny", "wy", "nj", "ct", "nd", "nh", "wa", "fl"],
            expected=TypeProperty(
                DCType("State", "State"),
                DCProperty("fips52AlphaCode", "US State Alpha Code"))),
        TestHelper(name="state-fipsCode-detection",
                   input_vals=["01", "02", "04", "49", "36", "30"],
                   expected=TypeProperty(DCType("State", "State"),
                                         DCProperty("geoId", "FIPS Code"))),
        TestHelper(name="state-fips52AlphaCode-with-missing",
                   input_vals=[
                       "nm", "ny", "wy", "nj", "ct", "nd", "nh", "wa", "fl",
                       None
                   ],
                   expected=TypeProperty(
                       DCType("State", "State"),
                       DCProperty("fips52AlphaCode", "US State Alpha Code"))),
        TestHelper(
            name="state-iso-no-detection",
            # No detection due to too many non-ISO codes.
            input_vals=[
                "US-AA",
                "US-BB",
                "US-CC",
                "US-DD",
                "US-EE",
                "US-FF",
                "US-RR",
                "US-KK",
                "US-MI",
                "US-ID",
            ],
            expected=None),
    ]

    for tc in test_cases:
      self.assertEqual(pd.detect_column_with_places("", tc.input_vals),
                       tc.expected,
                       msg="Test named %s failed" % tc.name)

  def test_country_state_fips_detection(self) -> None:
    # Column has values which can be Numeric Codes for countries or
    # FIPS codes for US States.
    col_vals = ["36", "40", "50", "60"]

    # If the column header is no helpful information, detection should give
    # preference to Country.
    col_name: str = "nothing helpful"

    # Should detect country even though the column name has "state".
    self.assertEqual(
        pd.detect_column_with_places(col_name, col_vals),
        TypeProperty(DCType("Country", "Country"),
                     DCProperty("countryNumericCode", "Numeric Code")))

    # If the column header contains "country", detection should still give
    # preference to Country.
    col_name = "country"
    self.assertEqual(
        pd.detect_column_with_places(col_name, col_vals),
        TypeProperty(DCType("Country", "Country"),
                     DCProperty("countryNumericCode", "Numeric Code")))

    # If the column header contains "state", detection should give preference to
    # US State.
    col_name = "Something with state in it"
    self.assertEqual(
        pd.detect_column_with_places(col_name, col_vals),
        TypeProperty(DCType("State", "State"), DCProperty("geoId",
                                                          "FIPS Code")))
