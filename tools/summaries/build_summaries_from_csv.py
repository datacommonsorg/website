# Copyright 2024 Google LLC
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
"""Convert a csv with summaries to a JSON file for the server

Used for parsing the output of LLM editing (like from Bard).
"""

import json
import csv

from typing import Dict


def read_csv_to_dict(tsv_path: str,
                     place_column_name='dcid',
                     summary_column_name='summary',
                     delimiter=',') -> Dict:
  """Read a TSV file into a place summary dictionary"""
  summaries = {}
  with open(tsv_path) as tsv:
    reader = csv.DictReader(tsv, delimiter=delimiter)
    for row in reader:
      place = row.get(place_column_name)
      summary = row.get(summary_column_name)
      if place and summary:
        summaries[place] = {"summary": summary}
  return summaries


def write_summaries(summaries: Dict, output_path: str) -> None:
  """Write a place summary dictionary to a JSON file"""
  with open(output_path, 'w') as out_f:
    json.dump(summaries, out_f)


def process_csv(tsv_path: str,
                output_path: str,
                place_column_name='dcid',
                summary_column_name='summary',
                delimiter=',') -> None:
  """Convert csv to a summary json file"""
  summaries = read_csv_to_dict(tsv_path, place_column_name, summary_column_name,
                               delimiter)
  write_summaries(summaries, output_path)


if __name__ == "__main__":
  tsv_path = "priority-places-bard.csv"
  save_path = "../../server/config/summaries/place_summaries.json"
  place_column_name = 'DCID'
  summary_column_name = 'Strict'
  delimiter = '\t'

  process_csv(tsv_path=tsv_path,
              output_path=save_path,
              place_column_name='DCID',
              summary_column_name='Strict',
              delimiter=delimiter)
