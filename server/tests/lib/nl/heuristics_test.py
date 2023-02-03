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
"""Tests for heuristic-classifiers functions."""

import unittest

from lib.nl.detection import RankingType
from parameterized import parameterized
from services.nl import Model


class TestHeuristicRankingClassifier(unittest.TestCase):
  """Test heuristic-based ranking classifier"""

  @classmethod
  def setUpClass(cls) -> None:
    cls._classifier = Model.heuristic_ranking_classification

  @parameterized.expand([
      ("States with highest GINI index"),
      ("Which counties in CA have the highest population density"),
      ("Where in America has the oldest population"),
      ("US cities with high life expectancy"),
      ("Most polluted cities in the world"),
      ("List of strongest storms this year"),
      ("Illest countries"),
      ("Sickest counties in CA"),
      ("Countries with greatest increase in population"),
      ("Which were the largest fires last year?"),
      ("Biggest storms in Asia right now"),
      ("What are the top 5 most educated states in the country?"),
      ("Top 10 leading causes of death in the United States"),
      ("Highest literacy rates in America"),
      ("Show me the countries most affected by floods"),
      ("Richest countries by GDP"),
      ("Give me a top to bottom ranking of cities by population"),
      ("CO2 emissions by country, highest to lowest"),
  ])
  def test_detect_highs(self, query: str):
    expected = [RankingType.HIGH]
    classification = self._classifier(query)
    print(classification)
    result = classification.attributes.ranking_type
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("States with lowest GINI index"),
      ("Which counties in CA have the lowest population density"),
      ("Where in America has the youngest population"),
      ("US cities with low life expectancy"),
      ("Least polluted cities in the world"),
      ("List of weakest storms this year"),
      ("Healthiest countries"),
      ("Which were the smallest fires last year?"),
      ("Smallest storms in Asia right now"),
      ("What are the bottom 5 least educated states in the country?"),
      ("Bottom 10 leading causes of death in the United States"),
      ("Lowest literacy rates in America"),
      ("Show me the countries least affected by floods"),
      ("Poorest countries by GDP"),
      ("Give me a bottom to top ranking of cities by population"),
      ("CO2 emissions by country, lowest to highest"),
  ])
  def test_detect_lows(self, query: str):
    expected = [RankingType.LOW]
    classification = self._classifier(query)
    result = classification.attributes.ranking_type
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Best cities in the US"),
      ("which are the best cities in california for job prospects"),
      ("Climate change, best places"),
  ])
  def test_detect_best(self, query: str):
    expected = [RankingType.BEST, RankingType.HIGH]
    classification = self._classifier(query)
    result = classification.attributes.ranking_type
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Worst cities in the US"),
      ("which are the worst cities in california for job prospects"),
      ("Climate change, worst places"),
  ])
  def test_detect_worst(self, query: str):
    expected = [RankingType.WORST, RankingType.LOW]
    classification = self._classifier(query)
    result = classification.attributes.ranking_type
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Violent crime count in London for the year 2001"),
      ("How has the population of New York City changed over the past century?"),
      ("What events happened on June 15, 2022?"),
      ("Show me per capita rates of heart disease in USA"),
      ("What is the average per household income of US States?"),
      ("What places experienced wet bulb temperatures over 35 C?"),
      ("How does crime in Palo Alto compare to that of Santa Clara?"),
      ("What is the GDP of USA? How does that compare to Russia?"),
      ("Which state has better air quality, CA, OR, or WA?"),
      ("Number of poor women in Mountain View"),
      ("Hearing impaired in CA"),
      ("What is the median age of residents in Chicago?"),
      ("Which cities has fertility rate shrunk?"),
      ("Places where average age shrunk"),
      ("places with reduction in crime"),
  ])
  def test_no_false_positives(self, query):
    # If no matches, classifier returns None
    result = self._classifier(query)
    self.assertIsNone(result)
