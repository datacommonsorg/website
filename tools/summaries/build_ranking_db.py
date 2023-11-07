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

import dc
import logging
import sqlite3
import json

from absl import app
from absl import flags

DB_NAME = 'ranking.db'

CREATE_QUERY = '''CREATE TABLE IF NOT EXISTS student(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT NOT NULL);
  '''

# Also need to store unit, per capita, etc
SV = [
      "Count_Person",
      "GrowthRate_Count_Person",
      "Count_Person_PerArea",
      "Median_Age_Person",
      "AirPollutant_Cancer_Risk"
]

logging.getLogger().setLevel(logging.INFO)

def download_rankings():
  # response = dc.related_place("geoId/3651000",
  #                             SV,
  #                             ancestor="country/USA",
  #                             per_capita=False)
  response = dc.place_rankings(SV, 'County', 'country/USA', False)
  # response = dc.place_rankings(SV, 'City', 'geoId/06081', False)
  print(json.dumps(response, indent=2))


def store_rankings():
  try:
    conn = sqlite3.connect(dbName)
    cursor = conn.cursor()
    logging.debug("Database created!")

    cursor.execute(CREATE_QUERY)
    logging.debug("Table created!")

  except Exception as e:
    logging.error("Error with db: ", e)
    if conn:
      conn.close()



def main(_):
  download_rankings()


if __name__ == "__main__":
  app.run(main)
