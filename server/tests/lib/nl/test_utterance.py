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

from lib.nl.detection import ClassificationType
from lib.nl.detection import RankingType
from lib.nl.utterance import ChartOriginType
from lib.nl.utterance import ChartType

# Utterance for Place Overview.
PLACE_ONLY_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'query': 'foo sv in place',
    'query_type': ClassificationType.SIMPLE,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': False,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.PLACE_OVERVIEW,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': []
    }],
    'svs': [],
}

# Utterance for a couple of simple SVs for a place.
SIMPLE_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'query': 'foo sv in place',
    'query_type': ClassificationType.SIMPLE,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': True,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.TIMELINE_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Person_Male']
    }, {
        'attr': {
            'block_id': 2,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': True,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.TIMELINE_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Person_Female']
    }],
    'svs': ['Count_Person_Male', 'Count_Person_Female']
}

# Utterance for a simple SV with peer SV extensions.
SIMPLE_WITH_SV_EXT_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'query': 'foo sv in place',
    'query_type': ClassificationType.SIMPLE,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': True,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.TIMELINE_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Person_Male']
    }, {
        'attr': {
            'block_id': 2,
            'class': ChartOriginType.SECONDARY_CHART,
            'include_percapita': True,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.TIMELINE_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Person_Male', 'Count_Person_Female']
    }],
    'svs': ['Count_Person_Male']
}

# Utterance for a simple topic expansion.
SIMPLE_WITH_TOPIC_UTTR = {
    'classifications': [],
    'places': [{
        'dcid': 'geoId/06',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'query': 'foo sv in place',
    'query_type': ClassificationType.SIMPLE,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': False,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.TIMELINE_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Farm']
    }, {
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': False,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.TIMELINE_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Area_Farm']
    }, {
        'attr': {
            'block_id': 2,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': False,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.TIMELINE_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['FarmInventory_Rice', 'FarmInventory_Barley']
    }],
    'svs': ['dc/topic/Agriculture']
}

# Utterance for comparison across places.
# Depends on SIMPLE_UTTR.
COMPARISON_UTTR = {
    'classifications': [{
        'type': ClassificationType.COMPARISON
    }],
    'places': [{
        'dcid': 'geoId/32',
        'name': 'Foo Place',
        'place_type': 'State'
    }],
    'query': 'foo sv in place',
    'query_type': ClassificationType.COMPARISON,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': True,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.BAR_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }, {
            'dcid': 'geoId/32',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Person_Male']
    }, {
        'attr': {
            'block_id': 2,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': True,
            'place_type': None,
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.BAR_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }, {
            'dcid': 'geoId/32',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Person_Female']
    }],
    'svs': []
}

# Utterance for county contained-in place.
# Depends on SIMPLE_UTTR (for parent place)
CONTAINED_IN_UTTR = {
    'classifications': [{
        'contained_in_place_type': 'County',
        'type': ClassificationType.CONTAINED_IN
    }],
    'places': [],
    'query': 'foo sv in place',
    'query_type': ClassificationType.CONTAINED_IN,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': True,
            'place_type': 'County',
            'ranking_types': [],
            'title': ''
        },
        'chart_type': 1,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Farm']
    }],
    'svs': ['Count_Farm']
}

# Utterance for correlation wrt previous SV.
# Depends on CONTAINED_IN_UTTR (for previous SV, parent place, child place type)
CORRELATION_UTTR = {
    'classifications': [{
        'type': ClassificationType.CORRELATION
    }],
    'places': [],
    'query': 'foo sv in place',
    'query_type': ClassificationType.CORRELATION,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': False,
            'place_type': 'County',
            'ranking_types': [],
            'title': ''
        },
        'chart_type': ChartType.SCATTER_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Farm', 'Mean_Precipitation']
    }],
    'svs': ['Mean_Precipitation']
}

# Utterance for highest for an SV.
# Depends on CORRELATION_UTTR (for parent place, child place type)
RANKING_UTTR = {
    'classifications': [{
        'ranking_type': [RankingType.HIGH],
        'type': ClassificationType.RANKING
    }],
    'places': [],
    'query': 'foo sv in place',
    'query_type': ClassificationType.RANKING,
    'ranked_charts': [{
        'attr': {
            'block_id': 1,
            'class': ChartOriginType.PRIMARY_CHART,
            'include_percapita': True,
            'place_type': 'County',
            'ranking_types': [1],
            'title': ''
        },
        'chart_type': ChartType.RANKING_CHART,
        'places': [{
            'dcid': 'geoId/06',
            'name': 'Foo Place',
            'place_type': 'State'
        }],
        'svs': ['Count_Agricultural_Workers']
    }],
    'svs': ['Count_Agricultural_Workers']
}