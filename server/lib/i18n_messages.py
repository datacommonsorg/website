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
"""
Holds user-facing string literals to support internationalization and localization.
"""

from typing import Dict, List

from flask_babel import gettext

# Place type to the message id that holds its translation (singular)
PLACE_TYPE_TO_LOCALE_MESSAGE = {
    # TRANSLATORS: Label describing the place type for an administrative area
    "AdministrativeArea": gettext("Administrative Area"),
    # TRANSLATORS: Label describing the place type for an administrative area of level 1. For example, a US state.
    "AdministrativeArea1": gettext("Administrative Area 1 Place"),
    # TRANSLATORS: Label describing the place type for an administrative area of level 2. For example, a US county.
    "AdministrativeArea2": gettext("Administrative Area 2 Place"),
    # TRANSLATORS: Label describing the place type for an administrative area of level 3. For example, a city within a county.
    "AdministrativeArea3": gettext("Administrative Area 3 Place"),
    # TRANSLATORS: Label describing the place type for an administrative area of level 4. For example, a block or a borough within a city.
    "AdministrativeArea4": gettext("Administrative Area 4 Place"),
    # TRANSLATORS: Label describing the place type for an administrative area of level 5. For example, in India an administrative area of level 5 is a village
    "AdministrativeArea5": gettext("Administrative Area 5 Place"),
    # TRANSLATORS: Label describing the place type for a borough
    "Borough": gettext("Borough"),
    # TRANSLATORS: Label describing the place type for a city
    "City": gettext("City"),
    # TRANSLATORS: Label describing the place type for a country
    "Country": gettext("Country"),
    # TRANSLATORS: Label describing the place type for a county
    "County": gettext("County"),
    # TRANSLATORS: Label describing the place type for a Eurostat NUTS place of level 1, or a major social-economic region in Europe. For example, North Germany.
    "EurostatNUTS1": gettext("Eurostat NUTS 1 Place"),
    # TRANSLATORS: Label describing the place type for a Eurostat NUTS place of level 2, or a medium social-economic region in Europe. For example, Île-de-France, France.
    "EurostatNUTS2": gettext("Eurostat NUTS 2 Place"),
    # TRANSLATORS: Label describing the place type for a Eurostat NUTS place of level 3, or a smaller area designation used for regional planning. For example, Barcelona Province, Spain.
    "EurostatNUTS3": gettext("Eurostat NUTS 3 Place"),
    # TRANSLATORS: Label describing the place type for a neighborhood
    "Neighborhood": gettext("Neighborhood"),
    # TRANSLATORS: Label describing the place type for a place
    "Place": gettext("Place"),
    # TRANSLATORS: Label describing the place type for a state
    "State": gettext("State"),
    # TRANSLATORS: Label describing the place type for a town
    "Town": gettext("Town"),
    # TRANSLATORS: Label describing the place type for a village
    "Village": gettext("Village"),
    # TRANSLATORS: Label describing the place type for a ZIP code
    "CensusZipCodeTabulationArea": gettext("ZIP Code"),
}

# Place type to the message id that holds its translation (plural)
PLACE_TYPE_TO_LOCALE_MESSAGE_PLURAL = {
    # TRANSLATORS: Label describing the place type for an administrative area in plural form
    "AdministrativeArea": gettext("Administrative Areas"),
    # TRANSLATORS: Label describing the plural place type for an administrative area of level 1 in plural form. For example, a US state.
    "AdministrativeArea1": gettext("Administrative Area 1 Places"),
    # TRANSLATORS: Label describing the plural place type for an administrative area of level 2 in plural form. For example, a US county.
    "AdministrativeArea2": gettext("Administrative Area 2 Places"),
    # TRANSLATORS: Label describing the plural place type for an administrative area of level 3 in plural form. For example, a city within a county.
    "AdministrativeArea3": gettext("Administrative Area 3 Places"),
    # TRANSLATORS: Label describing the plural place type for an administrative area of level 4 in plural form. For example, a block or a borough within a city.
    "AdministrativeArea4": gettext("Administrative Area 4 Places"),
    # TRANSLATORS: Label describing the plural place type for an administrative area of level 5 in plural form. For example, in India an administrative area of level 5 is a village
    "AdministrativeArea5": gettext("Administrative Area 5 Places"),
    # TRANSLATORS: Label describing the plural place type for a borough in plural form
    "Borough": gettext("Boroughs"),
    # TRANSLATORS: Label describing the plural place type for a city in plural form
    "City": gettext("Cities"),
    # TRANSLATORS: Label describing the plural place type for a country in plural form
    "Country": gettext("Countries"),
    # TRANSLATORS: Label describing the plural place type for a county in plural form
    "County": gettext("Counties"),
    # TRANSLATORS: Label describing the plural place type for a Eurostat NUTS place of level 1 in plural form. For example, a major social-economic region in Europe. For example, North Germany.
    "EurostatNUTS1": gettext("Eurostat NUTS 1 Places"),
    # TRANSLATORS: Label describing the plural place type for a Eurostat NUTS place of level 2 in plural form. For example, a medium social-economic region in Europe. For example, Île-de-France, France.
    "EurostatNUTS2": gettext("Eurostat NUTS 2 Places"),
    # TRANSLATORS: Label describing the plural place type for a Eurostat NUTS place of level 3 in plural form. For example, a smaller area designation used for regional planning. For example, Barcelona Province, Spain.
    "EurostatNUTS3": gettext("Eurostat NUTS 3 Places"),
    # TRANSLATORS: Label describing the plural place type for a neighborhood in plural form
    "Neighborhood": gettext("Neighborhoods"),
    # TRANSLATORS: Label describing the plural place type for a place in plural form
    "Place": gettext("Places"),
    # TRANSLATORS: Label describing the plural place type for a state in plural form
    "State": gettext("States"),
    # TRANSLATORS: Label describing the plural place type for a town in plural form
    "Town": gettext("Towns"),
    # TRANSLATORS: Label describing the plural place type for a village in plural form
    "Village": gettext("Villages"),
    # TRANSLATORS: Label describing the plural place type for a ZIP code in plural form
    "CensusZipCodeTabulationArea": gettext("ZIP Codes"),
}


# Strings to use in place page
def get_place_type_in_parent_places_str(place_type: str,
                                        parent_places: str) -> str:
  # TRANSLATORS: Label for a place type in a parent place. For example: "Country in North America"
  return gettext('%(placeType)s in %(parentPlaces)s',
                 placeType=place_type,
                 parentPlaces=parent_places)


def get_other_places_in_parent_place_str(place_type: str,
                                         parent_place: str) -> str:
  # TRANSLATORS: Label for other places in a parent place. For example: "Other States in United States of America"
  return gettext('Other %(placeType)s in %(parentPlace)s',
                 placeType=place_type,
                 parentPlace=parent_place)


# Variables to include in the place overview table
PLACE_OVERVIEW_TABLE_VARIABLES: List[Dict[str, str]] = [
    {
        "variable_dcid": "Count_Person",
        # TRANSLATORS: Label for the "Count_Person" population variable representing the total population of a place
        "translated_name": gettext("Population")
    },
    {
        "variable_dcid": "Median_Income_Person",
        # TRANSLATORS: Label for the "Median_Income_Person" median income variable representing the median income of a place
        "translated_name": gettext("Median Income")
    },
    {
        "variable_dcid": "Median_Age_Person",
        # TRANSLATORS: Label for the "Median_Age_Person" median age variable representing the median age of a place
        "translated_name": gettext("Median Age")
    },
    {
        "variable_dcid": "UnemploymentRate_Person",
        # TRANSLATORS: Label for the "UnemploymentRate_Person" unemployment rate variable representing the unemployment rate of a place
        "translated_name": gettext("Unemployment Rate"),
        "unit": "Percent"
    },
]
