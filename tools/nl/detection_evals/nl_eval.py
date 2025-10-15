# Copyright 2025 Google LLC
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
from typing import Dict, List

from absl import app
from absl import flags
from eval_models import *
import pandas as pd
from scape import scrape_query
from score import compute_scores
from utils import csv_to_df
from utils import df_to_csv
from utils import models_to_csv
from utils import scores_path
from utils import scrapes_path
from utils import summary_path

FLAGS = flags.FLAGS

flags.DEFINE_string(
    "runtime", "local",
    "The runtime environment for the evaluation. Options are local, dev, prod.")

flags.DEFINE_string(
    "detector", "hybrid",
    "The detector to run the evaluation. Options are heuristic, hybrid, llm.")

flags.DEFINE_string("golden_path", "./golden_eval/goldens.csv",
                    "The golden curation to compare with.")

flags.DEFINE_string("eval_folder", "./eval_result",
                    "The evaluation output folder.")

flags.DEFINE_string("eval_file_suffix", "",
                    "The evaluation output file suffix.")

flags.DEFINE_string("description", "", "Detail for the evaluation to log.")

flags.DEFINE_string("change_log", "", "Changes for the evluation to log.")

_RUNTIME_HOST = {
    'local': 'http://localhost:8080',
    'dev': 'https://dev.datacommons.org',
    'prod': 'https://datacommons.org'
}


def _scrape_queryset(queryset: Dict[int, str], detector: str,
                     runtime_host: str) -> List[NlApiScrape]:
  full_scrape = []

  for id, query in queryset.items():
    response = scrape_query(id, query, runtime_host, detector)
    full_scrape.append(response)

  return full_scrape


def _scrape_to_scores(golden_df: pd.DataFrame, golden_path: str,
                      scrape_path: str, score_path: str, summary_path: str,
                      description: str, change_log: str):
  scrape_df = csv_to_df(scrape_path, NlApiScrape)
  score_df = compute_scores(golden_df, scrape_df)
  df_to_csv(score_path, score_df, NlQueryEvalScore)

  summary = pd.DataFrame()
  cols = [
      'total_score', 'date_score', 'place_score', 'variable_score',
      'variable_precision', 'variable_recall'
  ]
  summary['overall'] = score_df[cols].mean().round(3)
  summary['stable'] = score_df[score_df['golden_type'] ==
                               'STABLE'][cols].mean().round(3)
  summary['aspirational'] = score_df[score_df['golden_type'] ==
                                     'ASPIRATIONAL'][cols].mean().round(3)

  summary.to_csv(summary_path)

  metadata = EvalMetadata(golden_epoch=golden_path,
                          scrape_epoch=scrape_path,
                          score_epoch=score_path,
                          description=description,
                          change_log=change_log)

  # 6. Append metadata to the CSV
  with open(summary_path, 'a') as f:  # Use 'a' for append mode
    f.write(",\n")  # Add a newline for separation
    f.write(",\n")  # Add a newline for separation
    f.write("# --- METADATA ---\n")  # Optional: a clear separator line
    for field_name, value in metadata.model_dump().items(
    ):  # Use model_dump() for Pydantic v2+
      if value is not None:  # Only write fields that have a value
        # Format as key=value or key,value. Using comma for CSV compatibility
        f.write(f"{field_name},{value}\n")

  return


def run_nl_eval(golden_path: str, eval_folder: str, eval_file_suffix: str,
                detector: str, runtime_host: str, description: str,
                change_log: str):
  goldens_df = csv_to_df(golden_path, NlGolden)
  queryset = dict(
      zip(goldens_df['id'].astype(int), goldens_df['query'].astype(str)))
  full_scrape = _scrape_queryset(queryset, detector, runtime_host)
  logging.info(f'num queries scraped: {len(full_scrape)}')

  scrape_path = scrapes_path(eval_folder, eval_file_suffix)
  logging.info(f'scrape path: {scrape_path}')

  score_path = scores_path(eval_folder, eval_file_suffix)
  logging.info(f'score path: {score_path}')

  smry_path = summary_path(eval_folder, eval_file_suffix)
  logging.info(f'summary path: {smry_path}')

  models_to_csv(scrape_path, full_scrape)

  _scrape_to_scores(goldens_df, golden_path, scrape_path, score_path, smry_path,
                    description, change_log)

  return


def main(_):
  detector = FLAGS.detector
  runtime = FLAGS.runtime
  runtime_host = _RUNTIME_HOST[runtime]
  golden_path = FLAGS.golden_path
  eval_folder = FLAGS.eval_folder
  eval_file_suffix = FLAGS.eval_file_suffix
  description = FLAGS.description
  change_log = FLAGS.change_log

  logging.info('trigger run_nl_eval.')
  run_nl_eval(golden_path, eval_folder, eval_file_suffix, detector,
              runtime_host, description, change_log)
  logging.info('finish NL Eval and results generation.')


if __name__ == "__main__":
  app.run(main)
