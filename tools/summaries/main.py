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

from itertools import starmap
import json
import logging
import multiprocessing
import os
import sys

from absl import app
from absl import flags
import dc
import palm

FLAGS = flags.FLAGS

flags.DEFINE_boolean('save_prompts', False, 'Saves prompts to output file')
flags.DEFINE_string('places_in_file', 'places.json',
                    'Place input file to generate summaries for')
flags.DEFINE_string('sv_in_file', 'stat_vars.json',
                    'Stat var list to process rankings from')
flags.DEFINE_string('summary_out_file',
                    '../../server/config/summaries/place_summaries.json',
                    'Summary output file')
flags.DEFINE_integer('num_processes', 1, 'Number of concurrent processes')

logging.getLogger().setLevel(logging.INFO)


def get_and_write_ranking_summaries():
  places = read_json(FLAGS.places_in_file)
  svs = read_json(FLAGS.sv_in_file)
  summaries = get_ranking_summaries(places, svs)
  write_json(summaries, FLAGS.summary_out_file)


def get_ranking_summaries(places_by_type: dict, svs_by_category: dict):
  summaries = {}
  # NOTE: Only processing variables from Demographics list
  sv_list = [config['sv'] for config in svs_by_category['Demographics']]
  for place_type, places in places_by_type.items():
    unordered_summaries = {}
    tuples = list(
        starmap(
            lambda dcid, place_name: (dcid, place_name, place_type, sv_list),
            places.items()))
    with multiprocessing.Pool(processes=FLAGS.num_processes,
                              initializer=parse_flags) as pool:
      for dcid, name, (prompt, summary) in pool.imap_unordered(
          get_ranking_summary_with_tuple, tuples):
        data = {"summary": summary}
        if FLAGS.save_prompts:
          data["name"] = name
          data["prompt"] = prompt
        unordered_summaries[dcid] = data

    for dcid, _, _, _ in tuples:
      summaries[dcid] = unordered_summaries[dcid]
  return summaries


def get_ranking_summary_with_tuple(tuple):
  dcid, name, place_type_plural, sv_list = tuple
  return (dcid, name, get_ranking_summary(dcid, name, place_type_plural,
                                          sv_list))


def get_ranking_summary(dcid: str, place_name: str, place_type: str, sv_list):
  ranking_data = dc.get_ranking_data(dcid, sv_list)
  data_tables = dc.get_data_series(dcid, sv_list)
  # TODO: Insert SV selection step here
  prompt, summary = palm.get_summary(place_name, place_type, sv_list,
                                     ranking_data, data_tables)
  logging.info("Ranking summary for: %s (%s)\n%s", dcid, place_name, summary)
  return prompt, summary


def read_json(file_name: str):
  with open(file_name, "r") as f:
    return json.load(f)


def write_json(data, file_name: str):
  with open(file_name, "w") as f:
    json.dump(data, f, indent=True)


def parse_flags():
  flags.FLAGS(sys.argv)


def main(_):
  get_and_write_ranking_summaries()


if __name__ == "__main__":
  app.run(main)
