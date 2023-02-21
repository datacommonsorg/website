# Copyright 2022 Google LLC
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
Script to test flow of nlp features.

How to run locally:
FLASK_ENV=local python test_nlp_manual.py
"""
from dataclasses import dataclass
import json
import sys
from typing import Dict, List, Optional
import urllib.parse

from web_app import app

PALO_ALTO_DCID = 'geoId/0655282'
BOSTON_DICD = 'geoId/2507000'
CALIFORNIA_DCID = 'geoId/06'


def _print_message(msg: str):
  print('=' * 80)
  print(msg)
  print('=' * 80)


def _encoded_q(query: str, embedding: str = 'us_filtered'):
  return urllib.parse.urlencode({'q': query, 'build': embedding})


# The following are compact representations of nl API result.
# Feel free to add what is needed in order to verify the test flow.


@dataclass
class Tile:
  stat_var_key: Optional[str] = None
  ranking: Optional[str] = None


@dataclass
class Categories:
  # Checks categories[0]['blocks'][0]['columns'][0]['tiles']
  # Order is not tested.
  tiles: Optional[List[Tile]] = None


@dataclass
class Metadata:
  place_dcid: Optional[List[str]] = None


@dataclass
class Config:
  categories: Optional[Categories] = None
  metadata: Optional[Metadata] = None


def _verify_categories(categories: Categories, got: Dict):
  if categories.tiles:
    # Check if all tile specs in this this has stat var keys
    assert all(t.stat_var_key for t in categories.tiles)

    stat_var_keys_got = set()
    for tile in got[0]['blocks'][0]['columns'][0]['tiles']:
      stat_var_keys_got.update(tile['statVarKey'])

    assert stat_var_keys_got == set([t.stat_var_key for t in categories.tiles])

  sv_key_2_tile_dict = {}
  for tile in got[0]['blocks'][0]['columns'][0]['tiles']:
    for k in tile['statVarKey']:
      sv_key_2_tile_dict[k] = tile

  for tile in categories.tiles:
    if tile.ranking:
      tile_got = sv_key_2_tile_dict[tile.stat_var_key]
      assert tile_got['type'] == "RANKING"
      assert set([tile.ranking]) == set(tile_got['rankingTileSpec'].keys())


def _verify_metadata(metadata: Metadata, got: Dict):
  if metadata.place_dcid:
    assert got.get('placeDcid') == metadata.place_dcid


def _verify_config(config: Config, got: Dict):
  if config.categories:
    assert 'categories' in got
    _verify_categories(config.categories, got['categories'])

  if config.metadata:
    assert 'metadata' in got
    _verify_metadata(config.metadata, got['metadata'])


@dataclass
class QueryTestCase:
  query: str
  # A subset of the actual config returned.
  # Every field(including nested fields) config_expected must be in
  # the config returned for the test to pass.
  config_expected: Config

  def test(self, context_history: List):
    """Tests the query by calling NL data API.

    Modifies the context_history using API call result.
    """
    response = app.test_client().post(f'/nl/data?{_encoded_q(self.query)}',
                                      json={'contextHistory': context_history},
                                      content_type='application/json')

    # Test NL data config matches.
    try:
      assert response.status_code == 200
      assert 'config' in response.json

      _verify_config(self.config_expected, response.json['config'])
    except AssertionError:
      print(json.dumps(response.json['context'], indent=2))
      _print_message(f'Failed - {self.query}')
      sys.exit('Flow failed, please see context above.')

    context_history.append(response.json['context'])
    _print_message(f"SUCCESS - '{self.query}'")


def test_palo_alto_flow():
  """Tests the following flow.

  1. "tell me about Palo Alto"
  2. "what about auto theft"
  3. "what about Boston"
  4. "what are the worst cities in California"
  """
  context_history = []
  test_cases = [
      # Q1.
      QueryTestCase(query='tell me about Palo Alto',
                    config_expected=Config(metadata=Metadata(
                        place_dcid=[PALO_ALTO_DCID]))),
      # Q2.
      QueryTestCase(
          query='what about auto theft',
          config_expected=Config(
              categories=Categories(tiles=[
                  Tile(stat_var_key='Count_CriminalActivities_MotorVehicleTheft'
                      ),
                  Tile(stat_var_key=
                       'Count_CriminalActivities_MotorVehicleTheft_pc')
              ]),
              # Check if the place is still Palo Alto.
              metadata=Metadata(place_dcid=[PALO_ALTO_DCID]))),
      # Q3.
      QueryTestCase(
          query='what about Boston',
          config_expected=Config(
              # TODO: Fix vars below, currently it returns 2 random svs.
              # categories=Categories(tiles=[
              #     Tile(stat_var_key='Count_CriminalActivities_MotorVehicleTheft'),
              #     Tile(stat_var_key='Count_CriminalActivities_MotorVehicleTheft_pc')
              # ]),
              # Check if the place is swtiched to Boston.
              metadata=Metadata(place_dcid=[BOSTON_DICD]))),
      # Q4.
      QueryTestCase(
          query='which are the worst cities for auto theft in california',
          # TODO: add tests for cities ranking.
          config_expected=Config(categories=Categories(tiles=[
              Tile(stat_var_key='Count_CriminalActivities_MotorVehicleTheft',
                   ranking='showHighest'),
              Tile(stat_var_key='Count_CriminalActivities_MotorVehicleTheft_pc',
                   ranking='showHighest')
          ]),
                                 metadata=Metadata(
                                     place_dcid=[CALIFORNIA_DCID])))
  ]

  for test_case in test_cases:
    test_case.test(context_history)


def main():
  test_palo_alto_flow()
  _print_message('Palo Alto flow is successful.')


if __name__ == '__main__':
  main()
