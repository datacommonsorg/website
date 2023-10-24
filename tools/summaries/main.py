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

import csv
import json
import logging
import multiprocessing
import os
import dc

from absl import app
from itertools import starmap
from palm import get_summary

_OUTPUT_DIR = "../../server/config/summaries"
_PLACE_JSON_FILE = os.path.join(_OUTPUT_DIR, "places-short.json")
_SUMMARIES_JSON_FILE = os.path.join(_OUTPUT_DIR, "summaries-short.json")
_NUM_PARALLEL_PROCESSES = 1

logging.getLogger().setLevel(logging.INFO)


def get_and_write_ranking_summaries():
  places = read_json(_PLACE_JSON_FILE)
  summaries = get_ranking_summaries(places)
  write_json(summaries, _SUMMARIES_JSON_FILE)


def get_ranking_summaries(places_by_type: dict):
  summaries = {}
  for place_type, places in places_by_type.items():
    unordered_summaries = {}
    tuples = list(starmap(lambda dcid, place_name: (dcid, place_name, place_type), places.items()))
    with multiprocessing.Pool(processes=_NUM_PARALLEL_PROCESSES) as pool:
      for dcid, name, (prompt, summary) in pool.imap_unordered(
          get_ranking_summary_with_tuple, tuples):
        unordered_summaries[dcid] = {"name": name, "prompt": prompt, "summary": summary}

    for dcid, _, _ in tuples:
      summaries[dcid] = unordered_summaries[dcid]
  return summaries


def get_ranking_summary_with_tuple(tuple):
  dcid, name, place_type_plural = tuple
  return (dcid, name, get_ranking_summary(dcid, name, place_type_plural))


def get_ranking_summary(dcid: str, place_name: str, place_type: str):
  ranking_data = dc.get_ranking_data(dcid, place_type)
  data_tables = dc.get_data_series(dcid, place_name)
  prompt, summary = get_summary(place_name, place_type, ranking_data, data_tables)
  logging.info("Ranking summary for: %s (%s)\n%s", dcid, place_name, summary)
  return prompt, summary


def read_json(file_name: str):
  with open(file_name, "r") as f:
    return json.load(f)


def write_json(data, file_name: str):
  with open(file_name, "w") as f:
    json.dump(data, f, indent=True)


def main(_):
  get_and_write_ranking_summaries()


if __name__ == "__main__":
  app.run(main)
