# Copyright 2023 Google LLC
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
"""Various constants for NL detection."""

from typing import Dict, FrozenSet, List, Set, Union

from server.lib.nl.detection import ContainedInPlaceType
from server.lib.nl.detection import EventType

STOP_WORDS: Set[str] = {
    'ourselves',
    'hers',
    'between',
    'yourself',
    'but',
    'again',
    'there',
    'about',
    'once',
    'during',
    'out',
    'very',
    'having',
    'with',
    'they',
    'own',
    'an',
    'be',
    'some',
    'for',
    'do',
    'its',
    'yours',
    'such',
    'into',
    'of',
    'most',
    'itself',
    'other',
    'off',
    'is',
    's',
    'am',
    'or',
    'who',
    'as',
    'from',
    'him',
    'each',
    'the',
    'themselves',
    'until',
    'below',
    'are',
    'we',
    'these',
    'your',
    'his',
    'through',
    'don',
    'nor',
    'me',
    'were',
    'her',
    'more',
    'himself',
    'this',
    'down',
    'should',
    'our',
    'their',
    'while',
    'above',
    'both',
    'up',
    'to',
    'ours',
    'had',
    'she',
    'all',
    'no',
    'when',
    'at',
    'any',
    'before',
    'them',
    'same',
    'and',
    'been',
    'have',
    'in',
    'will',
    'on',
    'does',
    'yourselves',
    'then',
    'that',
    'because',
    'what',
    'over',
    'why',
    'so',
    'can',
    'did',
    'not',
    'now',
    'under',
    'he',
    'you',
    'herself',
    'has',
    'just',
    'where',
    'too',
    'only',
    'myself',
    'which',
    'those',
    'i',
    'after',
    'few',
    'whom',
    't',
    'being',
    'if',
    'theirs',
    'my',
    'against',
    'a',
    'by',
    'doing',
    'it',
    'how',
    'further',
    'was',
    'here',
    'than',
    'tell',
    'say',
    'something',
    'thing',
    'among',
    'across',
}

# TODO: remove this special casing when a better NER model is identified which
# can always detect these.
OVERRIDE_FOR_NER: FrozenSet[str] = frozenset([
    'palo alto',
    'mountain view',
    'world',
    'earth',
    'africa',
    'antarctica',
    'asia',
    'europe',
    'north america',
    'south america',
    'oceania',
    # San Francisco Bay Area(s)
    'san francisco bay area',
    'sf bay area',
    'san francisco peninsula',
    'san francisco north bay',
    'san francisco south bay',
    'san francisco east bay',
    'sf peninsula',
    'sf north bay',
    'sf south bay',
    'sf east bay',
])

SPECIAL_PLACE_REPLACEMENTS: Dict[str, str] = {'us': 'United States'}

SPECIAL_DCIDS_TO_PLACES: Dict[str, List[str]] = {
    'Earth': ['earth', 'world'],
    # Continents
    'africa': ['africa'],
    'antarctica': ['antarctica'],
    'asia': ['asia'],
    'europe': ['europe'],
    'northamerica': ['north america', 'northamerica'],
    'southamerica': [
        'south america', 'southamerica', 'latin america', 'latinamerica'
    ],
    'oceania': ['oceania', 'australasia'],
    # special places
    'wikidataId/Q213205': ['san francisco bay area', 'sf bay area', 'bay area'],
    'wikidataId/Q1827082': ['san francisco peninsula', 'sf peninsula'],
    'wikidataId/Q3271856': ['san francisco south bay', 'sf south bay'],
    'wikidataId/Q3271661': ['san francisco north bay', 'sf north bay'],
    'wikidataId/Q2617944': ['san francisco east bay', 'sf east bay'],
}

# Invert the above str: List[str] Dictionary to str: str.
OVERRIDE_PLACE_TO_DICD_FOR_MAPS_API: Dict[str, str] = {}
for dcid, place_list in SPECIAL_DCIDS_TO_PLACES.items():
  for place in place_list:
    OVERRIDE_PLACE_TO_DICD_FOR_MAPS_API[place] = dcid

MAPS_API = "https://maps.googleapis.com/maps/api/place/textsearch/json?"

# Source: https://developers.google.com/maps/documentation/places/web-service/supported_types#table2
MAPS_GEO_TYPES = frozenset([
    'political',
    'country',
    'city',
    'county',
    'continent',
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
    'administrative_area_level_6',
    'administrative_area_level_7',
    'postal_code',
    'locality',
])

# Note: These heuristics should be revisited if we change
# query preprocessing (e.g. stopwords, stemming)
QUERY_CLASSIFICATION_HEURISTICS: Dict[str, Union[List[str], Dict[
    str, List[str]]]] = {
        "Ranking": {
            "High": [
                "most",
                "(?<!bottom to )top",
                "best",  # leaving here for backwards-compatibility
                "(?<!lowest to )highest",
                "high",
                "largest",
                "biggest",
                "greatest",
                "strongest",
                "richest",
                "sickest",
                "illest",
                "oldest",
                "major",  # as in 'major storms'
                "descending",
                "top to bottom",
                "highest to lowest",
            ],
            "Low": [
                "least",
                "(?<!top to )bottom",
                "worst",  # leaving here for backwards-compatibility
                "(?<!highest to )lowest",
                "low",
                "smallest",
                "weakest",
                "youngest",
                "poorest",
                "healthiest",
                "ascending",
                "bottom to top",
                "lowest to highest",
            ],
            "Best": ["best",],
            "Worst": ["worst",],
            "Extreme": ["extremes?", "impact"]
        },
        "Comparison": [
            "compare(s|d)?",
            "comparison",
            "(is|has|have)( a| the)? \w+er",
            # WARNING: These will conflate with Correlation
            "vs",
            "versus",
        ],
        "Correlation": [
            "correlate",
            "correlated",
            "correlation",
            "relationship to",
            "relationship with",
            "relationship between",
            "related to",
            "related with",
            "related between",
            # WARNING: These will conflate with Comparison
            "vs",
            "versus",
        ],
        "Event": {
            "Fire": ["(wild)?fires?",],
            "Drought": ["droughts?",],
            "Flood": ["floods?",],
            "Cyclone": [
                "tropical storms?",
                "cyclones?",
                "hurricanes?",
                "typhoons?",
            ],
            "ExtremeHeat": [
                "(extreme )?heat",
                "extreme(ly)? hot",
            ],
            "ExtremeCold": ["(extreme(ly)? )?cold",],
            "WetBulb": ["wet(\W?)bulb",],
            "Earthquake": ["earthquakes?",]
        },
        "TimeDelta": {
            "Increase": [
                "grow(n|th)?",
                "grew",
                "gain",
                "increased?",
                "increasing",
                "surge(d)?",
                "surging",
                "rise(d|n)?",
                "rising",
            ],
            "Decrease": [
                "decreased?",
                "decreasing",
                "shr(ank|ink|unk)(ing)?",
                "reduced?",
                "reduc(ing|tion)",
                "decline(d)?",
                "declining",
                "plummet(ed|ing)?",
                "fall(en)?",
                "drop(ped|s)?",
                "loss",
            ],
        },
        "SizeType": {
            "Big": ["big",],
            "Small": ["small",],
        },
        "Overview": ["tell me (more )?about",],
    }

PLACE_TYPE_TO_PLURALS: Dict[str, str] = {
    "place": "places",
    "continent": "continents",
    "country": "countries",
    "state": "states",
    "province": "provinces",
    "county": "counties",
    "city": "cities",
    "censuszipcodetabulationarea": "census zip code tabulation areas",
    "town": "towns",
    "village": "villages",
    "censusdivision": "census divisions",
    "borough": "boroughs",
    "eurostatnuts1": "eurostat NUTS 1 places",
    "eurostatnuts2": "eurostat NUTS 2 places",
    "eurostatnuts3": "eurostat NUTS 3 places",
    "administrativearea1": "administrative area 1 places",
    "administrativearea2": "administrative area 2 places",
    "administrativearea3": "administrative area 3 places",
    "administrativearea4": "administrative area 4 places",
    "administrativearea5": "administrative area 5 places",
    # Schools
    "highschool": "high schools",
    "middleschool": "middle schools",
    "elementaryschool": "elementary schools",
    "primaryschool": "primary schools",
    "publicschool": "public schools",
    "privateschool": "private schools",
    "school": "schools",
}

# TODO: Unify the different event maps by using a struct value.

# Override the names from configs.  These have plurals, etc.
EVENT_TYPE_TO_DISPLAY_NAME = {
    EventType.COLD: "Extreme Cold Events",
    EventType.CYCLONE: "Storms",
    EventType.DROUGHT: "Droughts",
    EventType.EARTHQUAKE: "Earthquakes",
    EventType.FIRE: "Fires",
    EventType.FLOOD: "Floods",
    EventType.HEAT: "Exteme Heat Events",
    EventType.WETBULB: "High Wet-bulb Temperature Events",
}

# NOTE: This relies on disaster config's event_type_spec IDs.
# TODO: Consider switching these strings to proto enums and use those directly.
EVENT_TYPE_TO_CONFIG_KEY = {
    EventType.COLD: "cold",
    EventType.CYCLONE: "storm",
    EventType.DROUGHT: "drought",
    EventType.EARTHQUAKE: "earthquake",
    EventType.FIRE: "fire",
    EventType.FLOOD: "flood",
    EventType.HEAT: "heat",
    EventType.WETBULB: "wetbulb",
}

EVENT_CONFIG_KEY_TO_EVENT_TYPE = {
    v: k for k, v in EVENT_TYPE_TO_CONFIG_KEY.items()
}

EVENT_TYPE_TO_DC_TYPES = {
    EventType.COLD: ["ColdTemperatureEvent"],
    EventType.CYCLONE: ["CycloneEvent"],
    EventType.DROUGHT: ["DroughtEvent"],
    EventType.EARTHQUAKE: ["EarthquakeEvent"],
    EventType.FIRE: ["WildlandFireEvent", "WildfireEvent", "FireEvent"],
    EventType.FLOOD: ["FloodEvent"],
    EventType.HEAT: ["HeatTemperatureEvent"],
    EventType.WETBULB: ["WetBulbTemperatureEvent"],
}

CHILD_PLACES_TYPES = {
    "Country": "State",
    "State": "County",
    "County": "City",
}

MAP_PLACE_TYPES = frozenset([
    ContainedInPlaceType.COUNTY, ContainedInPlaceType.STATE,
    ContainedInPlaceType.COUNTRY
])

# Key is SV DCID and value is (denominator SV DCID, name snippet for title).
ADDITIONAL_DENOMINATOR_VARS = {
    "MapFacts/Count_park": ("SurfaceArea", "per Square Mile"),
}