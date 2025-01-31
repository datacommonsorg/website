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

# Place type to the message id that holds its translation
from typing import Dict, List

# Place type to the message id that holds its translation (singular)
PLACE_TYPE_TO_LOCALE_MESSAGE = {
    "AdministrativeArea": "singular_administrative_area",
    "AdministrativeArea<Level>": "singular_administrative_area_level",
    "Borough": "singular_borough",
    "City": "singular_city",
    "Country": "singular_country",
    "County": "singular_county",
    "EurostatNUTS<Level>": "singular_eurostat_nuts",
    "Neighborhood": "singular_neighborhood",
    "Place": "singular_place",
    "State": "singular_state",
    "Town": "singular_town",
    "Village": "singular_village",
    "CensusZipCodeTabulationArea": "singular_zip_code",
}

# Place type to the message id that holds its translation (plural)
PLACE_TYPE_TO_LOCALE_MESSAGE_PLURAL = {
    "AdministrativeArea": "plural_administrative_area",
    "AdministrativeArea<Level>": "plural_administrative_area_level",
    "Borough": "plural_borough",
    "City": "plural_city",
    "Country": "plural_country",
    "County": "plural_county",
    "EurostatNUTS<Level>": "plural_eurostat_nuts",
    "Neighborhood": "plural_neighborhood",
    "Place": "plural_place",
    "State": "plural_state",
    "Town": "plural_town",
    "Village": "plural_village",
    "CensusZipCodeTabulationArea": "plural_zip_code",
}

# Strings to use in place page
PLACE_TYPE_IN_PARENT_PLACES_STR = '%(placeType)s in %(parentPlaces)s'
OTHER_PLACES_IN_PARENT_PLACE_STR = 'Other %(placeType)s in %(parentPlace)s'

# Variables to include in the place overview table
PLACE_OVERVIEW_TABLE_VARIABLES: List[Dict[str, str]] = [
    {
        "variable_dcid": "Count_Person",
        "i18n_message_id": "VARIABLE_NAME-Count_Person"
    },
    {
        "variable_dcid": "Median_Income_Person",
        "i18n_message_id": "VARIABLE_NAME-Median_Income_Person"
    },
    {
        "variable_dcid": "Median_Age_Person",
        "i18n_message_id": "VARIABLE_NAME-Median_Age_Person"
    },
    {
        "variable_dcid": "UnemploymentRate_Person",
        "i18n_message_id": "VARIABLE_NAME-UnemploymentRate_Person",
        "unit": "Percent"
    },
]

