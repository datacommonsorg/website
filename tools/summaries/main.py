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
from palm import get_summary as palm_get_summary
from openai import get_summary as openai_get_summary

logging.getLogger().setLevel(logging.INFO)

_PLACE_JSON_FILE = "places.json"
_SUMMARIES_JSON_FILE = "summaries.json"
_SUMMARIES_CSV_FILE = "summaries.csv"


def get_and_write_ranking_summaries():
  places = read_json(_PLACE_JSON_FILE)
  summaries = get_ranking_summaries(places, palm_get_summary, "palm")
  write_json(summaries, _SUMMARIES_JSON_FILE)
  write_csv(summaries, _SUMMARIES_CSV_FILE)


def get_ranking_summaries(places: dict, summary_func, llm_name):
  summaries = {}
  for dcid, name in places.items():
    # TODO: parallelize
    logging.info("Getting ranking summary (using %s) for : %s (%s)", llm_name, dcid, name)
    summary = get_ranking_summary(dcid, name, summary_func)
    logging.info("Got ranking summary (using %s) for: %s (%s)\n%s", llm_name, dcid, name, summary)
    summaries[dcid] = {"name": name, "summary": summary}
  return summaries


def get_ranking_summary(dcid: str, name: str, summary_func):
  csv = get_ranking_csv(dcid)
  return summary_func(name, csv)


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


def compare():
  places = read_json(_PLACE_JSON_FILE)
  palm_summaries = get_ranking_summaries(places, palm_get_summary, "palm")
  openai_summaries = get_ranking_summaries(places, openai_get_summary, "openai")
  
  columns = ["dcid", "name", "palm_summary", "openai_summary"]
  rows = []
  for dcid, palm_summary in palm_summaries.items():
    openai_summary = openai_summaries.get(dcid, {}).get("summary", "")
    rows.append([dcid, palm_summary["name"], palm_summary["summary"], openai_summary])

  with open(_SUMMARIES_CSV_FILE, "w") as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    writer.writerows(rows)



# get_and_write_ranking_summaries()
compare()
