# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
'''Combine place summaries from multiple jsons into one place summary json'''

import logging
from typing import List

import click
from tools.summaries import utils


@click.command()
@click.argument('files', nargs=-1)
def main(files: List[str]):
  logging.getLogger().setLevel(logging.INFO)
  # Load all summaries
  summaries = []
  for file in files:
    summaries.append(utils.load_summaries(file))

  # Combine into one json
  combined_summaries = utils.combine_summaries(summaries)
  sharded_summaries = utils.shard_summaries(combined_summaries)

  # Write to file
  utils.write_shards_to_files(sharded_summaries)


if __name__ == '__main__':
  main()
