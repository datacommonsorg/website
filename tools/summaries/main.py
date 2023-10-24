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
_SUMMARIES_CSV_FILE = "summaries.csv"
_NUM_PARALLEL_PROCESSES = 8

logging.getLogger().setLevel(logging.INFO)


def get_and_write_ranking_summaries():
  places = read_json(_PLACE_JSON_FILE)
  summaries = get_ranking_summaries(places)
  write_json(summaries, _SUMMARIES_JSON_FILE)
  write_csv(summaries, _SUMMARIES_CSV_FILE)


def get_ranking_summaries(places_by_type: dict):
  summaries = {}
  for place_type, places in places_by_type.items():
    unordered_summaries = {}
    tuples = list(starmap(lambda dcid, place_name: (dcid, place_name, place_type), places.items()))
    for tuple in tuples:
      dcid, name, (prompt, summary) = get_ranking_summary_with_tuple(tuple)
      unordered_summaries[dcid] = {"name": name, "prompt": prompt,  "summary": summary}
    # with multiprocessing.Pool(processes=_NUM_PARALLEL_PROCESSES) as pool:
    #   for dcid, name, summary in pool.imap_unordered(
    #       get_ranking_summary_with_tuple, tuples):
    #     unordered_summaries[dcid] = {"name": name, "summary": summary}

    for dcid, _, _ in tuples:
      summaries[dcid] = unordered_summaries[dcid]
  return summaries


def get_ranking_summary_with_tuple(tuple):
  dcid, name, place_type_plural = tuple
  return (dcid, name, get_ranking_summary(dcid, name, place_type_plural))


def get_ranking_summary(dcid: str, place_name: str, place_type: str):
  logging.info("Getting ranking summary for : %s (%s)", dcid, place_name)
  csv = dc.get_ranking_csv(dcid, place_type)
  # logging.info(csvs)
  data_tables = dc.get_data_series(dcid, place_name)
  prompt, summary = get_summary(place_name, place_type, csv, data_tables)
  logging.info("Got ranking summary for: %s (%s)\n%s", dcid, place_name, summary)
  return prompt, summary


def read_json(file_name: str):
  with open(file_name, "r") as f:
    return json.load(f)


def write_json(data, file_name: str):
  with open(file_name, "w") as f:
    json.dump(data, f, indent=True)


def write_csv(data, file_name: str):
  columns = ["dcid", "name", "summary"]
  rows = []
  for dcid, summary in data.items():
    rows.append([dcid, summary["name"], summary["summary"]])

  with open(file_name, "w") as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    writer.writerows(rows)


def main(_):
  get_and_write_ranking_summaries()


if __name__ == "__main__":
  app.run(main)
