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

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from absl import app
from absl import flags
from enum import StrEnum
from datetime import datetime
import os
import csv

FLAGS = flags.FLAGS

OUTPUT_DIR = "output"


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


class PageType(StrEnum):
    UNKNOWN = "Unknown"
    HOME = "Home"
    EXPLORE_LANDING = "Explore Landing"
    EXPLORE = "Explore"


class WebPage:

    def __init__(self, page_type: PageType, title: str, url: str) -> None:
        self.page_type = page_type
        self.title = title
        self.url = url


class Result:

    def __init__(self, page: WebPage, status: str, comments: str = "") -> None:
        self.page_type = page.page_type
        self.title = page.title
        self.status = status
        self.url = page.url
        self.comments = comments

    def to_csv_row(self) -> dict:
        return {key: str(value) for key, value in self.__dict__.items()}

    def __str__(self) -> str:
        return ", ".join(self.to_csv_row().values())


class Test:

    def __init__(self, results_csv_file_path) -> None:
        self.results_csv_file_path = results_csv_file_path
        self.results = []

    def __enter__(self):
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()))
        self.file = open(self.results_csv_file_path, "w", newline="")
        print("Writing results to", self.results_csv_file_path)
        self.csv_writer = csv.DictWriter(self.file,
                                         fieldnames=result_csv_columns(),
                                         lineterminator="\n")
        self.csv_writer.writeheader()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.file.close()
        print("\nResults written to", self.results_csv_file_path)
        self.driver.quit()

    def add_result(self, result: Result) -> None:
        print(f"#{len(self.results) + 1}", result)
        self.csv_writer.writerow(result.__dict__)
        self.file.flush()
        self.results.append(result)

    def home(self, page: WebPage):
        self.driver.get(page.url)

        page.title = self.driver.title if page.title is None else page.title

        # topic cards
        topic_cards = find_elems(self.driver, By.CLASS_NAME, "topic-card")
        if topic_cards is None or len(topic_cards) == 0:
            self.add_result(fresult(page, "No topic cards."))
            return

        explore_landing_pages = []
        for topic_card in topic_cards:
            topic_title_elem = find_elem(topic_card, By.CLASS_NAME,
                                         "topic-card-title")
            if topic_title_elem is None:
                self.add_result(
                    fresult(
                        page,
                        "No explore landing title on one of the cards.",
                    ))
                return

            topic_url_elem = find_elem(topic_card, By.TAG_NAME, "a")
            if topic_url_elem is None:
                self.add_result(
                    fresult(
                        page,
                        "No explore landing URL on one of the cards.",
                    ))
                return

            explore_landing_pages.append(
                WebPage(
                    PageType.EXPLORE_LANDING,
                    topic_title_elem.text,
                    topic_url_elem.get_attribute("href"),
                ))

        # Pass
        self.add_result(presult(page))

        for explore_landing_page in explore_landing_pages:
            self.explore_landing(explore_landing_page)

    def explore_landing(self, page: WebPage):
        self.driver.get(page.url)

        page.title = self.driver.title if page.title is None else page.title

        # topics
        topics = find_elems(self.driver, By.CLASS_NAME, "item-list-text")
        if topics is None or len(topics) == 0:
            self.add_result(fresult(page, "No topics."))
            return

        # queries
        queries_parent = find_elem(
            self.driver,
            By.CSS_SELECTOR,
            "#dc-explore-landing > div > div > div.topic-container > div.topic-queries",
        )
        if queries_parent is None:
            self.add_result(fresult(page, "No queries."))
            return
        queries = find_elems(queries_parent, By.TAG_NAME, "a")
        if queries is None or len(queries) == 0:
            self.add_result(fresult(page, "No queries."))
            return

        # Pass
        self.add_result(presult(page))

        explore_links = topics + queries
        explore_pages = []
        for link in explore_links:
            explore_pages.append(
                WebPage(PageType.EXPLORE, link.text,
                        link.get_attribute("href")))
        for explore_page in explore_pages:
            self.explore(explore_page, True)

    def explore(self, page: WebPage, recurse: bool = False):
        self.driver.get(page.url)

        page.title = self.driver.title if page.title is None else page.title

        # Wait 5 secs for charts container to load
        explore_container_present = EC.presence_of_element_located(
            (By.CLASS_NAME, "explore-charts"))
        try:
            WebDriverWait(self.driver, 10).until(explore_container_present)
        except:
            self.add_result(fresult(
                page,
                "Timed out.",
            ))
            return

        # Wait couple more seconds for subtopics (i.e. charts) to load
        subtopics_present = EC.presence_of_element_located(
            (By.CSS_SELECTOR, "section[class*='block subtopic']"))
        try:
            WebDriverWait(self.driver, 2).until(subtopics_present)
        except:
            self.add_result(fresult(
                page,
                "No charts.",
            ))
            return

        # subtopics
        subtopics = find_elems(self.driver, By.CSS_SELECTOR,
                               "section[class*='block subtopic']")
        if subtopics is None or len(subtopics) == 0:
            self.add_result(fresult(
                page,
                "No charts.",
            ))
            return
        if len(subtopics) == 1:
            map_element = find_elem(subtopics[0], By.CLASS_NAME,
                                    "map-container")
            if map_element:
                self.add_result(
                    fresult(
                        page,
                        "Placeholder map only, no charts.",
                    ))
                return

        warning_result = None

        # relavant topics parent
        topics = []
        topics_parent = find_elem(self.driver, By.CLASS_NAME,
                                  "explore-topics-box")
        if topics_parent:
            topics = find_elems(topics_parent, By.TAG_NAME, "a")
            if topics is None or len(topics) == 0:
                warning_result = wresult(
                    page,
                    "Topics section with no relevant topics.",
                )

        # Pass or Warning
        if warning_result:
            self.add_result(warning_result)
        else:
            self.add_result(presult(page))

        if not recurse:
            return

        explore_links = topics
        explore_pages = []
        for link in explore_links:
            explore_pages.append(
                WebPage(PageType.EXPLORE, link.text,
                        link.get_attribute("href")))
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
def presult(page: WebPage, comments: str = "") -> Result:
    return Result(page, "PASS", comments)


# Fail result
def fresult(page: WebPage, comments: str = "") -> Result:
    return Result(page, "FAIL", comments)


# Warning result
def wresult(page: WebPage, comments: str = "") -> Result:
    return Result(page, "WARNING", comments)


def result_csv_columns() -> str:
    return list(presult(WebPage(PageType.UNKNOWN, "", ""), "").__dict__.keys())


def run_test():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results_csv_file_path = os.path.join(
        OUTPUT_DIR, f"results-{int(datetime.now().timestamp())}.csv")

    with Test(results_csv_file_path=results_csv_file_path) as test:
        page = WebPage(PageType.UNKNOWN, None, FLAGS.url)

        # match-case would be the right thing to use here.
        # But yapf errors out if we do, hence using if-elif.
        if FLAGS.mode == Mode.HOME:
            page.page_type = PageType.HOME
            test.home(page)
        elif FLAGS.mode == Mode.EXPLORE_LANDING:
            page.page_type = PageType.EXPLORE_LANDING
            test.explore_landing(page)
        elif FLAGS.mode == Mode.EXPLORE:
            page.page_type = PageType.EXPLORE
            test.explore(page)
        else:
            print("Invalid mode", FLAGS.mode)
            exit(1)


def main(_):
    start = datetime.now()
    print("Start", start)
    print()

    run_test()

    print()
    end = datetime.now()
    print("End", end)
    print("Duration", str(end - start))


if __name__ == "__main__":
    app.run(main)
