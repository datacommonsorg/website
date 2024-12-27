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

import argparse
import json
import logging
from multiprocessing import current_process
from multiprocessing import Lock
from multiprocessing import Pool
from multiprocessing import Value
import time
import uuid

from server.webdriver.base_utils import create_driver
from server.webdriver.screenshot import runner

parser = argparse.ArgumentParser()
parser.add_argument("-d",
                    "--domain",
                    help="Domain to take the screenshot for",
                    type=str,
                    required=True)
parser.add_argument("-u",
                    "--url",
                    help="Base url to use to take the screenshots",
                    type=str,
                    required=False,
                    default="")

logging.getLogger().setLevel(logging.WARNING)

NUM_WORKER = 5

drivers = []
for i in range(NUM_WORKER):
  drivers.append(create_driver())

lock = Lock()
global_var = Value('i', 0)


def worker(total, domain, page, base_url):
  start = time.time()
  p = current_process()
  process_counter = p._identity[0]
  driver = drivers[process_counter - 1]
  max_attempts = 3
  attempts = 0
  while attempts < max_attempts:
    try:
      # If no base_url specified, use the domain
      runner_url = base_url or f'https://{domain}'
      runner.run(driver, runner_url, page)
      break
    except Exception as e:
      logging.error("Error: %s, %s", page['url'], e)
      attempts += 1
  end = time.time()
  with lock:
    global_var.value += 1
  duration = f"{end - start:02.2f}"
  logging.warning('%03d/%d: %ss: %s', global_var.value, total, duration,
                  page['url'])


if __name__ == "__main__":
  args = parser.parse_args()
  pages = runner.prepare(f'remote/{args.domain}')
  pool = Pool(NUM_WORKER)
  screenshot_url = {}
  params = []
  for page in pages:
    file_name = '{}.png'.format(uuid.uuid4().hex)
    page['file_name'] = file_name
    params.append((len(pages), args.domain, page, args.url))
    screenshot_url[file_name] = page['url']
  with open("screenshots/screenshot_url.json", "w") as json_file:
    json.dump(screenshot_url, json_file)
  pool.starmap(worker, params)
  pool.close()
  pool.join()
  for driver in drivers:
    driver.close()
