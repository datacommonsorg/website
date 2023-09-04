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
from datetime import datetime
from enum import StrEnum
import io
import json
import logging
import multiprocessing
import os
import re
import urllib.parse

from absl import app
from absl import flags
import requests

FLAGS = flags.FLAGS

INPUT_DIR = "input"
OUTPUT_DIR = "output"
REPORTS_DIR = "reports"


class Mode:
  RUN_ALL = "run_all"
  RUN_QUERIES = "run_queries"
  RUN_QUERY = "run_query"
  GENERATE_REPORTS = "generate_reports"
  COMPUTE_FILE_STATS = "compute_file_stats"


flags.DEFINE_string(
    "mode",
    Mode.RUN_ALL,
    f"Specify one of the following modes: {Mode.RUN_ALL}, {Mode.RUN_QUERIES}, {Mode.RUN_QUERY}, {Mode.GENERATE_REPORTS}, {Mode.COMPUTE_FILE_STATS}",
)

flags.DEFINE_string(
    "input_dir", INPUT_DIR,
    f"The input directory that contains the query TSVs when using {Mode.RUN_QUERIES} mode."
)

flags.DEFINE_string(
    "output_dir", OUTPUT_DIR,
    f"The output directory where results and reports will be persisted.")

flags.DEFINE_string("base_url", "https://dev.datacommons.org",
                    f"The base URL of the API server.")

flags.DEFINE_string("query", None,
                    f"The query to be run in {Mode.RUN_QUERY} mode.")

flags.DEFINE_string(
    "results_csv_file", None,
    f"The results csv file to be inspected in {Mode.COMPUTE_FILE_STATS} mode.")


class ResultStatus(StrEnum):
  UNKNOWN = "Unknown"
  REQUEST_FAILED = "Request Failed"
  TIMED_OUT = "Timed Out"
  NO_RESULTS = "No Results"
  PLACE_ONLY = "Place Only"
  HAS_RESULTS = "Has Results"


STATUS_WITH_RESULTS = set([ResultStatus.HAS_RESULTS, ResultStatus.PLACE_ONLY])


class Result:
  query: str
  url: str
  status: ResultStatus
  result_titles: list[str]
  result_places: list[str]
  llm_detection_type: str
  llm_response: str
  sv_matching: str

  def __init__(self,
               query: str,
               url: str,
               status: ResultStatus = ResultStatus.UNKNOWN) -> None:
    self.query = query
    self.url = url
    self.status = status
    self.result_titles = []
    self.result_places = []
    self.llm_detection_type = ''
    self.llm_response = ''
    self.sv_matching = ''

  @classmethod
  def from_csv_row(cls, csv_row: dict) -> 'Result':
    result = cls("", "")
    result.query = csv_row.get("query", "")
    result.url = csv_row.get("url", "")
    result.status = ResultStatus(
        csv_row.get("status", str(ResultStatus.UNKNOWN)))
    result.result_titles = csv_row.get("result_titles", []).split("\n")
    result.result_places = csv_row.get("result_places", []).split("\n")
    result.llm_detection_type = csv_row.get("llm_detection_type", "")
    result.llm_response = csv_row.get("llm_response", "")
    result.sv_matching = csv_row.get("sv_matching", "")

    return result

  def to_csv_row(self) -> dict:
    row = {
        "query": self.query,
        "url": self.url,
        "status": str(self.status),
        "result_titles": "\n".join(self.result_titles),
        "result_places": "\n".join(self.result_places),
        "llm_detection_type": self.llm_detection_type,
        "llm_response": self.llm_response,
        "sv_matching": self.sv_matching
    }
    return row

  @staticmethod
  def get_csv_columns() -> list[str]:
    return [
        "query", "url", "status", "result_titles", "result_places",
        "llm_detection_type", "llm_response", "sv_matching"
    ]

  def __str__(self) -> str:
    return f"{self.query}, {self.status}, {len(self.result_titles)}, {len(self.result_places)}"


class StatsResult:
  status_counts: dict[ResultStatus, int]
  llm_detection_type_counts: dict[str, int]

  def __init__(self) -> None:
    self.status_counts = dict((status, 0) for status in ResultStatus)
    self.llm_detection_type_counts = {}

  def inspect_result(self, result: Result) -> None:
    self.status_counts[result.status] += 1
    if result.status in STATUS_WITH_RESULTS:
      self.llm_detection_type_counts[
          result.llm_detection_type] = self.llm_detection_type_counts.get(
              result.llm_detection_type, 0) + 1

  def to_str_rows(self) -> list[str]:
    rows = []

    # status stats
    rows.append("====STATUS STATS====")
    rows.append(f"TOTAL: {str(sum(self.status_counts.values()))}")
    for status, count in self.status_counts.items():
      rows.append(f"{str(status)}: {count}")
    rows.append("")

    # llm detection type stats
    rows.append("====LLM DETECTION TYPE STATS (FOR QUERIES WITH RESULTS)====")
    rows.append(f"TOTAL: {str(sum(self.llm_detection_type_counts.values()))}")
    for llm_detection_type, count in self.llm_detection_type_counts.items():
      rows.append(f"{llm_detection_type}: {count}")

    return rows

  def __str__(self) -> str:
    return "\n".join(self.to_str_rows())


class ResultsFileWriter:
  file_path: str
  file: io.TextIOWrapper
  csv_writer: csv.DictWriter

  def __init__(self, file_key, file_dir: str) -> None:
    file_name = f"{re.sub('[^0-9a-zA-Z]', '', file_key)}.csv"
    self.file_path = os.path.join(file_dir, file_name)
    logging.info("Writing %s results to file: %s", file_key, self.file_path)
    self.file = open(self.file_path, "w", newline="")
    self.csv_writer = csv.DictWriter(self.file,
                                     fieldnames=Result.get_csv_columns(),
                                     lineterminator="\n")
    self.csv_writer.writeheader()

  def write(self, result: Result) -> None:
    self.csv_writer.writerow(result.to_csv_row())

  def close(self) -> None:
    logging.info("Closing file: %s", self.file_path)
    self.file.close()


class AdversarialQueriesTest:

  def __init__(self, base_url) -> None:
    self.base_url = base_url

  def generate_reports(self, output_dir: str) -> None:
    reports_dir = os.path.join(output_dir, REPORTS_DIR)
    report_writers: dict[str, ResultsFileWriter] = {}
    stats = StatsResult()

    for file_name in sorted(os.listdir(output_dir)):
      if file_name.endswith('.csv'):
        results_csv_file_path = os.path.join(output_dir, file_name)
        self.compute_stats_from_file(results_csv_file_path,
                                     stats,
                                     reports_dir=reports_dir,
                                     report_writers=report_writers)

    # write stats overview
    stats_overview_file = os.path.join(reports_dir, "stats-overview.txt")
    logging.info("Writing stats overview to file: %s", stats_overview_file)
    with open(stats_overview_file, "w", newline="") as out:
      out.write(str(stats))

    # close writers
    for writer in report_writers.values():
      writer.close()

  def compute_stats_from_file(
      self,
      results_csv_file: str,
      stats: StatsResult,
      reports_dir: str = None,
      report_writers: dict[str, ResultsFileWriter] = None) -> StatsResult:
    logging.info("Reading results csv file: %s", results_csv_file)
    with open(results_csv_file, "r") as file:
      for csv_row in csv.DictReader(file):
        result = Result.from_csv_row(csv_row)
        # logging.info("Inspecting: %s", result)
        stats.inspect_result(result)
        self.write_result_to_report_files(result,
                                          reports_dir=reports_dir,
                                          report_writers=report_writers)

    return stats

  def write_result_to_report_files(
      self, result: Result, reports_dir: str,
      report_writers: dict[str, csv.DictWriter]) -> None:
    if not reports_dir or report_writers is None:
      return
    if result.status in STATUS_WITH_RESULTS:
      self.write_result_to_report_file(result=result,
                                       report_file_key=str(result.status),
                                       reports_dir=reports_dir,
                                       report_writers=report_writers)
      if result.llm_detection_type:
        self.write_result_to_report_file(
            result=result,
            report_file_key=result.llm_detection_type,
            reports_dir=reports_dir,
            report_writers=report_writers)

  def write_result_to_report_file(self, result: Result, report_file_key,
                                  reports_dir: str,
                                  report_writers: dict[str, ResultsFileWriter]):
    writer = report_writers.get(report_file_key)
    if not writer:
      writer = ResultsFileWriter(file_key=report_file_key, file_dir=reports_dir)
      report_writers[report_file_key] = writer
    writer.write(result)

  def run_queries_from_files_in_dir(self, input_dir: str, output_dir: str):
    for file_name in sorted(os.listdir(input_dir)):
      if file_name.endswith('.tsv'):
        input_path = os.path.join(input_dir, file_name)
        output_path = os.path.join(output_dir, f"{file_name[0:-4]}.csv")
        self.run_queries_from_file(input_path, output_path)

  def run_queries_from_file(self, input_csv_file, output_csv_file):
    rows = read_tsv(input_csv_file)
    queries = [row[0] for row in rows]
    with open(output_csv_file, "w", newline="") as out:
      logging.info("Writing results to: %s", output_csv_file)
      csv_writer = csv.DictWriter(out,
                                  fieldnames=Result.get_csv_columns(),
                                  lineterminator="\n")
      csv_writer.writeheader()
      with multiprocessing.Pool() as pool:
        for result in pool.imap_unordered(self.run_query, queries):
          csv_writer.writerow(result.to_csv_row())

  def run_query(self, query: str) -> Result:
    result = unknown_result(
        query, self.base_url + f'/explore#q={urllib.parse.quote_plus(query)}')
    logging.info("Running: %s", query)
    if not query:
      logging.info(result)
      return result

    resp = None
    try:
      resp = requests.post(self.base_url +
                           f'/api/explore/detect-and-fulfill?q={query}',
                           json={
                               'contextHistory': {},
                               'dc': '',
                           },
                           timeout=30)
    except requests.exceptions.ReadTimeout:
      result.status = ResultStatus.TIMED_OUT
      logging.info(result)
      return result

    if resp.status_code != 200:
      result.status = ResultStatus.REQUEST_FAILED
      logging.info(result)
      return result

    response_to_result(resp.json(), result=result)
    logging.info(result)
    return result


def response_to_result(response: dict, result: Result):

  config = response.get("config")
  if config is None:
    result.status = ResultStatus.NO_RESULTS
    return

  # test for place overview tile
  has_place_overview_tile = False

  # populate result titles
  tiles = []
  svs_used = set()
  for category in config.get("categories", []):
    for sv_spec in category.get("statVarSpec", {}).values():
      sv_used = sv_spec.get("statVar", "")
      if sv_used:
        svs_used.add(sv_used)

    for block in category.get("blocks", []):
      for column in block.get("columns", []):
        tiles = column.get("tiles", [])
        for tile in tiles:
          if not has_place_overview_tile and tile.get("type",
                                                      "") == "PLACE_OVERVIEW":
            has_place_overview_tile = tile.get("type", "") == "PLACE_OVERVIEW"

          title = tile.get("title", "")
          if title:
            result.result_titles.append(title)

  # populate result places
  for context in response.get("context", []):
    for place in context.get("places", []):
      place_name = place.get("name", "")
      if place_name:
        result.result_places.append(place_name)

  # populate llm signals
  debug = response.get("debug", {})
  result.llm_detection_type = debug.get("detection_type", "")
  llm_response = debug.get("query_detection_debug_logs", {}).get("llm_response")
  if llm_response:
    result.llm_response = json.dumps(llm_response, indent=1)
  if svs_used:
    sv_matching = debug.get("sv_matching", {})
    cosine_scores = sv_matching.get("CosineScore", [])
    svs = sv_matching.get("SV", [])
    if cosine_scores and svs:
      sv_scores = []
      for sv, score in zip(svs, cosine_scores):
        if sv in svs_used:
          sv_scores.append(f"{sv} = {score}")
      result.sv_matching = "\n".join(sv_scores)

  # set status
  num_titles = len(result.result_titles)
  if has_place_overview_tile and (num_titles == 0 or num_titles == 1):
    result.status = ResultStatus.PLACE_ONLY
  elif num_titles == 0:
    result.status = ResultStatus.NO_RESULTS
  else:
    result.status = ResultStatus.HAS_RESULTS


def request_failed_result(query: str, url: str) -> Result:
  return Result(query=query, url=url, status=ResultStatus.REQUEST_FAILED)


def unknown_result(query: str, url: str) -> Result:
  return Result(query=query, url=url, status=ResultStatus.UNKNOWN)


def read_tsv(csv_file: str):
  logging.info("Reading csv file: %s", csv_file)
  with open(csv_file, 'r') as f:
    reader = csv.reader(f, delimiter='\t')
    # Skip header row.
    next(reader)
    rows = list(reader)
    logging.info("Read %s rows from csv file: %s", len(rows), csv_file)
    return rows


def run_test():
  os.makedirs(os.path.join(FLAGS.output_dir, REPORTS_DIR), exist_ok=True)
  test = AdversarialQueriesTest(base_url=FLAGS.base_url)

  # match-case would be the right thing to use here.
  # But yapf errors out if we do, hence using if-elif.
  if FLAGS.mode == Mode.RUN_ALL:
    test.run_queries_from_files_in_dir(input_dir=FLAGS.input_dir,
                                       output_dir=FLAGS.output_dir)
    test.generate_reports(FLAGS.output_dir)

  elif FLAGS.mode == Mode.RUN_QUERIES:
    test.run_queries_from_files_in_dir(input_dir=FLAGS.input_dir,
                                       output_dir=FLAGS.output_dir)
  elif FLAGS.mode == Mode.RUN_QUERY:
    if not FLAGS.query:
      raise Exception("'--query' flag not specified.")
    result = test.run_query(FLAGS.query)
    logging.info("Result:\n %s", json.dumps(result.to_csv_row(), indent=1))
  elif FLAGS.mode == Mode.GENERATE_REPORTS:
    test.generate_reports(FLAGS.output_dir)
  elif FLAGS.mode == Mode.COMPUTE_FILE_STATS:
    if not FLAGS.results_csv_file:
      raise Exception("'--results_csv_file' flag not specified.")
    stats = test.compute_stats_from_file(
        results_csv_file=FLAGS.results_csv_file, stats=StatsResult())
    logging.info("Stats Result:\n%s", stats)
  else:
    raise Exception("Invalid mode.")


def main(_):
  start = datetime.now()
  logging.info("Start: %s", start)

  run_test()

  end = datetime.now()
  logging.info("End: %s", end)
  logging.info("Duration: %s", str(end - start))


if __name__ == "__main__":
  app.run(main)