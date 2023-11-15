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

import logging
import os

from absl import app
import gen_ai
import pandas as pd

_VARIATIONS_FILE_NAME = "variations.csv"
_VARIATIONS = {
    "6_year_old":
        "like a 6 year old",
    "indian_mom":
        "like how an Indian mom would ask on Google",
    "american_soldier":
        "like how an American soldier would ask on Google",
    "chinese_diplomat":
        "like how a Chinese diplomat would ask on Google",
    "social_worker":
        "like how a 23 year old social worker would ask on Google",
    "businesswoman":
        "like how a businesswoman would ask on Google using different words",
}

logging.getLogger().setLevel(logging.INFO)


def fetch_and_write_variations(input_file,
                               output_dir,
                               variations: dict = _VARIATIONS):
  os.makedirs(output_dir, exist_ok=True)
  output_file = os.path.join(output_dir, _VARIATIONS_FILE_NAME)

  df = pd.read_csv(input_file)
  queries = df.iloc[:, 0].tolist()

  for variation_name, variation in variations.items():
    logging.info("Fetching queries for variation: %s", variation_name)
    alt_queries = gen_ai.fetch_alt_queries(queries, variation)
    df[variation_name] = list(alt_queries.values())

    # We write to file after each variation so that a portion of the CSV is written
    # even if there are errors subsequently.
    logging.info("Writing CSV with variation %s: %s", variation_name,
                 output_file)
    df.to_csv(output_file, index=False)


def main(_):
  fetch_and_write_variations("data/input/queries.csv", "data/output")


if __name__ == "__main__":
  app.run(main)
