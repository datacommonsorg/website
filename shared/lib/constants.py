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
"""Various constants shared across servers."""

from typing import Dict, FrozenSet, List, Set, Union

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
    # US
    'united states',  # need this because the word "states" gets replaced.
    'usa',
])

# Replace the detected place text with this alternate (shorter) place text.
# The replacement text (value) should be contained within the detected text (key).
# This is to ensure that the original query string does not need to be modified.
# For example, if the query string contains "us states" and that is detected as a plce
# string, we replce it with "us" only. This means that when detected place words/strings
# are removed from the original query, "us" will be replaced and "states" will still
# remain in the query. If the replacement string (value) is not contained within the
# detected place (key), then the detected place and query may have nothing in common
# which can lead to adverse downstream impact.
SHORTEN_PLACE_DETECTION_STRING: Dict[str, str] = {
    'us states': 'us',
    'states us': 'us',
    'usa states': 'usa',
    'states usa': 'usa',
}

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
                "grow(n|th|s)?",
                "grew",
                "gain(s)?",
                "increase(d|s)?",
                "increasing",
                "surge(d|s)?",
                "surging",
                "rise(d|n|s)?",
                "rising",
            ],
            "Decrease": [
                "decrease(d|s)?",
                "decreasing",
                "shr(ank|ink|unk)(ing)?",
                "reduce(d|s)?",
                "reduc(ing|tion)",
                "decline(d|s)?",
                "declining",
                "plummet(ed|ing|s)?",
                "fall(en|s)?",
                "drop(ped|s)?",
                "loss(es)?",
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
    "district": "districts",
    "division": "divisions",
    "department": "departments",
    "municipality": "municipalities",
    "parish": "parishes",
    "city": "cities",
    "censustract": "census tracts",
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
    "region": "regions",
    # Schools
    "highschool": "high schools",
    "middleschool": "middle schools",
    "elementaryschool": "elementary schools",
    "primaryschool": "primary schools",
    "publicschool": "public schools",
    "privateschool": "private schools",
    "school": "schools",
}

# A cosine score differential we use to indicate if scores
# that differ by up to this amount are "near" SVs.
# In Multi-SV detection, if the difference between successive scores exceeds
# this threshold, then SVs at the lower score and below are ignored.
MULTI_SV_SCORE_DIFFERENTIAL = 0.05
