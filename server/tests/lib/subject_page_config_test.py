# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import unittest
from unittest import mock

from google.protobuf import text_format

from server.config import subject_page_pb2
import server.lib.subject_page_config as lib_subject_page_config
import server.lib.util as lib_util


class TestGetAllVariables(unittest.TestCase):

  def test(self):
    expected = [
        'Area_FloodEvent', 'Area_fireEvent', 'Count_CycloneEvent',
        'Count_CycloneEvent_ExtratropicalCyclone',
        'Count_CycloneEvent_SubtropicalStorm',
        'Count_CycloneEvent_TropicalDisturbance',
        'Count_CycloneEvent_TropicalStorm', 'Count_EarthquakeEvent',
        'Count_EarthquakeEvent_M3To4', 'Count_EarthquakeEvent_M4To5',
        'Count_EarthquakeEvent_M5To6', 'Count_EarthquakeEvent_M6To7',
        'Count_EarthquakeEvent_M7To8', 'Count_EarthquakeEvent_M9Onwards',
        'Count_EarthquakeEvent_M9To9', 'Count_FloodEvent', 'Count_fireEvent',
        'StandardizedPrecipitationIndex_Atmosphere_1MonthPeriod',
        'StandardizedPrecipitationIndex_Atmosphere_3MonthPeriod'
    ]
    config = lib_util.get_subject_page_config(
        "server/tests/test_data/disaster.textproto")
    assert sorted(lib_subject_page_config.get_all_variables(config)) == expected


# class TestTrimConfig(unittest.TestCase):

#   def test_trim_tiles(self):
#     config = lib_util.get_subject_page_config(
#         "server/tests/test_data/disaster.textproto")
#     config = lib_subject_page_config.trim_config(
#         config, "Count_fireEvent", subject_page_pb2.Tile.TileType.HISTOGRAM)
#     config = lib_subject_page_config.trim_config(
#         config, "Count_fireEvent", subject_page_pb2.Tile.TileType.MAP)
#     result = text_format.MessageToString(config.categories[-1])

#     category = subject_page_pb2.Category()
#     text_format.Parse(
#         """
#         title: "Fires"
#         blocks {
#             columns {
#                 tiles {
#                     type: HISTOGRAM
#                     title: "Total area affected by fires over time"
#                     stat_var_key: "fire_area"
#                 }
#             }
#             columns {
#                 tiles {
#                     type: MAP
#                     title: "Total area affected by fires"
#                     stat_var_key: "fire_area"
#                 }
#             }
#         }
#         stat_var_spec {
#             key: "fire_count"
#             value {
#             stat_var: "Count_fireEvent"
#             name: "Count of fires"
#             }
#         }
#         stat_var_spec {
#             key: "fire_area"
#             value {
#             stat_var: "Area_fireEvent"
#             name: "Area affected by fires"
#             }
#         }
#         """, category)
#     expect = text_format.MessageToString(category)
#     assert result == expect

#     # Remove two more tiles, then the entire Fire category should be removed.
#     config = lib_subject_page_config.trim_config(
#         config, "Area_fireEvent", subject_page_pb2.Tile.TileType.HISTOGRAM)
#     config = lib_subject_page_config.trim_config(
#         config, "Area_fireEvent", subject_page_pb2.Tile.TileType.MAP)
#     assert config.categories[-1].title == "Floods"


class TestRemoveEmptyCharts(unittest.TestCase):

    def test_exist_keys_category(self):
        category = subject_page_pb2.Category()
        text_format.Parse(
            """
            stat_var_spec {
                key: "filtered_0"
                value {
                    stat_var: "Count_fireEvent"
                }
            }
            stat_var_spec {
                key: "kept_0"
                value {
                    stat_var: "Area_fireEvent"
                }
            }
            stat_var_spec {
                key: "kept_1"
                value {
                    stat_var: "Area_fireEvent"
                    denom: "TotalArea"
                }
            }
            stat_var_spec {
                key: "filtered_1"
                value {
                    stat_var: "Area_fireEvent"
                    denom: "Nonexistent"
                }
            }
            """, category)
        stat_vars_existence = {
            'variable': {
                'Count_fireEvent': {'entity': {'place_id': False}},
                'Area_fireEvent': {'entity': {'place_id': True}},
                'TotalArea': {'entity': {'place_id': True}},
                'Nonexistent': {'entity': {'place_id': False}},
            }
        }
        result = lib_subject_page_config.exist_keys_category('place_id', category, stat_vars_existence)
        expect = {
            "kept_0": True,
            "kept_1": True,
            "filtered_0": False,
            "filtered_1": False,
        }
        assert result == expect

    @mock.patch('server.services.datacommons.observation_existence')
    def test_remove_empty_charts(self, mock_observation_existence):
        def obs_side_effect(all_svs, place_dcids):
           return {
            'variable': {
                "sv_exists_1": {'entity': {'place_id': True}},
                "sv_exists_3": {'entity': {'place_id': True}},
                "sv_filtered_1": {'entity': {'place_id': False}},
                "sv_filtered_2": {'entity': {'place_id': False}},
                "sv_filtered_3": {'entity': {'place_id': False}},
            }
           }
        mock_observation_existence.side_effect = obs_side_effect
        config = lib_util.get_subject_page_config(
            "server/tests/test_data/existence.textproto")
        result = lib_subject_page_config.remove_empty_charts(config, 'place_id')
        print("result:")
        print(result)
        expect = lib_util.get_subject_page_config(
            "server/tests/test_data/existence_expect.textproto")
        assert result == expect


#   def test_trim_tiles(self):
#     config = lib_util.get_subject_page_config(
#         "server/tests/test_data/existence.textproto")
#     config = lib_subject_page_config.trim_config(
#         config, "Count_fireEvent", subject_page_pb2.Tile.TileType.HISTOGRAM)
#     config = lib_subject_page_config.trim_config(
#         config, "Count_fireEvent", subject_page_pb2.Tile.TileType.MAP)
#     result = text_format.MessageToString(config.categories[-1])

#     category = subject_page_pb2.Category()
#     text_format.Parse(
#         """
#         title: "Fires"
#         blocks {
#             columns {
#                 tiles {
#                     type: HISTOGRAM
#                     title: "Total area affected by fires over time"
#                     stat_var_key: "fire_area"
#                 }
#             }
#             columns {
#                 tiles {
#                     type: MAP
#                     title: "Total area affected by fires"
#                     stat_var_key: "fire_area"
#                 }
#             }
#         }
#         stat_var_spec {
#             key: "fire_count"
#             value {
#             stat_var: "Count_fireEvent"
#             name: "Count of fires"
#             }
#         }
#         stat_var_spec {
#             key: "fire_area"
#             value {
#             stat_var: "Area_fireEvent"
#             name: "Area affected by fires"
#             }
#         }
#         """, category)
#     expect = text_format.MessageToString(category)
#     assert result == expect

#     # Remove two more tiles, then the entire Fire category should be removed.
#     config = lib_subject_page_config.trim_config(
#         config, "Area_fireEvent", subject_page_pb2.Tile.TileType.HISTOGRAM)
#     config = lib_subject_page_config.trim_config(
#         config, "Area_fireEvent", subject_page_pb2.Tile.TileType.MAP)
#     assert config.categories[-1].title == "Floods"
