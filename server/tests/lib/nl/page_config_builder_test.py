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
"""Integration tests for NL Next chart generation."""

import random
from typing import Dict
import unittest
from unittest.mock import patch

from google.protobuf import text_format
from parameterized import parameterized

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib import util as libutil
from server.lib.nl.common import counters as ctr
from server.lib.nl.common import topic
from server.lib.nl.common import utils
from server.lib.nl.common import utterance
from server.lib.nl.common import variable
from server.lib.nl.config_builder import builder
from server.tests.lib.nl.test_utterance import COMPARISON_UTTR
from server.tests.lib.nl.test_utterance import CONTAINED_IN_UTTR
from server.tests.lib.nl.test_utterance import CORRELATION_UTTR
from server.tests.lib.nl.test_utterance import EVENT_UTTR
from server.tests.lib.nl.test_utterance import RANKING_ACROSS_PLACES_UTTR
from server.tests.lib.nl.test_utterance import RANKING_ACROSS_SVS_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_PLACE_ONLY_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_WITH_SV_EXT_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_WITH_TOPIC_UTTR

# TODO: Move these configs to test_data/*.textproto

PLACE_ONLY_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
   description: "Foo Place is a state in USA. Here is more information about Foo Place."
   blocks {
     title: "Foo Place"
     columns {
       tiles {
         type: PLACE_OVERVIEW
       }
     }
   }
 }
"""

SIMPLE_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
   description: "Here are some timelines about Count_Person_Male-name in Foo Place."
   blocks {
     columns {
       tiles {
         title: "Count_Person_Male-name in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Male"
       }
       tiles {
         title: "Per Capita Count_Person_Male-name in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Male_pc"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Count_Person_Female-name in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Female"
       }
       tiles {
         title: "Per Capita Count_Person_Female-name in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Female_pc"
       }
     }
   }
   stat_var_spec {
     key: "Count_Person_Female"
     value {
       stat_var: "Count_Person_Female"
       name: "Count_Person_Female-name"
       unit: "Count_Person_Female-unit"
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_pc"
     value {
       stat_var: "Count_Person_Female"
       denom: "Count_Person"
       name: "Count_Person_Female-name"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male"
     value {
       stat_var: "Count_Person_Male"
       name: "Count_Person_Male-name"
       unit: "Count_Person_Male-unit"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_pc"
     value {
       stat_var: "Count_Person_Male"
       denom: "Count_Person"
       name: "Count_Person_Male-name"
     }
   }
 }
"""

SIMPLE_WITH_SV_EXT_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
  description: "Here are some timelines about Count_Person_Male-name in Foo Place."
   blocks {
     columns {
       tiles {
         title: "Count_Person_Male-name in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Male"
       }
       tiles {
         title: "Per Capita Count_Person_Male-name in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Male_pc"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Count_Person_Male-name compared with other variables in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Male"
         stat_var_key: "Count_Person_Female"
       }
       tiles {
         title: "Per Capita Count_Person_Male-name compared with other variables in Foo Place"
         type: LINE
         stat_var_key: "Count_Person_Male_pc"
         stat_var_key: "Count_Person_Female_pc"
       }
     }
   }
   stat_var_spec {
     key: "Count_Person_Female"
     value {
       stat_var: "Count_Person_Female"
       name: "Count_Person_Female-name"
       unit: "Count_Person_Female-unit"
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_pc"
     value {
       stat_var: "Count_Person_Female"
       denom: "Count_Person"
       name: "Count_Person_Female-name"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male"
     value {
       stat_var: "Count_Person_Male"
       name: "Count_Person_Male-name"
       unit: "Count_Person_Male-unit"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_pc"
     value {
       stat_var: "Count_Person_Male"
       denom: "Count_Person"
       name: "Count_Person_Male-name"
     }
   }
 }
"""

SIMPLE_WITH_TOPIC_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
  description: "Here are some timelines about agriculture in Foo Place."
   blocks {
     columns {
       tiles {
         title: "Count_Farm-name in Foo Place"
         type: LINE
         stat_var_key: "Count_Farm"
       }
       tiles {
         title: "Area_Farm-name in Foo Place"
         type: LINE
         stat_var_key: "Area_Farm"
       }
     }
   }
   blocks {
    description: "svpg desc"
     columns {
       tiles {
         title: "Compared with Other Variables in Foo Place"
         type: LINE
         stat_var_key: "FarmInventory_Rice"
         stat_var_key: "FarmInventory_Barley"
       }
       tiles {
         title: "Per Capita Compared with Other Variables in Foo Place"
         type: LINE
         stat_var_key: "FarmInventory_Rice_pc"
         stat_var_key: "FarmInventory_Barley_pc"
       }
     }
   }
   stat_var_spec {
     key: "Area_Farm"
     value {
       stat_var: "Area_Farm"
       name: "Area_Farm-name"
       unit: "Area_Farm-unit"
     }
   }
   stat_var_spec {
     key: "Count_Farm"
     value {
       stat_var: "Count_Farm"
       name: "Count_Farm-name"
       unit: "Count_Farm-unit"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Barley"
     value {
       stat_var: "FarmInventory_Barley"
       name: "FarmInventory_Barley-name"
       unit: "FarmInventory_Barley-unit"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Barley_pc"
     value {
       stat_var: "FarmInventory_Barley"
       denom: "Count_Person"
       name: "FarmInventory_Barley-name"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Rice"
     value {
       stat_var: "FarmInventory_Rice"
       name: "FarmInventory_Rice-name"
       unit: "FarmInventory_Rice-unit"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Rice_pc"
     value {
       stat_var: "FarmInventory_Rice"
       denom: "Count_Person"
       name: "FarmInventory_Rice-name"
     }
   }
 }
"""

COMPARISON_CONFIG = """
 metadata {
   place_dcid: "geoId/32"
 }
 categories {
  description: "Here are some comparison charts about Count_Person_Male-name in Foo Place and Foo Place."
   blocks {
     columns {
       tiles {
         title: "Count_Person_Male-name (${date})"
         type: BAR
         stat_var_key: "Count_Person_Male_multiple_place_bar_block"
         comparison_places: "geoId/32"
         comparison_places: "geoId/06"
       }
       tiles {
         title: "Per Capita Count_Person_Male-name (${date})"
         type: BAR
         stat_var_key: "Count_Person_Male_multiple_place_bar_block_pc"
         comparison_places: "geoId/32"
         comparison_places: "geoId/06"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Count_Person_Female-name (${date})"
         type: BAR
         stat_var_key: "Count_Person_Female_multiple_place_bar_block"
         comparison_places: "geoId/32"
         comparison_places: "geoId/06"
       }
       tiles {
         title: "Per Capita Count_Person_Female-name (${date})"
         type: BAR
         stat_var_key: "Count_Person_Female_multiple_place_bar_block_pc"
         comparison_places: "geoId/32"
         comparison_places: "geoId/06"
       }
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_multiple_place_bar_block"
     value {
       stat_var: "Count_Person_Female"
       name: "Count_Person_Female-name"
       unit: "Count_Person_Female-unit"
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_multiple_place_bar_block_pc"
     value {
       stat_var: "Count_Person_Female"
       denom: "Count_Person"
       name: "Count_Person_Female-name"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_multiple_place_bar_block"
     value {
       stat_var: "Count_Person_Male"
       name: "Count_Person_Male-name"
       unit: "Count_Person_Male-unit"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_multiple_place_bar_block_pc"
     value {
       stat_var: "Count_Person_Male"
       denom: "Count_Person"
       name: "Count_Person_Male-name"
     }
   }
  }
"""

CONTAINED_IN_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
   contained_place_types {
     key: "State"
     value: "County"
   }
 }
 categories {
  description: "Here are some comparison maps about Count_Farm-name in Foo Place by county."
   blocks {
     columns {
       tiles {
         title: "Count_Farm-name in Counties of Foo Place (${date})"
         type: MAP
         stat_var_key: "Count_Farm"
       }
       tiles {
         title: "Per Capita Count_Farm-name in Counties of Foo Place (${date})"
         type: MAP
         stat_var_key: "Count_Farm_pc"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Income_Farm-name in Counties of Foo Place (${date})"
         type: MAP
         stat_var_key: "Income_Farm"
       }
       tiles {
         title: "Per Capita Income_Farm-name in Counties of Foo Place (${date})"
         type: MAP
         stat_var_key: "Income_Farm_pc"
       }
     }
   }
   stat_var_spec {
     key: "Count_Farm"
     value {
       stat_var: "Count_Farm"
       name: "Count_Farm-name"
       unit: "Count_Farm-unit"
     }
   }
   stat_var_spec {
     key: "Count_Farm_pc"
     value {
       stat_var: "Count_Farm"
       denom: "Count_Person"
       name: "Count_Farm-name"
     }
   }
   stat_var_spec {
     key: "Income_Farm"
     value {
       stat_var: "Income_Farm"
       name: "Income_Farm-name"
       unit: "Income_Farm-unit"
     }
   }
   stat_var_spec {
     key: "Income_Farm_pc"
     value {
       stat_var: "Income_Farm"
       denom: "Count_Person"
       name: "Income_Farm-name"
     }
   }
  }
"""

CORRELATION_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
   contained_place_types {
     key: "State"
     value: "County"
   }
 }
 categories {
  description: "Here are some scatter charts about Count_Farm-name and Mean_Precipitation-name in Foo Place."
   blocks {
     columns {
       tiles {
         title: "Count_Farm-name (${yDate}) vs. Mean_Precipitation-name (${xDate}) in Counties of Foo Place"
         type: SCATTER
         stat_var_key: "Count_Farm_scatter"
         stat_var_key: "Mean_Precipitation_scatter"
         scatter_tile_spec {
          highlight_top_right: True
         }
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Income_Farm-name (${yDate}) vs. Mean_Precipitation-name (${xDate}) in Counties of Foo Place"
         type: SCATTER
         stat_var_key: "Income_Farm_scatter"
         stat_var_key: "Mean_Precipitation_scatter"
         scatter_tile_spec {
          highlight_top_right: True
         }
       }
     }
   }
   stat_var_spec {
     key: "Count_Farm_scatter"
     value {
       stat_var: "Count_Farm"
       name: "Count_Farm-name"
       unit: "Count_Farm-unit"
     }
   }
   stat_var_spec {
     key: "Mean_Precipitation_scatter"
     value {
       stat_var: "Mean_Precipitation"
       name: "Mean_Precipitation-name"
       unit: "Mean_Precipitation-unit"
     }
   }
   stat_var_spec {
     key: "Income_Farm_scatter"
     value {
       stat_var: "Income_Farm"
       name: "Income_Farm-name"
       unit: "Income_Farm-unit"
     }
   }
}
"""

RANKING_ACROSS_PLACES_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
   contained_place_types {
     key: "State"
     value: "County"
   }
 }
 categories {
  description: "Here are some ranking tables about Count_Agricultural_Workers-name in Foo Place."
   blocks {
     title: "Count_Agricultural_Workers-name"
     columns {
       tiles {
         title: "Count_Agricultural_Workers-name in Counties of Foo Place (${date})"
         type: RANKING
         stat_var_key: "Count_Agricultural_Workers"
         ranking_tile_spec {
           show_highest: true
           ranking_count: 10
         }
       }
       tiles {
         title: "Count_Agricultural_Workers-name in Counties of Foo Place (${date})"
         type: MAP
         stat_var_key: "Count_Agricultural_Workers"
       }
      }
      footnote: "Count_Agricultural_Workers-footnote"
    }
    blocks {
      columns {
       tiles {
         title: "Per Capita Count_Agricultural_Workers-name in Counties of Foo Place (${date})"
         type: RANKING
         stat_var_key: "Count_Agricultural_Workers_pc"
         ranking_tile_spec {
           show_highest: true
           ranking_count: 10
         }
       }
       tiles {
         title: "Per Capita Count_Agricultural_Workers-name in Counties of Foo Place (${date})"
         type: MAP
         stat_var_key: "Count_Agricultural_Workers_pc"
       }
     }
   }
   stat_var_spec {
     key: "Count_Agricultural_Workers"
     value {
       stat_var: "Count_Agricultural_Workers"
       name: "Count_Agricultural_Workers-name"
       unit: "Count_Agricultural_Workers-unit"
     }
   }
   stat_var_spec {
     key: "Count_Agricultural_Workers_pc"
     value {
       stat_var: "Count_Agricultural_Workers"
       denom: "Count_Person"
       name: "Count_Agricultural_Workers-name"
     }
   }
 }
"""

RANKING_ACROSS_SVS_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
  description: "Here are some ranked bar charts about agriculture in Foo Place."
   blocks {
     columns {
       tiles {
         title: "Compared with Other Variables in Foo Place (${date})"
         type: BAR
         stat_var_key: "FarmInventory_Barley_multiple_place_bar_block"
         stat_var_key: "FarmInventory_Rice_multiple_place_bar_block"
         stat_var_key: "FarmInventory_Wheat_multiple_place_bar_block"
         comparison_places: "geoId/06"
       }
       tiles {
         title: "Per Capita Compared with Other Variables in Foo Place (${date})"
         type: BAR
         stat_var_key: "FarmInventory_Barley_multiple_place_bar_block_pc"
         stat_var_key: "FarmInventory_Rice_multiple_place_bar_block_pc"
         stat_var_key: "FarmInventory_Wheat_multiple_place_bar_block_pc"
         comparison_places: "geoId/06"
       }
     }
   }
   stat_var_spec {
     key: "FarmInventory_Barley_multiple_place_bar_block"
     value {
       stat_var: "FarmInventory_Barley"
       name: "FarmInventory_Barley-name"
       unit: "FarmInventory_Barley-unit"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Barley_multiple_place_bar_block_pc"
     value {
       stat_var: "FarmInventory_Barley"
       denom: "Count_Person"
       name: "FarmInventory_Barley-name"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Rice_multiple_place_bar_block"
     value {
       stat_var: "FarmInventory_Rice"
       name: "FarmInventory_Rice-name"
       unit: "FarmInventory_Rice-unit"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Rice_multiple_place_bar_block_pc"
     value {
       stat_var: "FarmInventory_Rice"
       denom: "Count_Person"
       name: "FarmInventory_Rice-name"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Wheat_multiple_place_bar_block"
     value {
       stat_var: "FarmInventory_Wheat"
       name: "FarmInventory_Wheat-name"
       unit: "FarmInventory_Wheat-unit"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Wheat_multiple_place_bar_block_pc"
     value {
       stat_var: "FarmInventory_Wheat"
       denom: "Count_Person"
       name: "FarmInventory_Wheat-name"
     }
   }
 }
"""

EVENT_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
   event_type_spec {
     key: "fire"
     value {
       id: "fire"
       name: "Fire"
       event_type_dcids: "WildlandFireEvent"
       event_type_dcids: "WildfireEvent"
       event_type_dcids: "FireEvent"
       color: "#f9c532"
       default_severity_filter {
         prop: "area"
         unit: "SquareKilometer"
         lower_limit: 25.0
         upper_limit: 1000.0
         display_name: "Area"
       }
       end_date_prop: "endDate"
       end_date_prop: "containmentDate"
       end_date_prop: "controlledDate"
     }
   }
   contained_place_types {
    key: "State"
    value: "County"
   }
 }
 categories {
   description: "Here is an overview of fires in Foo Place."
   blocks {
     columns {
       tiles {
         title: "Most severe fires in Foo Place"
         type: TOP_EVENT
         top_event_tile_spec {
           event_type_key: "fire"
           show_start_date: true
         }
       }
     }
     columns {
       tiles {
         title: "Fires in Foo Place"
         type: DISASTER_EVENT_MAP
         disaster_event_map_tile_spec {
           point_event_type_key: "fire"
         }
       }
     }
     type: DISASTER_EVENT
   }
 }
"""

# Includes just fire related stuff from Earth.textproto
DISASTER_TEST_CONFIG = """
metadata {
  event_type_spec {
    key: "fire"
    value {
      id: "fire"
      name: "Fire"
      event_type_dcids: "WildlandFireEvent"
      event_type_dcids: "WildfireEvent"
      event_type_dcids: "FireEvent"
      color: "#f9c532"
      default_severity_filter: {
        prop: "area"
        display_name: "Area"
        unit: "SquareKilometer"
        upper_limit: 1000
        lower_limit: 25
      }
     end_date_prop: "endDate"
     end_date_prop: "containmentDate"
     end_date_prop: "controlledDate"
    }
  }
}
categories {
  title: "Fires"
  description: "Here is an overview of fires in Foo Place."
  blocks {
    type: DISASTER_EVENT
    columns {
      tiles {
        type: DISASTER_EVENT_MAP
        disaster_event_map_tile_spec: {
          point_event_type_key: "fire"
        }
      }
    }
    columns {
      tiles {
        type: TOP_EVENT
        title: "Most severe fires"
        top_event_tile_spec {
          event_type_key: "fire"
          show_start_date: true
        }
      }
    }
  }
}
"""

SV_CHART_TITLES = libutil.get_nl_chart_titles()

NOPC_VARS = libutil.get_nl_no_percapita_vars()


# This has a set of similar tests to the ones in fulfillment_next_test.py.
class TestPageConfigNext(unittest.TestCase):

  @parameterized.expand([
      ["Place Only", SIMPLE_PLACE_ONLY_UTTR, PLACE_ONLY_CONFIG],
      ["Simple", SIMPLE_UTTR, SIMPLE_CONFIG],
      [
          "Simple with SV extensions", SIMPLE_WITH_SV_EXT_UTTR,
          SIMPLE_WITH_SV_EXT_CONFIG
      ],
      ["Simple with topic", SIMPLE_WITH_TOPIC_UTTR, SIMPLE_WITH_TOPIC_CONFIG],
      ["Comparison", COMPARISON_UTTR, COMPARISON_CONFIG],
      ["Contained-in", CONTAINED_IN_UTTR, CONTAINED_IN_CONFIG],
      ["Correlation", CORRELATION_UTTR, CORRELATION_CONFIG],
      [
          "RankingAcrossPlaces", RANKING_ACROSS_PLACES_UTTR,
          RANKING_ACROSS_PLACES_CONFIG
      ],
      ["RankingAcrossSVs", RANKING_ACROSS_SVS_UTTR, RANKING_ACROSS_SVS_CONFIG],
  ])
  @patch.object(variable, 'get_sv_unit')
  @patch.object(variable, 'get_sv_footnote')
  @patch.object(topic, 'get_topic_name')
  @patch.object(utils, 'parent_place_names')
  @patch.object(variable, 'get_sv_name')
  def test_main(self, test_name, uttr_dict, config_str, mock_sv_name,
                mock_parent_place_names, mock_topic_name, mock_sv_footnote,
                mock_sv_unit):
    random.seed(1)
    mock_sv_name.side_effect = (lambda svs, _: {
        sv: "{}-name".format(sv) for sv in svs
    })
    mock_parent_place_names.side_effect = (
        lambda dcid: ['USA'] if dcid == 'geoId/06' else ['p1', 'p2'])
    mock_topic_name.side_effect = (lambda dcid: dcid.split('/')[-1])
    mock_sv_footnote.side_effect = (lambda svs: {
        sv: "{}-footnote".format(sv) for sv in svs
    })
    mock_sv_unit.side_effect = (lambda svs: {
        sv: "{}-unit".format(sv) for sv in svs
    })

    got = _run(uttr_dict)
    self.maxDiff = None
    self.assertEqual(got, _textproto(config_str), test_name + ' failed!')

  @patch.object(variable, 'get_sv_unit')
  @patch.object(variable, 'get_sv_footnote')
  @patch.object(variable, 'get_sv_name')
  def test_event(self, mock_sv_name, mock_sv_footnote, mock_sv_unit):
    random.seed(1)
    mock_sv_name.side_effect = (lambda svs, _: {sv: sv for sv in svs})
    mock_sv_footnote.side_effect = (lambda svs: {sv: '' for sv in svs})
    mock_sv_unit.side_effect = (lambda svs: {sv: '' for sv in svs})

    disaster_config = SubjectPageConfig()
    text_format.Parse(DISASTER_TEST_CONFIG, disaster_config)
    got = _run(EVENT_UTTR, disaster_config)

    self.maxDiff = None
    self.assertEqual(got, _textproto(EVENT_CONFIG))


def _textproto(s):
  config = SubjectPageConfig()
  text_format.Parse(s, config)
  # Temporarily drop category descriptions
  config.categories[0].description = ''
  return text_format.MessageToString(config)


def _run(uttr_dict: Dict,
         event_config: SubjectPageConfig = None) -> SubjectPageConfig:
  uttr = utterance.load_utterance([uttr_dict])
  uttr.counters = ctr.Counters()
  cfg = builder.Config(event_config=event_config,
                       sv_chart_titles=SV_CHART_TITLES,
                       nopc_vars=NOPC_VARS)
  return text_format.MessageToString(builder.build(uttr, cfg))
