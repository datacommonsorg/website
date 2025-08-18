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

from server.routes.shared_api.autocomplete import helpers
from server.routes.shared_api.autocomplete.autocomplete import \
    _custom_rank_predictions
from server.routes.shared_api.autocomplete.types import ScoredPrediction
import server.tests.routes.api.mock_data as mock_data
from web_app import app


class TestAutocomplete(unittest.TestCase):

  def run_autocomplete_query(self, query: str, lang: str):
    return app.test_client().get(f"/api/autocomplete?query={query}&hl={lang}",
                                 json={})

  lang = 'en'

  @patch('server.routes.shared_api.autocomplete.helpers.predict')
  @patch('server.routes.shared_api.place.fetch.resolve_id')
  def test_empty_query(self, mock_resolve_ids, mock_predict):

    def resolve_ids_side_effect(nodes, in_prop, out_prop):
      return []

    def mock_predict_effect(query, lang, source):
      return []

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

    def mock_predict_effect(query, lang, source):
      return mock_data.MAPS_PREDICTIONS_VALUES

    mock_resolve_ids.side_effect = resolve_ids_side_effect
    mock_predict.side_effect = mock_predict_effect

    response = self.run_autocomplete_query('Calif', 'en')

    self.assertEqual(response.status_code, 200)

    response_dict = json.loads(response.data.decode("utf-8"))
    self.assertEqual(len(response_dict["predictions"]), 5)

  @patch(
      'server.routes.shared_api.autocomplete.autocomplete.is_feature_enabled',
      return_value=True)
  def test_custom_ranking(self, mock_is_feature_enabled):
    # Test that for a query like "Population of Calif", the place suggestion
    # "California" is ranked higher than the stat var suggestions.
    original_query = "Population of Calif"
    predictions = [
        ScoredPrediction(description="California",
                         place_id="place1",
                         place_dcid="dcid1",
                         matched_query="Calif",
                         score=0.0,
                         source='ngram_place'),
        ScoredPrediction(description="Population of Children",
                         place_id=None,
                         place_dcid="dcid2",
                         matched_query="Population of",
                         score=0.0,
                         source='core_concept_sv'),
        ScoredPrediction(description="Population of Adults",
                         place_id=None,
                         place_dcid="dcid3",
                         matched_query="Population of",
                         score=1.0,
                         source='core_concept_sv'),
    ]

    ranked_predictions = _custom_rank_predictions(predictions, original_query)
    self.assertEqual(ranked_predictions[0].description, "California")

  # Tests for helpers within autocomplete.
  def test_bag_of_words_same(self):
    """Tests that bag of words passes for same letters."""
    text = "San"
    reordered_text = "Sna"
    self.assertTrue(helpers.off_by_one_letter(text, reordered_text))

  def test_bag_of_words_off_by_one(self):
    """Tests that bag of words passes when off by one."""
    text = "Diego"
    off_by_one_text = "Digo"
    self.assertTrue(helpers.off_by_one_letter(text, off_by_one_text))

  def test_bag_of_words_off_by_two(self):
    """Tests that bag of words passes when off by two."""
    text = "Diego"
    off_by_one_text = "Diaga"
    self.assertFalse(helpers.off_by_one_letter(text, off_by_one_text))
