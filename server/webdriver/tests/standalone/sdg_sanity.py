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
import json
import logging
import os
import re
import time
import urllib.parse

from absl import app
from absl import flags
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

FLAGS = flags.FLAGS


class Mode:
  ALL = "all"
  HOME = "home"
  COUNTRY = "country"


flags.DEFINE_enum(
    "mode",
    Mode.ALL,
    [Mode.ALL, Mode.HOME, Mode.COUNTRY],
    f"Mode of operation",
)

flags.DEFINE_string("base_url", "http://45.79.10.25/UNSDWebsite/undatacommons",
                    "Base URL of the SDG website.")

flags.DEFINE_string(
    "country_dcid",
    "",
    f"The country dcid (URL parameter 'p'). Required when running in {Mode.COUNTRY} mode.",
)

flags.DEFINE_string(
    "stat_var",
    "",
    f"The stat var (URL parameter 'v'). Can be specified in {Mode.COUNTRY} mode.",
)

OUTPUT_DIR = "output"

COUNTRIES_JSON_FILE = "https://code.officialstatistics.org/undata2/data-commons/frontend-tester/-/raw/main/UNSD-Website-skeleton/UNSD.Website/ClientApp/src/templates/DataCommons/config/countries.json?ref_type=heads&inline=false"
REGIONS_JSON_FILE = "sdg_regions.json"


def load_countries() -> dict[str, dict]:
  countries = {}
  country_config = requests.get(COUNTRIES_JSON_FILE).json()
  for country in country_config["countries"]:
    if country["is_un_member_or_observer"]:
      countries[country["dcid"]] = country

  with open(REGIONS_JSON_FILE, "r") as f:
    region_config = json.load(f)
    for dcid, region in region_config["regions"].items():
      countries[dcid] = region

  # Printing instead of logging since the logger is not initialized when this function is called.
  print("# UN countries and regions loaded: ", len(countries))
  return countries


COUNTRIES: dict[str, dict] = load_countries()


class PageType(StrEnum):
  UNKNOWN = "Unknown"
  HOME = "Home"
  SDG_HOME = "SDG Home"
  COUNTRY = "Country"


class SdgHomeConstants:
  NUM_GOAL_ITEMS = 18
  GOAL_ITEM_CSS_CLASS_NAME = "goal-item"
  SEARCH_CLASS_NAME = "-dc-place-search"
  COUNTRY_DROPDOWN_CSS_SELECTOR = (
      "div[class*='ant-select-item ant-select-item-option']")


class HomeConstants:
  SEARCH_CLASS_NAME = "-dc-search-bar"
  # A "-dc-*" should be used on the page instead of this one to make finding it deterministic.
  AREAS_CLASS_NAME = "sc-HjNCl"
  MIN_AREA_ELEMS = 12


class CountryConstants:
  SPINNER_CSS_CLASS_NAME = "ant-spin-spinning"
  GOAL_CARD_CSS_CLASS_NAME = "-dc-goal-overview"
  TARGET_HEADER_CSS_CLASS_NAME = "-dc-target-header"
  EXPANDABLE_GOALS_XPATH = ".//ul/li[contains(@class, 'ant-menu-submenu') and contains(@class, 'ant-menu-submenu-inline')]"
  STAT_VAR_DATA_MENU_ID_ATTRIBUTE = "data-menu-id"
  STAT_VAR_XPATH = f".//ul/li[boolean(@{STAT_VAR_DATA_MENU_ID_ATTRIBUTE})]"
  NUM_STAT_VARS_TO_VISIT = 5


class WebPage:

  def __init__(
      self,
      page_type: PageType,
      title: str,
      base_url: str,
      path: str,
      source_url: str = "",
  ) -> None:
    self.page_type = page_type
    self.title = title
    self.base_url = base_url
    self.path = path
    self.url = f"{base_url}/{path}"
    self.source_url = source_url


class Result:

  def __init__(self, page: WebPage, status: str, comments: str = "") -> None:
    self.page_type = page.page_type
    self.title = page.title
    self.status = status
    self.url = page.url
    self.source_url = page.source_url
    self.comments = comments

  def to_csv_row(self) -> dict:
    return {key: str(value) for key, value in self.__dict__.items()}

  def __str__(self) -> str:
    return ", ".join(self.to_csv_row().values())


class SdgWebsiteSanityTest:

  def __init__(self, base_url: str, results_csv_file_path: str) -> None:
    self.base_url = base_url
    self.results_csv_file_path = results_csv_file_path
    self.results = []

  def __enter__(self):
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    self.driver = webdriver.Chrome(options=chrome_options)
    self.driver.switch_to.new_window('window')
    self.driver.set_window_size(width=1280, height=4000, windowHandle='current')
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

  def new_page(self,
               page_type: str,
               path: str,
               source: WebPage = None) -> WebPage:
    return WebPage(
        page_type=page_type,
        title="",
        base_url=self.base_url,
        path=path,
        source_url=source.url if source else "",
    )

  def all(self):
    self.home()
    for country_dcid in COUNTRIES.keys():
      self.country(country_dcid=country_dcid)

  def home(self):
    page = self.new_page(PageType.HOME, "")
    logging.info("Running: %s", page.url)

    self.driver.get(page.url)

    page.title = self.driver.title

    # search
    search_bar = find_elem(self.driver, By.CLASS_NAME,
                           HomeConstants.SEARCH_CLASS_NAME)
    if not search_bar:
      self.add_result(fail_result(
          page,
          "Search bar not found.",
      ))
      return

    # area links
    area_elems = find_elems(self.driver, By.CLASS_NAME,
                            HomeConstants.AREAS_CLASS_NAME) or []
    num_area_elems = len(area_elems)
    if num_area_elems < HomeConstants.MIN_AREA_ELEMS:
      self.add_result(
          fail_result(
              page,
              f"Area elements mismatch. Min. required {HomeConstants.MIN_AREA_ELEMS}, found {num_area_elems}.",
          ))
      return

    # Pass
    self.add_result(pass_result(page))

  def sdg_home(self):
    page = self.new_page(PageType.SDG_HOME, "")
    logging.info("Running: %s", page.url)

    self.driver.get(page.url)

    page.title = self.driver.title

    # goal items
    countries = find_elems(self.driver, By.CLASS_NAME,
                           SdgHomeConstants.GOAL_ITEM_CSS_CLASS_NAME)
    num_goal_items = len(countries)
    if num_goal_items != SdgHomeConstants.NUM_GOAL_ITEMS:
      self.add_result(
          fail_result(
              page,
              f"Goal items mismatch. Required {SdgHomeConstants.NUM_GOAL_ITEMS}, found {num_goal_items}.",
          ))
      return

    # search
    search_container = find_elem(self.driver, By.CLASS_NAME,
                                 SdgHomeConstants.SEARCH_CLASS_NAME)
    if not search_container:
      self.add_result(fail_result(
          page,
          "Search container not found.",
      ))
      return

    # click search to load countries
    search_container.click()

    # sleep for 500ms for countries to load
    time.sleep(0.5)

    # countries
    countries = find_elems(self.driver, By.CSS_SELECTOR,
                           SdgHomeConstants.COUNTRY_DROPDOWN_CSS_SELECTOR)
    if len(countries) == 0:
      self.add_result(fail_result(
          page,
          "Countries dropdown not found.",
      ))
      return

    # Pass
    self.add_result(pass_result(page))

  def country(self,
              country_dcid: str,
              stat_var: str = None,
              source: WebPage = None):
    path = f"countries?p={urllib.parse.quote_plus(country_dcid)}{f'&v={urllib.parse.quote_plus(stat_var)}' if stat_var else ''}"
    page = self.new_page(PageType.COUNTRY, path, source=source)
    page.title = f"{country_dcid}{f' ({stat_var})' if stat_var else ''}"
    logging.info("Running: %s", page.url)

    self.driver.get(page.url)

    # sleep for 500ms for page to load
    time.sleep(0.5)

    # Wait 5 seconds for spinner to disappear
    try:
      WebDriverWait(self.driver, 10).until(
          EC.invisibility_of_element_located(
              (By.CLASS_NAME, CountryConstants.SPINNER_CSS_CLASS_NAME)))
    except Exception:
      self.add_result(fail_result(
          page,
          "Timed out.",
      ))

    goal_cards = find_elems(self.driver, By.CLASS_NAME,
                            CountryConstants.GOAL_CARD_CSS_CLASS_NAME)
    if len(goal_cards) == 0:
      self.add_result(fail_result(
          page,
          "No goal cards.",
      ))
      return

    # If no target headers => failure
    target_headers = find_elems(self.driver, By.CLASS_NAME,
                                CountryConstants.TARGET_HEADER_CSS_CLASS_NAME)
    if len(target_headers) == 0:
      self.add_result(fail_result(
          page,
          "No target headers.",
      ))
      return

    # Pass
    self.add_result(pass_result(page))

    page_text = find_elem(self.driver, By.XPATH, "/html/body").text
    if re.search("SDG_", page_text, re.IGNORECASE):
      self.add_result(fail_result(
          page,
          "Contains SDG_ in display text.",
      ))
      return

    # if stat_var was already specified, don't navigate further down.
    if stat_var:
      return

    stat_vars = []

    def find_stat_vars(parent):
      expandables = find_elems(parent, By.XPATH,
                               CountryConstants.EXPANDABLE_GOALS_XPATH)
      for expandable in expandables:
        try:
          # expand
          expandable.click()
        except Exception as e:
          logging.warning("Error expanding a sidebar goal: %s\n%s (%s)\n%s",
                          expandable, country_dcid, stat_var, e)
          continue

        # Sleep for 100ms so the elems can expand.
        time.sleep(0.1)
        stat_var_elems = find_elems(expandable, By.XPATH,
                                    CountryConstants.STAT_VAR_XPATH)
        if stat_var_elems:
          for stat_var_elem in stat_var_elems:
            # if the attribute ends with "dc/*", then that is the statvar to navigate to.
            attr = stat_var_elem.get_attribute(
                CountryConstants.STAT_VAR_DATA_MENU_ID_ATTRIBUTE)
            if attr:
              (_, sep, after) = attr.partition("dc/")
              if sep and after:
                stat_vars.append(sep + after)
                if (len(stat_vars) >= CountryConstants.NUM_STAT_VARS_TO_VISIT):
                  return
        find_stat_vars(expandable)
        # collapse
        expandable.click()

    find_stat_vars(self.driver)

    for sv in stat_vars:
      self.country(country_dcid=country_dcid, stat_var=sv, source=page)


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
def pass_result(page: WebPage, comments: str = "") -> Result:
  return Result(page, "PASS", comments)


# Fail result
def fail_result(page: WebPage, comments: str = "") -> Result:
  return Result(page, "FAIL", comments)


# Warning result
def warning_result(page: WebPage, comments: str = "") -> Result:
  return Result(page, "WARNING", comments)


def result_csv_columns() -> str:
  return list(
      pass_result(WebPage(PageType.UNKNOWN, "", "", ""), "").__dict__.keys())


def run_test():
  os.makedirs(OUTPUT_DIR, exist_ok=True)
  results_csv_file_path = os.path.join(
      OUTPUT_DIR,
      f"sdg_results_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.csv")

  with SdgWebsiteSanityTest(
      base_url=FLAGS.base_url,
      results_csv_file_path=results_csv_file_path) as test:
    # match-case would be the right thing to use here.
    # But yapf errors out if we do, hence using if-elif.
    if FLAGS.mode == Mode.ALL:
      test.all()
    elif FLAGS.mode == Mode.HOME:
      test.home()
    elif FLAGS.mode == Mode.COUNTRY:
      if not FLAGS.country_dcid:
        raise Exception("'--country_dcid' flag not specified.")
      test.country(country_dcid=FLAGS.country_dcid, stat_var=FLAGS.stat_var)
    else:
      print("Invalid mode", FLAGS.mode)
      exit(1)


def main(_):
  start = datetime.now()
  logging.info("Start: %s", start)

  run_test()

  end = datetime.now()
  logging.info("End: %s", end)
  logging.info("Duration: %s", str(end - start))
  print("", flush=True)
  logging.shutdown()


if __name__ == "__main__":
  app.run(main)
