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

import unittest
from google.protobuf import text_format
from parameterized import parameterized
from typing import Dict
from unittest.mock import patch

from lib.nl import nl_utils, nl_utterance, nl_page_config_next
from config.subject_page_pb2 import SubjectPageConfig
from tests.lib.nl.test_utterance import PLACE_ONLY_UTTR, SIMPLE_UTTR, SIMPLE_WITH_SV_EXT_UTTR, \
  SIMPLE_WITH_TOPIC_UTTR, COMPARISON_UTTR, CONTAINED_IN_UTTR, CORRELATION_UTTR, RANKING_UTTR

PLACE_ONLY_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
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
   blocks {
     columns {
       tiles {
         title: "Count_Person_Male"
         type: LINE
         stat_var_key: "Count_Person_Male"
       }
       tiles {
         title: "Count_Person_Male - Per Capita"
         type: LINE
         stat_var_key: "Count_Person_Male_pc"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Count_Person_Female"
         type: LINE
         stat_var_key: "Count_Person_Female"
       }
       tiles {
         title: "Count_Person_Female - Per Capita"
         type: LINE
         stat_var_key: "Count_Person_Female_pc"
       }
     }
   }
   stat_var_spec {
     key: "Count_Person_Female"
     value {
       stat_var: "Count_Person_Female"
       name: "Count_Person_Female"
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_pc"
     value {
       stat_var: "Count_Person_Female"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Person_Female"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male"
     value {
       stat_var: "Count_Person_Male"
       name: "Count_Person_Male"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_pc"
     value {
       stat_var: "Count_Person_Male"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Person_Male"
     }
   }
 }
"""

SIMPLE_WITH_SV_EXT_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
   blocks {
     columns {
       tiles {
         title: "Count_Person_Male"
         type: LINE
         stat_var_key: "Count_Person_Male"
       }
       tiles {
         title: "Count_Person_Male - Per Capita"
         type: LINE
         stat_var_key: "Count_Person_Male_pc"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Compare with Other Variables"
         type: LINE
         stat_var_key: "Count_Person_Male"
         stat_var_key: "Count_Person_Female"
       }
       tiles {
         title: "Compare with Other Variables - Per Capita"
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
       name: "Count_Person_Female"
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_pc"
     value {
       stat_var: "Count_Person_Female"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Person_Female"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male"
     value {
       stat_var: "Count_Person_Male"
       name: "Count_Person_Male"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_pc"
     value {
       stat_var: "Count_Person_Male"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Person_Male"
     }
   }
 }
"""

SIMPLE_WITH_TOPIC_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
   blocks {
     columns {
       tiles {
         title: "Count_Farm"
         type: LINE
         stat_var_key: "Count_Farm"
       }
       tiles {
         title: "Area_Farm"
         type: LINE
         stat_var_key: "Area_Farm"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Compare with Other Variables"
         type: LINE
         stat_var_key: "FarmInventory_Rice"
         stat_var_key: "FarmInventory_Barley"
       }
     }
   }
   stat_var_spec {
     key: "Area_Farm"
     value {
       stat_var: "Area_Farm"
       name: "Area_Farm"
     }
   }
   stat_var_spec {
     key: "Count_Farm"
     value {
       stat_var: "Count_Farm"
       name: "Count_Farm"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Barley"
     value {
       stat_var: "FarmInventory_Barley"
       name: "FarmInventory_Barley"
     }
   }
   stat_var_spec {
     key: "FarmInventory_Rice"
     value {
       stat_var: "FarmInventory_Rice"
       name: "FarmInventory_Rice"
     }
   }
 }
"""

COMPARISON_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
 }
 categories {
   blocks {
     columns {
       tiles {
         title: "Total"
         type: BAR
         stat_var_key: "Count_Person_Male_multiple_place_bar_block"
         comparison_places: "geoId/06"
         comparison_places: "geoId/32"
       }
       tiles {
         title: "Per Capita"
         type: BAR
         stat_var_key: "Count_Person_Male_multiple_place_bar_block_pc"
         comparison_places: "geoId/06"
         comparison_places: "geoId/32"
       }
     }
   }
   blocks {
     columns {
       tiles {
         title: "Total"
         type: BAR
         stat_var_key: "Count_Person_Female_multiple_place_bar_block"
         comparison_places: "geoId/06"
         comparison_places: "geoId/32"
       }
       tiles {
         title: "Per Capita"
         type: BAR
         stat_var_key: "Count_Person_Female_multiple_place_bar_block_pc"
         comparison_places: "geoId/06"
         comparison_places: "geoId/32"
       }
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_multiple_place_bar_block"
     value {
       stat_var: "Count_Person_Female"
       name: "Count_Person_Female"
     }
   }
   stat_var_spec {
     key: "Count_Person_Female_multiple_place_bar_block_pc"
     value {
       stat_var: "Count_Person_Female"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Person_Female"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_multiple_place_bar_block"
     value {
       stat_var: "Count_Person_Male"
       name: "Count_Person_Male"
     }
   }
   stat_var_spec {
     key: "Count_Person_Male_multiple_place_bar_block_pc"
     value {
       stat_var: "Count_Person_Male"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Person_Male"
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
   blocks {
     columns {
       tiles {
         title: "Count_Farm"
         type: MAP
         stat_var_key: "Count_Farm"
       }
       tiles {
         title: "Count_Farm - Per Capita"
         type: MAP
         stat_var_key: "Count_Farm_pc"
       }
     }
   }
   stat_var_spec {
     key: "Count_Farm"
     value {
       stat_var: "Count_Farm"
       name: "Count_Farm"
     }
   }
   stat_var_spec {
     key: "Count_Farm_pc"
     value {
       stat_var: "Count_Farm"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Farm"
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
   blocks {
     columns {
       tiles {
         title: "Count_Farm vs. Mean_Precipitation"
         type: SCATTER
         stat_var_key: "Count_Farm_scatter"
         stat_var_key: "Mean_Precipitation_scatter"
       }
     }
   }
   stat_var_spec {
     key: "Count_Farm_scatter"
     value {
       stat_var: "Count_Farm"
       name: "Count_Farm"
     }
   }
   stat_var_spec {
     key: "Mean_Precipitation_scatter"
     value {
       stat_var: "Mean_Precipitation"
       name: "Mean_Precipitation"
     }
   }
 }
"""

RANKING_CONFIG = """
 metadata {
   place_dcid: "geoId/06"
   contained_place_types {
     key: "State"
     value: "County"
   }
 }
 categories {
   blocks {
     columns {
       tiles {
         title: "Count_Agricultural_Workers in Foo Place"
         type: RANKING
         stat_var_key: "Count_Agricultural_Workers"
         ranking_tile_spec {
           show_highest: true
           ranking_count: 10
         }
       }
       tiles {
         title: "Per Capita Count_Agricultural_Workers in Foo Place"
         type: RANKING
         stat_var_key: "Count_Agricultural_Workers_pc"
         ranking_tile_spec {
           show_highest: true
           ranking_count: 10
         }
       }
     }
   }
   stat_var_spec {
     key: "Count_Agricultural_Workers"
     value {
       stat_var: "Count_Agricultural_Workers"
       name: "Count_Agricultural_Workers"
     }
   }
   stat_var_spec {
     key: "Count_Agricultural_Workers_pc"
     value {
       stat_var: "Count_Agricultural_Workers"
       denom: "Count_Person"
       unit: "%"
       scaling: 100.0
       name: "Count_Agricultural_Workers"
     }
   }
 }
"""


# This has a set of similar tests to the ones in nl_data_spec_next_test.py.
class TestPageConfigNext(unittest.TestCase):

  @parameterized.expand([
      ["Place Only", PLACE_ONLY_UTTR, PLACE_ONLY_CONFIG],
      ["Simple", SIMPLE_UTTR, SIMPLE_CONFIG],
      [
          "Simple with SV extensions", SIMPLE_WITH_SV_EXT_UTTR,
          SIMPLE_WITH_SV_EXT_CONFIG
      ],
      ["Simple with topic", SIMPLE_WITH_TOPIC_UTTR, SIMPLE_WITH_TOPIC_CONFIG],
      ["Simple with comparison", COMPARISON_UTTR, COMPARISON_CONFIG],
      ["Simple with contained-in", CONTAINED_IN_UTTR, CONTAINED_IN_CONFIG],
      ["Simple with correlation", CORRELATION_UTTR, CORRELATION_CONFIG],
      ["Simple with ranking", RANKING_UTTR, RANKING_CONFIG],
  ])
  @patch.object(nl_utils, 'get_sv_name')
  def test_main(self, test_name, uttr_dict, config_str, mock_sv_name):
    mock_sv_name.side_effect = (lambda svs: {sv: sv for sv in svs})
    got = _run(uttr_dict)
    self.maxDiff = None
    self.assertEqual(got, _textproto(config_str), test_name + ' failed!')


def _textproto(s):
  config = SubjectPageConfig()
  text_format.Parse(s, config)
  return text_format.MessageToString(config)


def _run(uttr_dict: Dict) -> SubjectPageConfig:
  uttr = nl_utterance.load_utterance([uttr_dict])
  return text_format.MessageToString(
      nl_page_config_next.build_page_config(uttr))
