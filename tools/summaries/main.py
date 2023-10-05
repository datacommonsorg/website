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

from dc import get_ranking_csv
from llm import get_summary

logging.getLogger().setLevel(logging.INFO)

_PLACE_JSON_FILE = "places.json"
_SUMMARIES_JSON_FILE = "summaries.json"
_SUMMARIES_CSV_FILE = "summaries.csv"


def get_and_write_ranking_summaries():
  places = read_json(_PLACE_JSON_FILE)
  summaries = get_ranking_summaries(places)
  write_json(summaries, _SUMMARIES_JSON_FILE)
  write_csv(summaries, _SUMMARIES_CSV_FILE)


def get_ranking_summaries(places: dict):
  summaries = {}
  for dcid, name in places.items():
    # TODO: parallelize
    logging.info("Getting ranking summary for: %s (%s)", dcid, name)
    summary = get_ranking_summary(dcid, name)
    logging.info("Got ranking summary for: %s (%s)\n%s", dcid, name, summary)
    summaries[dcid] = {"name": name, "summary": summary}
  return summaries


def get_ranking_summary(dcid: str, name: str):
  csv = get_ranking_csv(dcid)
  return get_summary(name, csv)


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


get_and_write_ranking_summaries()
