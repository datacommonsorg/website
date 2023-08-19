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
"""Utterance JSONs for tests."""

from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import TimeDeltaType

# Utterance for Place Overview.
SIMPLE_PLACE_ONLY_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State',
        'country': 'country/USA',
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': []
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.OVERVIEW,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': [],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.PLACE_OVERVIEW,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': []
    }],
    'svs': [],
    'session_id': '007_999999999',
}

# Utterance for Place Overview.
OVERVIEW_PLACE_ONLY_UTTR = {
    'classifications': [{
        'type': ClassificationType.OVERVIEW
    }],
    'places': [{
        'dcid': 'geoId/01',
        'name': 'Foo Place',
        'place_type': 'State',
        'country': 'country/USA',
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/01'],
        'sessionId': '007_999999999',
        'variables': ['Count_Person_Male', 'Count_Person_Female']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.OVERVIEW,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': [],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.PLACE_OVERVIEW,
        'places': [{
            'dcid': 'geoId/01',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': []
    }],
    'svs': ['Count_Person_Male', 'Count_Person_Female'],
    'session_id': '007_999999999',
}

# Utterance for a couple of simple SVs for a place.
SIMPLE_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State',
        'country': 'country/USA',
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['Count_Person_Male', 'Count_Person_Female']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.BASIC,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Male'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.TIMELINE_WITH_HIGHLIGHT,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Male']
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Female'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.TIMELINE_WITH_HIGHLIGHT,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Female']
    }],
    'svs': ['Count_Person_Male', 'Count_Person_Female'],
    'session_id': '007_999999999',
}

# Utterance for a simple SV with peer SV extensions.
SIMPLE_WITH_SV_EXT_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State',
        'country': 'country/USA',
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['Count_Person_Male']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.BASIC,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Male'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.TIMELINE_WITH_HIGHLIGHT,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Male']
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': 'Count_Person_Male',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Male', 'Count_Person_Female'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.TIMELINE_WITH_HIGHLIGHT,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Male', 'Count_Person_Female']
    }],
    'svs': ['Count_Person_Male'],
    'session_id': '007_999999999',
}

# Utterance for a simple topic expansion.
SIMPLE_WITH_TOPIC_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State',
        'country': 'country/USA',
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['dc/topic/Agriculture']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.BASIC,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': 'dc/topic/Agriculture',
            'svpg_id': '',
            'svs': ['Count_Farm'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.TIMELINE_WITH_HIGHLIGHT,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Farm']
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': 'dc/topic/Agriculture',
            'svpg_id': '',
            'svs': ['Area_Farm'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'chart_type': ChartType.TIMELINE_WITH_HIGHLIGHT,
        'place_type': None,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Area_Farm']
    }, {
        'chart_vars': {
            'description': 'svpg desc',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': True,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['FarmInventory_Rice', 'FarmInventory_Barley'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.TIMELINE_WITH_HIGHLIGHT,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['FarmInventory_Rice', 'FarmInventory_Barley']
    }],
    'svs': ['dc/topic/Agriculture'],
    'session_id': '007_999999999',
}

# Utterance for comparison across places.
# Depends on SIMPLE_UTTR.
COMPARISON_UTTR = {
    'classifications': [{
        'type': ClassificationType.COMPARISON
    }],
    'places': [{
        'country': 'country/USA',
        'dcid': 'geoId/32',
        'name': 'Foo Place',
        'place_type': 'State'
    }, {
        'country': 'country/USA',
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': ['geoId/06'],
        'comparisonVariables': [],
        'entities': ['geoId/32'],
        'sessionId': '007_999999999',
        'variables': ['Count_Person_Male', 'Count_Person_Female']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.COMPARISON_ACROSS_PLACES,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Male'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.BAR_CHART,
        'places': [{
            'dcid': 'geoId/32',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }, {
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Male']
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Female'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.BAR_CHART,
        'places': [{
            'dcid': 'geoId/32',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }, {
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Female']
    }],
    'session_id': '007_999999999',
    'svs': ['Count_Person_Male', 'Count_Person_Female']
}

# Utterance for county contained-in place.
# Depends on SIMPLE_UTTR (for parent place)
CONTAINED_IN_UTTR = {
    'classifications': [{
        'contained_in_place_type': 'County',
        'type': ClassificationType.CONTAINED_IN
    }],
    'places': [{
        'country': 'country/USA',
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': 'County',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['Count_Farm', 'Income_Farm']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.BASIC,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Farm'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': 'County',
        'chart_type': 1,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Farm']
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Income_Farm'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': 'County',
        'chart_type': 1,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Income_Farm']
    }],
    'svs': ['Count_Farm', 'Income_Farm'],
    'session_id': '007_999999999',
}

# Utterance for correlation wrt previous SV.
# Depends on CONTAINED_IN_UTTR (for previous SV, parent place, child place type)
CORRELATION_UTTR = {
    'classifications': [{
        'type': ClassificationType.CORRELATION
    }, {
        'contained_in_place_type': 'DefaultType',
        'type': ClassificationType.CONTAINED_IN
    }],
    'places': [{
        'country': 'country/USA',
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': ['Count_Person_Male', 'Count_Person_Female'],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['Mean_Precipitation']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.CORRELATION_ACROSS_VARS,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Farm', 'Mean_Precipitation'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': 'County',
        'chart_type': ChartType.SCATTER_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Farm', 'Mean_Precipitation']
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Income_Farm', 'Mean_Precipitation'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': 'County',
        'chart_type': ChartType.SCATTER_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Income_Farm', 'Mean_Precipitation']
    }],
    'svs': ['Mean_Precipitation'],
    'session_id': '007_999999999',
}

# Utterance for multi-sv correlation.
MULTISV_CORRELATION_UTTR = {
    'classifications': [{
        'type': ClassificationType.CORRELATION
    }, {
        'contained_in_place_type': 'DefaultType',
        'type': ClassificationType.CONTAINED_IN
    }],
    'places': [{
        'country': 'country/USA',
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': ['Count_Poverty'],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['Prevalence_Obesity']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.CORRELATION_ACROSS_VARS,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Prevalence_Obesity', 'Count_Poverty'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': 'County',
        'chart_type': ChartType.SCATTER_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Prevalence_Obesity', 'Count_Poverty']
    }],
    'svs': ['Mean_Precipitation'],
    'session_id': '007_999999999',
}

# Utterance for highest for an SV among places.
# Depends on CORRELATION_UTTR (for parent place, child place type)
RANKING_ACROSS_PLACES_UTTR = {
    'classifications': [{
        'ranking_type': [RankingType.HIGH],
        'type': ClassificationType.RANKING
    }, {
        'contained_in_place_type': 'County',
        'type': ClassificationType.CONTAINED_IN,
    }],
    'places': [{
        'country': 'country/USA',
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': 'County',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['Count_Agricultural_Workers']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.BASIC,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Agricultural_Workers'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [RankingType.HIGH],
        'place_type': 'County',
        'chart_type': ChartType.RANKING_WITH_MAP,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Agricultural_Workers']
    }],
    'svs': ['Count_Agricultural_Workers'],
    'session_id': '007_999999999',
}

# Utterance for ranking among SVs.
RANKING_ACROSS_SVS_UTTR = {
    'classifications': [{
        'ranking_type': [RankingType.HIGH],
        'type': ClassificationType.RANKING
    }],
    'places': [{
        'country': 'country/USA',
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['dc/topic/Agriculture']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.BASIC,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': True,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': 'dc/topic/Agriculture',
            'svpg_id': '',
            'svs': [
                'FarmInventory_Barley', 'FarmInventory_Rice',
                'FarmInventory_Wheat'
            ],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [RankingType.HIGH],
        'place_type':
            None,
        'chart_type':
            ChartType.BAR_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA'
        }],
        'event':
            None,
        'svs': [
            'FarmInventory_Barley', 'FarmInventory_Rice', 'FarmInventory_Wheat'
        ]
    }],
    'svs': ['dc/topic/Agriculture'],
    'session_id': '007_999999999',
}

# Utterance for time-delta query
TIME_DELTA_ACROSS_VARS_UTTR = {
    'classifications': [{
        'time_delta_type': [TimeDeltaType.INCREASE],
        'type': ClassificationType.TIME_DELTA
    }],
    'places': [{
        'country': 'country/USA',
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['dc/topic/AgricultureProduction']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.TIME_DELTA_ACROSS_VARS,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': 0,
            'growth_ranking_type': 'abs',
            'has_single_point': False,
            'is_topic_peer_group': True,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': 'dc/topic/Agriculture',
            'svpg_id': '',
            'svs': [
                'FarmInventory_Rice', 'FarmInventory_Barley',
                'FarmInventory_Wheat'
            ],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type':
            None,
        'chart_type':
            ChartType.RANKED_TIMELINE_COLLECTION,
        'event':
            None,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'svs': [
            'FarmInventory_Rice', 'FarmInventory_Barley', 'FarmInventory_Wheat'
        ],
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': 0,
            'growth_ranking_type': 'pct',
            'has_single_point': False,
            'is_topic_peer_group': True,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': 'dc/topic/Agriculture',
            'svpg_id': '',
            'svs': [
                'FarmInventory_Barley', 'FarmInventory_Rice',
                'FarmInventory_Wheat'
            ],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type':
            None,
        'chart_type':
            ChartType.RANKED_TIMELINE_COLLECTION,
        'event':
            None,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'svs': [
            'FarmInventory_Barley', 'FarmInventory_Rice', 'FarmInventory_Wheat'
        ],
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': 0,
            'growth_ranking_type': 'pc',
            'has_single_point': False,
            'is_topic_peer_group': True,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': 'dc/topic/Agriculture',
            'svpg_id': '',
            'svs': ['FarmInventory_Barley', 'FarmInventory_Wheat'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.RANKED_TIMELINE_COLLECTION,
        'event': None,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'svs': ['FarmInventory_Barley', 'FarmInventory_Wheat']
    }],
    'svs': ['dc/topic/AgricultureProduction'],
    'session_id': '007_999999999',
}

# Sample as SIMPLE_UTTR, but TIMELINE_CHARTs turned into BAR_CHARTs.
SIMPLE_BAR_DOWNGRADE_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State',
        'country': 'country/USA',
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': ['Count_Person_Male', 'Count_Person_Female']
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.BASIC,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': True,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Male'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.BAR_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Male']
    }, {
        'chart_vars': {
            'description': '',
            'event': None,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': True,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': ['Count_Person_Female'],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [],
        'place_type': None,
        'chart_type': ChartType.BAR_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': None,
        'svs': ['Count_Person_Female']
    }],
    'svs': ['Count_Person_Male', 'Count_Person_Female'],
    'session_id': '007_999999999',
}

EVENT_UTTR = {
    'classifications': [{
        'event_type': [EventType.FIRE],
        'type': ClassificationType.EVENT
    }, {
        'ranking_type': [RankingType.HIGH],
        'type': ClassificationType.RANKING
    }],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State',
        'country': 'country/USA',
    }],
    'llm_resp': {},
    'insightCtx': {
        'childEntityType': '',
        'comparisonEntities': [],
        'comparisonVariables': [],
        'entities': ['geoId/06'],
        'sessionId': '007_999999999',
        'variables': []
    },
    'placeFallback': {},
    'query': 'foo sv in place',
    'query_type': QueryType.EVENT,
    'ranked_charts': [{
        'chart_vars': {
            'description': '',
            'event': 4,
            'growth_direction': None,
            'growth_ranking_type': None,
            'has_single_point': False,
            'is_topic_peer_group': False,
            'orig_sv': '',
            'skip_map_for_ranking': False,
            'source_topic': '',
            'svpg_id': '',
            'svs': [],
            'title': '',
            'title_suffix': ''
        },
        'ranking_types': [RankingType.HIGH],
        'place_type': None,
        'chart_type': ChartType.EVENT_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State',
            'country': 'country/USA',
        }],
        'event': EventType.FIRE,
        'svs': []
    }],
    'svs': [],
    'session_id': '007_999999999',
}
