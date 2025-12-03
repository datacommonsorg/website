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
import logging
import multiprocessing
import os
import sys
import time

from absl import app
from absl import flags
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

FLAGS = flags.FLAGS


class Mode:
  HOME = "home"
  EXPLORE_LANDING = "explore_landing"
  EXPLORE = "explore"


flags.DEFINE_string(
    "mode",
    Mode.HOME,
    f"Specify one of the following modes: {Mode.HOME} (default), {Mode.EXPLORE_LANDING}, {Mode.EXPLORE}",
)

flags.DEFINE_string("url", None, "URL to start testing from.", required=True)
flags.DEFINE_string("output_dir", "output", "Directory to write results to.")
flags.DEFINE_integer("parallelism", 5, "Number of parallel workers.")

_TEST_PARAM = "test=sanity"


def url_with_test_param(url: str):
  if _TEST_PARAM in url:
    return url
  return f"{url}{'&' if '#' in url else '#'}{_TEST_PARAM}"


class PageType(StrEnum):
  UNKNOWN = "Unknown"
  HOME = "Home"
  EXPLORE_LANDING = "Explore Landing"
  EXPLORE = "Explore"


class WebPage:

  def __init__(self,
               page_type: PageType,
               title: str,
               url: str,
               source_url: str = "") -> None:
    self.page_type = page_type
    self.title = title
    self.url = url_with_test_param(url)
    self.source_url = source_url


class Result:

  def __init__(self,
               page: WebPage,
               status: str,
               latency_sec: float,
               comments: str = "") -> None:
    self.page_type = page.page_type
    self.title = page.title
    self.status = status
    # Note that this latency is NOT the whole page latency.
    # It is only the latency incurred until the page sanity is deemed to be a pass or a failure.
    # It tends to be a small fraction of the full page latency.
    self.latency_sec = latency_sec
    self.url = page.url
    self.source_url = page.source_url
    self.comments = comments

  def to_csv_row(self) -> dict:
    return {key: str(value) for key, value in self.__dict__.items()}

  def __str__(self) -> str:
    return ", ".join(self.to_csv_row().values())


class WebsiteSanityTest:

  def __init__(self, results_csv_file_path) -> None:
    self.results_csv_file_path = results_csv_file_path
    self.results = []

  def __enter__(self):
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    self.driver = webdriver.Chrome(options=chrome_options)
    self.file = open(self.results_csv_file_path, "w", newline="")
    logging.info("Writing results to: %s", self.results_csv_file_path)
    self.csv_writer = csv.DictWriter(self.file,
                                     fieldnames=result_csv_columns(),
                                     lineterminator="\n")
    self.csv_writer.writeheader()
    return self

  def __exit__(self, exc_type, exc_value, traceback):
    self.file.close()
    logging.info("Results written to: %s", self.results_csv_file_path)
    self.driver.quit()

  def add_result(self, result: Result) -> None:
    logging.info("\n#%s %s", len(self.results) + 1, result)
    self.csv_writer.writerow(result.__dict__)
    self.file.flush()
    self.results.append(result)

  def home(self, page: WebPage) -> tuple[list[WebPage], list[WebPage]]:
    logging.info("Running: %s", page.url)
    start = datetime.now()

    self.driver.get(page.url)

    page.title = self.driver.title if page.title is None else page.title

    # Wait 1 second for the page to load.
    time.sleep(1)

    # topic items
    topic_items = find_elems(self.driver, By.CSS_SELECTOR,
                             '[data-testid^="chip-item-"]')
    if topic_items is None or len(topic_items) == 0:
      self.add_result(fail_result(page, start, "No topic items."))
      return

    explore_landing_pages = []
    for topic_item in topic_items:
      topic_url_elem = find_elem(topic_item, By.TAG_NAME, "a")
      if topic_url_elem is None:
        self.add_result(
            fail_result(
                page,
                start,
                "No explore landing URL on one of the topic items.",
            ))
        return

      # There is a button in the topic section that leads to the data sources
      # page. don't include it as an explore landing page.
      if topic_url_elem.get_attribute("href").endswith("/data"):
        continue

      explore_landing_pages.append(
          WebPage(
              PageType.EXPLORE_LANDING,
              topic_url_elem.text,
              topic_url_elem.get_attribute("href"),
              source_url=page.url,
          ))

    # question items
    question_items = find_elems(self.driver, By.CSS_SELECTOR,
                                '[data-testid^="question-item-"]')
    if question_items is None or len(question_items) == 0:
      self.add_result(fail_result(page, start, "No question items."))
      return

    explore_pages = []
    for question_item in question_items:
      question_url_elem = find_elem(question_item, By.TAG_NAME, "a")
      if question_url_elem is None:
        self.add_result(
            fail_result(
                page,
                start,
                "No explore URL on one of the question items.",
            ))
        return
      question_text_elem = find_elem(question_url_elem, By.TAG_NAME, "p")
      question_text = question_text_elem.text if question_text_elem else question_url_elem.text

      explore_pages.append(
          WebPage(
              PageType.EXPLORE,
              question_text,
              question_url_elem.get_attribute("href"),
              source_url=page.url,
          ))

    # Pass
    self.add_result(pass_result(page, start))

    return explore_landing_pages, explore_pages

  def explore_landing(self, page: WebPage):
    logging.info("Running: %s", page.url)
    start = datetime.now()

    self.driver.get(page.url)

    page.title = self.driver.title if page.title is None else page.title

    # queries
    queries = find_elems(self.driver, By.CSS_SELECTOR,
                         '[data-testid^="query-link-"]')
    if queries is None or len(queries) == 0:
      self.add_result(
          fail_result(page, start,
                      "No query links found in explore landing page."))
      return

    # Pass
    self.add_result(pass_result(page, start))

    explore_pages = []
    for link in queries:
      explore_pages.append(
          WebPage(
              PageType.EXPLORE,
              link.text,
              link.get_attribute("href"),
              source_url=page.url,
          ))
    for explore_page in explore_pages:
      self.explore(explore_page, True)

  def explore(self, page: WebPage, recurse: bool = False):
    logging.info("Running: %s", page.url)
    start = datetime.now()

    self.driver.get(page.url)

    page.title = self.driver.title if page.title is None else page.title

    # TODO(keyurs): Use this function to ensure all async elements have loaded:
    # https://github.com/datacommonsorg/website/blob/master/server/webdriver/shared.py#L56

    # Wait 10 secs for charts container to load
    try:
      WebDriverWait(self.driver, 10).until(
          EC.presence_of_element_located((By.CLASS_NAME, "explore-charts")))
    except:
      self.add_result(fail_result(
          page,
          start,
          "Timed out.",
      ))
      return

    # Wait couple more seconds for subtopics (i.e. charts) to load
    subtopics = None
    try:
      subtopics = WebDriverWait(self.driver, 2).until(
          EC.presence_of_all_elements_located(
              (By.CSS_SELECTOR, "section[class*='block subtopic']")))
    except:
      self.add_result(fail_result(
          page,
          start,
          "Timed out.",
      ))
      return

    # subtopics
    if subtopics is None or len(subtopics) == 0:
      self.add_result(fail_result(
          page,
          start,
          "No charts.",
      ))
      return
    if len(subtopics) == 1:
      map_element = find_elem(subtopics[0], By.CLASS_NAME, "map-container")
      if map_element:
        self.add_result(
            fail_result(
                page,
                start,
                "Placeholder map only, no charts.",
            ))
        return

    maybe_warning_result = None

    # relavant topics parent
    topics = []
    topics_parent = find_elem(self.driver, By.CLASS_NAME, "explore-topics-box")
    if topics_parent:
      topics = find_elems(topics_parent, By.TAG_NAME, "a")
      if topics is None or len(topics) == 0:
        maybe_warning_result = warning_result(
            page,
            start,
            "Topics section with no relevant topics.",
        )

    # Pass or Warning
    if maybe_warning_result:
      self.add_result(maybe_warning_result)
    else:
      self.add_result(pass_result(page, start))

    if not recurse:
      return

    explore_links = topics
    explore_pages = []
    for link in explore_links:
      explore_pages.append(
          WebPage(
              PageType.EXPLORE,
              link.text,
              link.get_attribute("href"),
              source_url=page.url,
          ))
    for explore_page in explore_pages:
      self.explore(explore_page, False)


def find_elem(parent, by: str, value: str):
  try:
    return parent.find_element(by, value)
  except:
    return None


def find_elems(parent, by: str, value: str):
  try:
    return parent.find_elements(by, value)
  except:
    return None


# Pass result
def pass_result(page: WebPage, start: datetime, comments: str = "") -> Result:
  return Result(page, "PASS", duration_sec(start), comments)


# Fail result
def fail_result(page: WebPage, start: datetime, comments: str = "") -> Result:
  return Result(page, "FAIL", duration_sec(start), comments)


# Warning result
def warning_result(page: WebPage,
                   start: datetime,
                   comments: str = "") -> Result:
  return Result(page, "WARNING", duration_sec(start), comments)


def duration_sec(start: datetime) -> float:
  return round((datetime.now() - start).total_seconds(), 2)


def result_csv_columns() -> str:
  return list(
      pass_result(WebPage(PageType.UNKNOWN, "", ""), datetime.now(),
                  "").__dict__.keys())


def worker(args):
  # Initialize logging for the worker process
  logging.basicConfig(
      level=logging.INFO,
      format='%(asctime)s %(levelname)s [Worker] %(message)s',
      force=True)
  mode, url, output_dir = args
  # Create a unique file for this worker to avoid write contention if we were writing to same file,
  # but here we will return results and main process writes them.
  # Actually, `WebsiteSanityTest` writes to file in __enter__.
  # We should probably let workers write to their own files or collect results.
  # The plan said "Aggregating results from all workers".
  # But `WebsiteSanityTest` is designed to write to CSV.
  # Let's make `WebsiteSanityTest` write to a temp file for the worker, then we merge them?
  # Or just collect results in memory and return them?
  # `WebsiteSanityTest` writes to `self.file`.
  # Let's use a dummy file or /dev/null if we just want to collect results?
  # Or better: Let each worker write to a separate file in `output_dir/worker_X.csv`.

  # We need to construct a unique filename.
  # Since we don't have a worker ID easily, we can use a hash of URL or random.
  # Use /dev/null since we collect results in memory and write to main file at the end.
  results_file = os.devnull

  results = []
  try:
    with WebsiteSanityTest(results_csv_file_path=results_file) as test:
      page = WebPage(PageType.UNKNOWN, None, url)
      if mode == Mode.EXPLORE_LANDING:
        page.page_type = PageType.EXPLORE_LANDING
        test.explore_landing(page)
      elif mode == Mode.EXPLORE:
        page.page_type = PageType.EXPLORE
        test.explore(page)
      results = test.results
  except Exception as e:
    logging.error("Worker failed for %s: %s", url, e)
    # Return a failure result
    results.append(
        Result(WebPage(PageType.UNKNOWN, "Worker Error", url), "FAIL", 0,
               str(e)))

  return results


def run_test():
  os.makedirs(FLAGS.output_dir, exist_ok=True)
  timestamp = datetime.now().strftime('%Y_%m_%d_%H_%M_%S')
  main_results_file = os.path.join(FLAGS.output_dir, f"results_{timestamp}.csv")

  all_results = []

  # If mode is not HOME, just run sequentially (or we could parallelize if we had a list of URLs).
  # But the flag only accepts one URL.
  if FLAGS.mode != Mode.HOME:
    with WebsiteSanityTest(results_csv_file_path=main_results_file) as test:
      page = WebPage(PageType.UNKNOWN, None, FLAGS.url)
      if FLAGS.mode == Mode.EXPLORE_LANDING:
        page.page_type = PageType.EXPLORE_LANDING
        test.explore_landing(page)
      elif FLAGS.mode == Mode.EXPLORE:
        page.page_type = PageType.EXPLORE
        test.explore(page)
      else:
        print("Invalid mode", FLAGS.mode)
        return False
      all_results = test.results
  else:
    # HOME mode: Crawl and parallelize
    tasks = []
    with WebsiteSanityTest(results_csv_file_path=main_results_file) as test:
      page = WebPage(PageType.UNKNOWN, None, FLAGS.url)
      page.page_type = PageType.HOME
      # home() now returns tasks
      landing_pages, explore_pages = test.home(page)
      all_results.extend(test.results)

      for p in landing_pages:
        tasks.append((Mode.EXPLORE_LANDING, p.url, FLAGS.output_dir))
      for p in explore_pages:
        tasks.append((Mode.EXPLORE, p.url, FLAGS.output_dir))

    # Run tasks in parallel
    if tasks:
      logging.info("Running %d tasks with parallelism %d", len(tasks),
                   FLAGS.parallelism)
      with multiprocessing.Pool(FLAGS.parallelism) as pool:
        nested_results = pool.map(worker, tasks)
        for res in nested_results:
          all_results.extend(res)

  # Consolidate all results into the main CSV (since workers wrote to partial files or just returned results)
  # Wait, `worker` writes to partial files AND returns results.
  # `WebsiteSanityTest` writes to CSV immediately.
  # We should probably merge the CSVs or just rely on the returned results and write them to the main CSV.
  # `WebsiteSanityTest` in `main` (for HOME) wrote to `main_results_file`.
  # We should append the other results to `main_results_file`.

  with open(main_results_file, "a", newline="") as f:
    writer = csv.DictWriter(f,
                            fieldnames=result_csv_columns(),
                            lineterminator="\n")
    # We don't write header again.
    for res in all_results:
      # We already wrote HOME results in the first block.
      # We need to filter them out or just write the NEW ones.
      # `all_results` contains HOME results + Worker results.
      # HOME results were already written.
      # Worker results were written to separate files (maybe we should delete those?).
      # Actually, let's just rewrite the WHOLE file to be clean and sorted?
      # Or just append worker results.
      pass

  # Re-writing strategy:
  # 1. Read HOME results (already written).
  # 2. Append Worker results.
  # Actually, `worker` returns `results`. We can just write them.

  with open(main_results_file, "a", newline="") as f:
    writer = csv.DictWriter(f,
                            fieldnames=result_csv_columns(),
                            lineterminator="\n")
    # Skip the first few results that came from HOME (already written)
    # How many? `len(test.results)` from the HOME block.
    # Let's just track which ones are new.

    # Actually, simpler:
    # The `worker` function writes to `results_worker_ID.csv`.
    # We can just cat all these files together into `main_results_file`?
    # Or we can just use the `all_results` list and overwrite `main_results_file` completely at the end.
    pass

  # Let's overwrite the main file with ALL results to be safe and clean.
  with open(main_results_file, "w", newline="") as f:
    writer = csv.DictWriter(f,
                            fieldnames=result_csv_columns(),
                            lineterminator="\n")
    writer.writeheader()
    for res in all_results:
      writer.writerow(res.to_csv_row())

  # Cleanup worker files
  # (If we want to keep them for debugging, we can leave them, but better to clean up)
  # The workers created `results_{uuid}.csv`.
  # We can find and delete them?
  # Or just let `worker` NOT write to file if we don't need it?
  # `WebsiteSanityTest` requires a file path.
  # We can pass `/dev/null`?
  # On Linux/Mac `/dev/null` works.

  # Let's just iterate `all_results` and check for FAIL.
  for result in all_results:
    if result.status == "FAIL":
      return False
  return True


def main(_):
  start = datetime.now()
  logging.info("Start: %s", start)

  success = run_test()
  if not success:
    sys.exit(1)

  end = datetime.now()
  logging.info("End: %s", end)
  logging.info("Duration: %s", str(end - start))
  print("", flush=True)
  logging.shutdown()


if __name__ == "__main__":
  app.run(main)
