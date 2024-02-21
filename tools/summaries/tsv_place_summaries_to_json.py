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
"""Convert a tsv with summaries to a JSON file for the server

Used for parsing the output of LLM editing (like from Bard).
"""
import csv
from typing import Dict

import click

from tools.summaries import utils


def read_tsv_to_dict(tsv_path: str,
                     place_column_name='dcid',
                     summary_column_name='summary',
                     delimiter='\t') -> Dict:
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


@click.command()
@click.argument('tsv_path')
@click.option('--output_path',
              default='output_summaries.json',
              help="file to write summaries to")
@click.option('--place_column_name',
              default='dcid',
              help='name of column containing place dcids')
@click.option('--summary_column_name',
              default='summary',
              help='name of column containing summary text')
@click.option('--delimiter',
              default='\t',
              help='character used to delimit columns (Default: Tab)')
def main(tsv_path: str, output_path: str, place_column_name: str,
         summary_column_name: str, delimiter: str) -> None:
  summaries = read_tsv_to_dict(tsv_path, place_column_name, summary_column_name,
                               delimiter)
  utils.write_summaries_to_file(summaries, output_path)


if __name__ == "__main__":
  main()
