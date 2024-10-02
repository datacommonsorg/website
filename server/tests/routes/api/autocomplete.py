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
import json
import unittest
from unittest.mock import patch

import server.tests.routes.api.mock_data as mock_data
from web_app import app


class TestAutocomplete(unittest.TestCase):

  def run_autocomplete_query(self, query: str, lang: str):
    return app.test_client().post(
        "/api/autocomplete?query=`${query}`&hl=${lang}", json={})

  lang = 'en'

  @patch('server.routes.shared_api.autocomplete.helpers.predict')
  @patch('server.routes.shared_api.place.fetch.resolve_id')
  def test_empty_query(self, mock_resolve_ids, mock_predict):

    def resolve_ids_side_effect(nodes, in_prop, out_prop):
      return []

    def mock_predict_effect(query, lang):
      return {}

    mock_resolve_ids.side_effect = resolve_ids_side_effect
    mock_predict.side_effect = mock_predict_effect

    response = self.run_autocomplete_query('', 'en')
    self.assertEqual(response.status_code, 200)

    response_dict = json.loads(response.data.decode("utf-8"))
    self.assertEqual(len(response_dict["predictions"]), 0)

  @patch('server.routes.shared_api.autocomplete.helpers.predict')
  @patch('server.routes.shared_api.place.fetch.resolve_id')
  def test_single_word_query(self, mock_resolve_ids, mock_predict):

    def resolve_ids_side_effect(nodes, in_prop, out_prop):
      return mock_data.RESOLVE_IDS_VALUES

    def mock_predict_effect(query, lang):
      return mock_data.MAPS_PREDICTIONS_VALUES

    mock_resolve_ids.side_effect = resolve_ids_side_effect
    mock_predict.side_effect = mock_predict_effect

    response = self.run_autocomplete_query('Calif', 'en')

    self.assertEqual(response.status_code, 200)

    response_dict = json.loads(response.data.decode("utf-8"))
    self.assertEqual(len(response_dict["predictions"]), 5)