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

import logging
import os
import time

import datacommons as dc

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


def updateRobotTxt():
  with open('../../static/robots.txt', 'w') as robot:
    for f in os.listdir(SAVE_PATH):
      robot.write('Sitemap: https://datacommons.org/sitemap/{}\n'.format(f))


def main():
  dc.set_api_key('noop')
  for place_type in PLACES:
    write_place_url(place_type)
  updateRobotTxt()


if __name__ == "__main__":
  main()
