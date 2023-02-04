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

# The following dictionaries are used by the NL query classification under
# the path server.services.nl and also invoked from the server/__init__.py
from dataclasses import dataclass
from typing import Any, Dict, List

from lib.nl.detection import BinaryClassificationResultType
from sklearn.cluster import AgglomerativeClustering
from sklearn.linear_model import LogisticRegression


@dataclass
class NLQueryClassificationType:
  """Types of classifications supported in the NL module."""
  name: str
  categories: Dict[str, BinaryClassificationResultType]


@dataclass
class NLQueryClassificationData:
  """Type and training data for NL Query classification."""
  classification_type: NLQueryClassificationType
  training_sentences: Dict[str, List[str]]


@dataclass
class NLQueryClassificationModel:
  """Type and training data for NL Query classification."""
  classification_type: NLQueryClassificationType
  classification_model: Any

  def __init__(self, classification_type: NLQueryClassificationType):
    self.classification_type = classification_type
    self.classification_model = LogisticRegression(max_iter=1000,
                                                   random_state=123)


@dataclass
class NLQueryClusteringDetectionModel:
  """Attributes for the NL Query Correlation classification using clustering."""
  clustering_model: Any
  cosine_similarity_cutoff: float

  def __init__(self):
    self.clustering_model = AgglomerativeClustering(n_clusters=2,
                                                    affinity='cosine',
                                                    linkage='average')


# Query Sentence Classification Types and associated training data.
CLASSIFICATION_INFO: Dict[str, NLQueryClassificationData] = {
    "ranking":
        NLQueryClassificationData(
            classification_type=NLQueryClassificationType(
                name="ranking",
                categories={
                    "1": BinaryClassificationResultType.SUCCESS,
                    "2": BinaryClassificationResultType.SUCCESS,
                    "3": BinaryClassificationResultType.FAILURE,
                },
            ),
            training_sentences={
                "1": [
                    "States with highest GINI index in the US",
                    "Most polluted cities in the world",
                    "Counties with the highest level of illness in america",
                    "countries using the most water per capita",
                    "Top 10 leading causes of death in the United States",
                    "What are the top 5 most educated states in the US?",
                    "Where in America has the oldest population",
                    "Which states in the US have the highest income inequality?",
                    "Hottest cities in summer across canada",
                    "Safest city for my family to move to in north america",
                    "wealthiest postal codes in the UK",
                    "what counties have the most people with doctoral degrees in california",
                    "richest countries in the world",
                    "cities with the best transportation network in the world",
                    "provinces which are most at risk of flooding in india",
                    "Top 10 tourist destinations in Europe",
                    "Most populous cities in China",
                    "Largest countries by land area",
                    "Highest mountain peaks in the world",
                    "Countries with the longest life expectancy",
                    "Top 10 beaches in the world",
                    "Most expensive cities to live in",
                    "Largest lakes in Africa",
                    "Top 10 cultural destinations in Asia",
                    "Countries with the highest literacy rates",
                    "Most visited national parks in the US",
                    "Largest islands in the world",
                    "Top 10 honeymoon destinations",
                    "Countries with the most biodiverse ecosystems",
                    "Most populous cities in South America",
                    "Largest deserts in the world",
                    "Top 10 ski resorts in Europe",
                    "Countries with the highest GDP per capita",
                    "Largest cities in Australia",
                    "Top 10 historical landmarks in the world",
                ],
                "2": [
                    "Cities with the lowest crime rates in montana",
                    "poorest states in the USA",
                    "bottom five countries in terms of GDP",
                    "lowest ranked tourist destinations in Europe",
                    "bottom five most polluted cities in the world",
                    "countries with the lowest literacy rates",
                    "smallest cities in the world by population",
                    "least expensive countries to live in",
                    "worst-rated hotels in Las Vegas",
                    "lowest rated schools in California",
                    "countries with the lowest average life expectancy",
                    "smallest countries in terms of land area",
                    "bottom ten countries in terms of internet speed.",
                    "Least popular tourist destinations in the Caribbean",
                    "Smallest towns in New England",
                    "Least expensive cities to live in California",
                    "Furthest cities from the coast in the United States",
                    "Lowest elevation cities in the world",
                ],
                "3": [
                    "Number of poor women in Mountain View",
                    "Hearing impaired in CA",
                    "What is the median age of residents in Chicago?",
                    "What is the average annual rainfall in Mexico City?",
                    "Coronavirus deaths worldwide",
                    "Average temperature in Toronto",
                    "What is the ethnic makeup of Texas?",
                    "Give me the number of days with snowfall in Minneapolis",
                    "How many people in Seattle",
                    "Men over retirement age in the USA how many",
                    "How much carbon dioxide per person used in California",
                    "number of disable women in florida",
                    "illeterate people in chicago",
                    "number of hispanic women who are single and illiterate in texas",
                    "monthly temperatures in idaho",
                    "how much does it rain in nevada?",
                    "The zip code 90210 is located in Beverly Hills, California.",
                    "Toronto is the capital city of the province of Ontario in Canada.",
                    "The state of Texas is located in the southern United States.",
                    "The country of Brazil is located in South America.",
                    "The province of Quebec is located in eastern Canada and is the only Canadian province with a predominantly French-speaking population.",
                    "The city of Sydney a city in Australia and is located on the country's east coast.",
                    "The county of Los Angeles is the a populous county in the state of California and includes the city of Los Angeles.",
                    "The state of Florida is located in the southeastern United States and is known for its warm weather and sandy beaches.",
                    "The zip code 10001 is located in New York City, New York.",
                    "The sky is blue because the Earth's atmosphere scatters blue light from the sun.",
                    "Apples are a popular fruit because they are nutritious and have a wide variety of uses in cooking and baking.",
                    "Elephants are the big land animals and are known for their strong memories and social bonds.",
                    "The human body consists of many different systems, including the circulatory system, the respiratory system, and the nervous system.",
                    "The Great Barrier Reef is home to a diverse array of marine life, including coral, fish, and many species of shells.",
                    "Cats are popular pets because they are independent, low-maintenance, and affectionate with their owners.",
                    "Birds are adapted to fly through the use of lightweight bones, strong muscles, and feathers.",
                    "The United States is a federal republic consisting of 50 states and a capital district.",
                    "Mount Everest is the highest mountain in the world, reaching an elevation of 29,029 feet above sea level.",
                    "The sun is the center of our solar system and is responsible for providing light and heat to the Earth.",
                ],
            }),
    "temporal":
        NLQueryClassificationData(
            classification_type=NLQueryClassificationType(
                name="temporal",
                categories={
                    "1": BinaryClassificationResultType.SUCCESS,
                    "2": BinaryClassificationResultType.FAILURE,
                },
            ),
            training_sentences={
                "1": [
                    "Cities that are expected to have the highest number of days with temperatures exceeding more than 5 degrees of average in the next 10 years",
                    "Most common type of crime in London in the year 2001",
                    "What was the average number of people per household in San Francisco in the 1980s?",
                    "What was the highest recorded rainfall in Death Valley in the past decade?",
                    "How has the population of New York CIty changed over the past century?",
                    "Towns and cities affected by forest fires in North America since 2000",
                    "What events happened on June 15, 2022?",
                    "How has violent crime in the United States changed over the past decade?",
                    "Population growth in China over the 20th century",
                    "How has the level of carbon dioxide in the atmosphere changed over the past century?",
                    "Which countries have experienced the most extreme weather events in the past decade?",
                    "Countries with the most economic growth in the past five years",
                    "Cities with the highest number of tourist arrivals in the past year",
                    "States with the most significant increase in population in the past decade",
                    "Countries with echnological advancement in the past 20 years",
                    "Cities with housing price appreciation in the past year",
                    "What was the average life expectancy in the United States in the year 1900?",
                    "How has the population of Tokyo changed over the past 200 years?",
                    "What was the average rainfall in the Amazon rainforest since 2000?",
                    "What was the average cost of living in New York City in the 1990s?",
                    "Which countries had the highest per capita GDP growth in the past decade?",
                    "What was the average humidity in the Arctic Circle in the summer of 2025?",
                    "How has the number of wildfires in California changed over the past 50 years?",
                    "What was the most popular tourist destination in Europe in the year 2010?",
                    "What events took place in Rome on July 4th, 2023?",
                    "How has the crime in Chicago changed over the past two decades?",
                    "What was the average lifespan of a person in ancient Egypt?",
                    "How has the population of Paris changed over the past 500 years?",
                    "What was the average cost of a gallon of gas in the United States in the year 1995?",
                    "What was the most common cause of death in the United States in the year 1900?",
                    "What was the average life expectancy in Japan in the year 2050?",
                    "What was the average annual rainfall in the Amazon rainforest after the year 1975?",
                    "What was the most popular sport in the United States in the year 2000?",
                    "How has unemployment in Germany changed over the past 20 years?",
                    "What was the average salary in the United States in the year 1980?",
                    "What was the most popular movie in the United States in the year 2010?",
                    "How has the population of London changed over the past 300 years?",
                    "What was the average cost of a house in the United States in the year 1990?",
                    "In 2021, the temperature in Los Angeles was the highest on record.",
                    "In the year 2030, the population of New York City is projected to be over 9 million.",
                    "In the 1980s, the most common type of crime in London was property crime.",
                    "In the past decade, the highest recorded temperature in Death Valley was 134 degrees Fahrenheit.",
                    "In the year 1900, the average life expectancy in the United States was 47 years.",
                    "In the past century, the population of Tokyo has grown from around 3 million to over 13 million.",
                    "In the year 2000, the average rainfall in the Amazon rainforest was approximately 50 inches.",
                    "In the 1990s, the average cost of living in New York City was significantly higher than it is today.",
                ],
                "2": [
                    "What was the average number of people per household in San Francisco?",
                    "How has the population of New York CIty changed?",
                    "Towns and cities affected by forest fires in North America",
                    "What events happened?",
                    "How has violent crime in the United States changed?",
                    "Population growth in China",
                    "How has the level of carbon dioxide in the atmosphere changed?",
                    "Which countries have experienced weather events?",
                    "Countries with some economic growth",
                    "Cities with large number of tourist arrivals",
                    "States with increase in population",
                    "Countries with the good technological advancement",
                    "Cities had a positive pace of housing price appreciation",
                    "What was the average life expectancy in the United States?",
                    "How has the population of Tokyo changed?",
                    "What was the average rainfall in the Amazon rainforest",
                    "What was the average cost of living in New York City?",
                    "Which countries had decent per capita GDP growth?",
                    "What was the average temperature in the Arctic Circle?",
                    "How has the number of wildfires in California changed?",
                    "popular tourist destination in Europe?",
                    "What events took place in Rome?",
                    "How has the crime in Chicago evolved?",
                    "What was the average lifespan of a person in ancient Egypt?",
                    "What was the average cost of a gallon of gas in the United States?",
                    "common cause of death in the United States?",
                    "What was the average life expectancy in Japan?",
                    "What was the average annual rainfall in the Amazon rainforest?",
                    "What was the national sport in the United States?",
                    "How has unemployment in Germany changed?",
                    "What was the average salary in the United States?",
                    "What was a popular movie in the United States?",
                    "What was the average cost of a house in the United States?",
                    "tthe average temperature in Los Angeles was on record.",
                    "the population of New York City is projected to be over 9 million.",
                    "a common type of crime in London was property crime.",
                    "temperature in Death Valley was 134 degrees Fahrenheit.",
                    "life expectancy in the United States was 47 years.",
                    "the population of Tokyo has grown from around 3 million to over 13 million.",
                    "average rainfall in the Amazon rainforest was approximately 50 inches.",
                    "cost of living in New York City was a lot.",
                ]
            },
        ),
    "contained_in":
        NLQueryClassificationData(
            classification_type=NLQueryClassificationType(
                name="contained_in",
                categories={
                    "1": BinaryClassificationResultType.SUCCESS,
                    "2": BinaryClassificationResultType.FAILURE,
                },
            ),
            training_sentences={
                "1": [
                    "Cities with the lowest crime rates in montana",
                    "poorest states in the USA",
                    "bottom five countries in terms of GDP",
                    "population growth of countries with the least economic development",
                    "California counties with the best education system",
                    "what are the ten worst performing countries on health metrics?",
                    "The smallest towns within the boundaries of Yellowstone National Park",
                    "the most populous neighborhoods in New York City",
                    "the counties with the highest unemployment rates in Michigan",
                    "cities with the highest per capita income in Texas",
                    "states with the high rates of obesity",
                    "the countries with the highest rates of poverty",
                    "the provinces with the highest rates of illiteracy in China",
                    "Countries with the highest literacy rates in Africa",
                    "States with the most National Parks in the United States",
                    "Cities with the highest number of museums in Europe",
                    "Provinces with the highest rates of unemployment in Canada",
                    "Islands with the most biodiversity in the world",
                    "Countries with the highest percentage of renewable energy usage",
                    "Zip codes with the highest median income in the United States",
                    "Capitals with the highest number of tourists each year",
                    "States with the lowest population density in Canada",
                    "Capitals with the highest cost of living in North America",
                    "Places having the most parks and green spaces",
                    "Places with the highest average temperature",
                    "counties within 100 miles of san francisco",
                    "highest temperature across California",
                    # Some examples for "across"
                    "across this state",
                    "income distribution across the country",
                    "povery levels across",
                    "across all counties",
                    "across cities",
                ],
                "2": [
                    "Number of poor women in Mountain View",
                    "Hearing impaired in CA",
                    "What is the median age of residents in Chicago?",
                    "What is the average annual rainfall in Mexico City?",
                    "Coronavirus deaths worldwide",
                    "Average temperature in Toronto",
                    "What is the ethnic makeup of Texas?",
                    "Give me the average number of days with snowfall in Minneapolis",
                    "How many people in Seattle",
                    "Men over retirement age in the USA how many",
                    "How much carbon dioxide per person used in California",
                    "number of disable women in florida",
                    "illeterate people in chicago",
                    "number of hispanic women who are single and illiterate in texas",
                    "monthly temperatures in idaho",
                    "how much does it rain in nevada?",
                    "What was the average number of people per household in San Francisco?",
                    "How has the population of New York CIty changed?",
                    "What events happened?",
                ]
            },
        ),
}
