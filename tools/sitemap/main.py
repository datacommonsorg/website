# Copyright 2020 Google LLC
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

import csv
import logging
import os
import time
from typing import List

import datacommons as dc
import requests

logging.getLogger().setLevel(logging.INFO)

PLACES = [
    'CensusZipCodeTabulationArea',
    'City',
    'County',
    'CensusTract',
    'SchoolDistrict',
    'CensusCountyDivision',
    'CongressionalDistrict',
    'CensusCoreBasedStatisticalArea',
    'HighSchoolDistrict',
    'ElementarySchoolDistrict',
    'State',
    'Country',
    'CommutingZone',
    'EurostatNUTS1',
    'EurostatNUTS2',
    'EurostatNUTS3',
    'StateComponent',
    'AdministrativeArea1',
    'AdministrativeArea2',
    'AdministrativeArea3',
    'AdministrativeArea4',
    'Province',
    'Continent',
]

SITE_PREFIX = 'https://datacommons.org/place/'
SAVE_PATH = '../../static/sitemap/'

# each file can contain up to 50,000 lines
# https://www.sitemaps.org/protocol.html#otherformats
LINE_LIMIT = 45000

# Name for sitemap with priority places to test
PRIORITY_PLACE_SITEMAP = "PriorityPlaces.0.txt"

# CSV storing BQ query results for queries that are too heavy for sparql
BQ_CSV = "cities_with_population_over_500k.csv"


# Generator to yield chunks from a list
def chunks(lst, n):
  """Yield successive n-sized chunks from lst."""
  for i in range(0, len(lst), n):
    yield lst[i:i + n]


def write_place_url(place_type):
  logging.info(place_type)
  sparql = '''
      SELECT ?dcid
      WHERE {{
        ?a typeOf {} .
        ?a dcid ?dcid
      }}
      Order By ASC(?dcid)
    '''.format(place_type)
  try:
    data = dc.query(sparql)
  except Exception:
    logging.exception('Got an error while query %s', place_type)
    return
  index = 0
  for places in chunks(data, LINE_LIMIT):
    file_name = '{}{}.{}.txt'.format(SAVE_PATH, place_type, index)
    with open(file_name, 'w') as f:
      logging.info('writing to file: %s', file_name)
      for p in places:
        f.write(SITE_PREFIX + p['?dcid'] + '\n')
    index += 1
    time.sleep(10)


def get_us_states() -> List[str]:
  """Get list of DCIDs corresponding to US states and Washington DC"""
  # Get US states and Washington DC
  sparql = '''
    SELECT ?dcid
    WHERE {
      ?a typeOf State .
      ?a dcid ?dcid
    }
    Order By ASC(?dcid)
    LIMIT 51
  '''
  dcids = []
  try:
    state_data = dc.query(sparql)
    for state in state_data:
      if '?dcid' in state:
        dcids.append(state['?dcid'])
  except Exception:
    logging.exception('Got an error while querying for US states')
  return dcids


def get_global_cities_with_population_over_500k() -> List[str]:
  """Get DCIDs of global cities with population over 500k"""
  dcids = []
  with open(BQ_CSV) as f:
    cities = csv.DictReader(f)
    for city in cities:
      # Filter out West Berlin, which does not have charts and because it no
      # longer exists, it will not get any new charts added.
      # TODO (juliawu): This is a temporary change to cleanup our sitemaps
      #                 while the node in the KG is being fixed. Once the
      #                 KG is updated, replace this fix with an updated
      #                 BQ query which filters out nodes with a dissolutionDate.
      if 'dcid' in city and city['dcid'] != "nuts/DE301":
        dcids.append(city['dcid'])
  return dcids


def get_top_100_us_cities() -> List[str]:
  """Get DCIDs of top 100 US cities by population"""
  dcids = []
  response = requests.get(
      "https://datacommons.org/api/ranking/Count_Person/City/country/USA")
  city_ranking_data = response.json().get("Count_Person",
                                          {}).get("rankTop1000",
                                                  {}).get("info", [])
  for city in city_ranking_data[:100]:
    if 'placeDcid' in city:
      dcids.append(city['placeDcid'])
  return dcids


def write_priority_places_sitemap() -> None:
  """Write a custom sitemap for SEO testing.
  
  Writes a sitemap with 50 US states, Washington D.C., the top 100
  US cities by population, and cities around the world with a population of
  500k or greater.
  """
  dcids = get_us_states()
  dcids += get_top_100_us_cities()
  dcids += get_global_cities_with_population_over_500k()

  # Write to file
  sitemap_location = os.path.join(SAVE_PATH, PRIORITY_PLACE_SITEMAP)
  with open(sitemap_location, "w") as f:
    for place_dcid in dcids:
      f.write(SITE_PREFIX + place_dcid + '\n')


def updateRobotTxt():
  with open('../../static/robots.txt', 'w') as robot:
    for f in os.listdir(SAVE_PATH):
      robot.write('Sitemap: https://datacommons.org/sitemap/{}\n'.format(f))


def main():
  dc.set_api_key('noop')
  for place_type in PLACES:
    write_place_url(place_type)
  write_priority_places_sitemap()
  updateRobotTxt()


if __name__ == "__main__":
  main()
