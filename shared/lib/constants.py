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
    'both',
    'up',
    'to',
    'ours',
    'had',
    'she',
    'all',
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

# Exception list where stop words should be excluded
STOP_WORDS_EXCLUSIONS = ['how many', 'number of']

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
            "Change": ["change(s|d|) (over|with) time"]
        },
        "Superlative": {
            "Big": ["big", "bigger", "biggest"],
            "Small": ["small", "bigger", "smallest"],
            "Rich": ["rich", "richer", "richest"],
            "Poor": ["poor", "poorer", "poorest"],
            "List": ["list( of|)"]
        },
        "Overview": ["tell me (more )?about",],
        # Hint for potential reference to answer-places, to be used
        # together with ContainedInPlace.
        "AnswerPlacesReference": ["these", "those"],
        "PerCapita": [
            "fraction", "percent", "percentage", "per capita", "percapita",
            "per person", "rate", "rates"
        ],
        "Temporal": [
            # Day of week
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            # Month of year
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
            # Season
            "spring",
            "summer",
            "winter",
            "autumn",
            # Others
            "today",
            "yesterday",
            "tomorrow",
        ]
    }

# We do not want to strip words from events / superlatives / temporal
# since we want those to match SVs too!
HEURISTIC_TYPES_IN_VARIABLES = frozenset(
    ["Event", "Superlative", "Temporal", "PerCapita"])

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
    "tract": "tracts",
    "censuszipcodetabulationarea": "census zip code tabulation areas",
    "zip": "zips",
    "zipcode": "zip codes",
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

#
# Non-geo place types are listed here.  These typically are part
# of the SV name as well.  The list here are the keys of
# PLACE_TYPE_TO_PLURALS and they are not considered for stop-word
# removal (i.e., they are fed to the SV query index).
#
NON_GEO_PLACE_TYPES: FrozenSet[str] = frozenset([
    # Schools are part of many SVs.
    "highschool",
    "middleschool",
    "elementaryschool",
    "primaryschool",
    "publicschool",
    "privateschool",
    "school",
])

# The default Cosine score threshold beyond which Stat Vars
# are considered as a match.
SV_SCORE_DEFAULT_THRESHOLD = 0.5

#
# The Cosine high-confidence score threshold override.
# NOTE: Used only when the model-threshold is lower than this.
SV_SCORE_HIGH_CONFIDENCE_THRESHOLD = 0.7

# The Cosine score threshold for mode=toolformer.
# NOTE: Used only when the model-threshold is lower than this.
SV_SCORE_TOOLFORMER_THRESHOLD = 0.8

# A cosine score differential we use to indicate if scores
# that differ by up to this amount are "near" SVs.
# In Multi-SV detection, if the difference between successive scores exceeds
# this threshold, then SVs at the lower score and below are ignored.
# TODO: Maybe keep an eye on this for new model.
MULTI_SV_SCORE_DIFFERENTIAL = 0.05

# English language code.
EN_LANG_CODE = 'en'

# date query param value for requesting latest observations from REST v2 API
# Observations for a particular variable and place may have different dates
# (will return the most recently available data for particular place/variable
# combination)
DATE_LATEST = 'LATEST'

# date query param value for requesting observations with the 'best coverage'
# overall from /api/observations/point/* endpoints
# Observations for a particular variable and place will always have the same
# date
DATE_HIGHEST_COVERAGE = 'HIGHEST_COVERAGE'

# The name of the embeddings CSV file.
EMBEDDINGS_FILE_NAME = 'embeddings.csv'
