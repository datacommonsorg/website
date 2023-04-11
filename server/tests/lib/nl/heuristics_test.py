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

from parameterized import parameterized

from server.lib.nl.detection import ClassificationType
from server.lib.nl.detection import EventType
from server.lib.nl.detection import RankingType
from server.lib.nl.detection import TimeDeltaType
from server.services.nl import Model

# TODO: This should probably live in tests/services/nl_test.py
# NOTE: Quantity classifier is tested in quantity_parser.


class TestHeuristicEventClassifier(unittest.TestCase):
  """Test heuristic-based ranking classifier"""

  @classmethod
  def setUpClass(cls) -> None:
    cls._classifier = Model.heuristic_event_classification

  @parameterized.expand([
      ("What is the deadliest tropical storm in history?"),
      ("What is the most powerful tropical storm on record?"),
      ("What is the most active hurricane season on record?"),
      ("What were the costliest hurricanes in history?"),
      ("What was the most destructive cyclone"),
      ("Typhoons in Asia"),
  ])
  def test_detect_cyclone(self, query):
    expected = [EventType.CYCLONE]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("What are the chances of a drought in the next 10 years?"),
      ("Tell me about droughts in Africa"),
  ])
  def test_detect_drought(self, query):
    expected = [EventType.DROUGHT]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("When was the last earthquake in CA above 6 on the richter scale?"),
      ("What was the magnitude of the largest earthquake in California in the last 10 years?"
      ),
      ("What is the probability of an earthquake in California in the next year?"
      ),
  ])
  def test_detect_earthquake(self, query):
    expected = [EventType.EARTHQUAKE]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Which places were affected the most by extreme cold last year?"),
      ("cities that were extremely cold in the past decade"),
  ])
  def test_detect_extreme_cold(self, query):
    expected = [EventType.COLD]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Which places were affected the most by extreme heat last year?"),
      ("cities that were extremely hot in the last year"),
  ])
  def test_detect_extreme_heat(self, query):
    expected = [EventType.HEAT]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Which were the biggest fires in California of the last decade?"),
      ("Tell me about wildfires in Africa"),
      ("Wildland Fires in CA"),
  ])
  def test_detect_fire(self, query):
    expected = [EventType.FIRE]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("What is the probability of a flood in my city in the next 5 years?"),
      ("Where were the largest floods by area"),
  ])
  def test_detect_flood(self, query):
    expected = [EventType.FLOOD]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("What is the wet bulb temperature in Death Valley?"),
      ("Which cities have highest wet-bulb temperatures?"),
      ("Places with high wetbulb temperatures"),
      ("Wetbulb readings for Maine"),
  ])
  def test_detect_wet_bulb(self, query):
    expected = [EventType.WETBULB]
    classification = self._classifier(query)
    result = classification.attributes.event_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Number of poor women in Mountain View"),
      ("Hearing impaired in CA"),
      ("What is the median age of residents in Chicago?"),
      ("What is the average annual greenhouse gas emissions in Mexico City?"),
      ("infant deaths in the united states"),
      ("What is the population of hispanic people in Texas?"),
      ("Give me the average number of days with snowfall in Minneapolis"),
      ("How many people in Seattle"),
      ("Men with disabilities in the USA how many"),
  ])
  def test_no_false_positives(self, query):
    # If no matches, classifier returns None
    result = self._classifier(query)
    self.assertIsNone(result)


class TestHeuristicOverviewClassifier(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:
    cls._classifier = Model.heuristic_overview_classification

  @parameterized.expand([
      ("Tell me about palo alto"),
      ("new tell me about cambridge"),
  ])
  def test_detect_overview(self, query):
    expected = ClassificationType.OVERVIEW
    classification = self._classifier(query)
    result = classification.type
    self.assertEqual(result, expected)

  @parameterized.expand([
      ("Number of poor women in Mountain View"),
      ("Hearing impaired in CA"),
      ("What is the median age of residents in Chicago?"),
      ("What is the average annual greenhouse gas emissions in Mexico City?"),
      ("infant deaths in the united states"),
      ("What is the population of hispanic people in Texas?"),
      ("Give me the average number of days with snowfall in Minneapolis"),
      ("How many people in Seattle"),
      ("Men with disabilities in the USA how many"),
      ("what about berkeley"),
      ("how about in oregon"),
  ])
  def test_no_false_positives(self, query):
    # If no matches, classifier returns None
    result = self._classifier(query)
    self.assertIsNone(result)


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
      ("major fires in california"),
      ("what are the major causes of poverty in the world?"),
  ])
  def test_detect_highs(self, query: str):
    expected = [RankingType.HIGH]
    classification = self._classifier(query)
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
      ("what are the projected temperature extremes in california"),
      ("extreme temperatures in USA"),
  ])
  def test_detect_extreme(self, query):
    expected = [RankingType.EXTREME]
    classification = self._classifier(query)
    result = classification.attributes.ranking_type
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Violent crime count in London for the year 2001"),
      ("How has the population of New York City changed over the past century?"
      ),
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


class TestHeuristicTimeDeltaClassifier(unittest.TestCase):
  """Test heuristic-based time-delta classifier"""

  @classmethod
  def setUpClass(cls) -> None:
    cls._classifier = Model.heuristic_time_delta_classification

  @parameterized.expand([
      ("What countries have seen the greatest increase in median income"),
      ("Which places have seen the most increase in population?"),
      ("Which cities have the highest growth rate of median income?"),
      ("What countries have seen the greatest increase in median income"),
      ("How has population grown in the last 4 years"),
      ("median income growth in PA"),
      ("median age grew, yes or no"),
      ("where has there been a surge in number of storms"),
      ("where are covid cases surging"),
      ("What places have experienced a rise in cost of living"),
      ("What states have seen an increase in poverty"),
      ("What countries have seen a rise in the unemployment rate"),
      ("Places with increasing crime"),
  ])
  def test_detect_increasing(self, query):
    expected = [TimeDeltaType.INCREASE]
    classification = self._classifier(query)
    result = classification.attributes.time_delta_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("places with greatest drop in life expectancy"),
      ("Areas with the biggest population decline"),
      ("Areas with the most significant population loss"),
      ("Which places have seen the most decrease in population"),
      ("What are the cities with the biggest decrease in unemployment"),
      ("What are the states with the biggest drop in median income"),
      ("Which cities has fertility rate shrunk?"),
      ("Places where average age shrunk"),
      ("places with reduction in crime"),
      ("Where has the population decreased in the past 5 years"),
      ("Are there places that have seen a decrease in average salary"),
      ("How much has the average house price dropped in the last year"),
      ("What are the areas where housing prices have decreased"),
      ("Are there cities with a drop in population",),
      ("Are there places where gas prices have declined"),
      ("Are there places that have experienced a fall in average temperature"),
      ("What states have experienced a decrease in cost of living"),
      ("Has the number of people living in poverty decreased"),
      ("Are there areas where the number of homeless people has declined"),
      ("What countries have seen a drop in the number of people with health"),
      ("Places with decreasing crime"),
  ])
  def test_detect_decreasing(self, query):
    expected = [TimeDeltaType.DECREASE]
    classification = self._classifier(query)
    result = classification.attributes.time_delta_types
    self.assertCountEqual(result, expected)

  @parameterized.expand([
      ("Violent crime count in London for the year 2001"),
      ("How has the population of New York City changed over the past century?"
      ),
      ("What events happened on June 15, 2022?"),
      ("States with highest GINI index"),
      ("Which counties in CA have the highest population density"),
      ("Where in America has the oldest population"),
      ("Cities with the lowest crime rates"),
      ("Countries whose populations are growing the slowest"),
      ("States with the lowest gender income equality"),
      ("Show me per capita rates of heart disease in USA"),
      ("What is the average per household income of US States?"),
      ("What places experienced wet bulb temperatures over 35 C?"),
      ("Number of poor women in Mountain View"),
      ("Hearing impaired in CA"),
      ("What is the median age of residents in Chicago?"),
      ("What is the average annual greenhouse gas emissions in Mexico City?"),
      ("infant deaths in the united states"),
      ("How does crime in Palo Alto compare to that of Santa Clara?"),
      ("What is the GDP of USA? How does that compare to Russia?"),
      ("Which state has better air quality, CA, OR, or WA?"),
      ("Which has a higher population, X or Y?"),
      ("What county has better education, A or B?"),
  ])
  def test_no_false_positives(self, query):
    # If no matches, classifier returns None
    result = self._classifier(query)
    self.assertIsNone(result)
