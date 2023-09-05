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
import logging
from multiprocessing import Lock
from multiprocessing import Pool
from multiprocessing import Value
import time

from server.webdriver import base
from server.webdriver.screenshot import runner

parser = argparse.ArgumentParser()
parser.add_argument("-d",
                    "--domain",
                    help="Domain to take the screenshot for ",
                    type=str,
                    required=True)

logging.getLogger().setLevel(logging.WARNING)

driver = base.create_driver()
global_var = Value('i', 0)
lock = Lock()


def worker(total, page):
  start = time.time()
  max_attempts = 3
  attempts = 0
  while attempts < max_attempts:
    try:
      runner.run(driver, 'https://' + args.domain, page)
      break
    except Exception:
      logging.error("Error: %s", page['url'])
      attempts += 1
  end = time.time()
  with lock:
    global_var.value += 1
  duration = f"{end - start:2.2f}"
  logging.warning('%03d/%d: %ss: %s%s', global_var.value, total, duration,
                  args.domain, page['url'])


if __name__ == "__main__":
  args = parser.parse_args()
  logging.info(args.domain)
  pages = runner.prepare(f'remote/{args.domain}')
  pool = Pool(4)
  args = []
  # A warm up window
  driver.switch_to.new_window('window')
  for page in pages:
    args.append((len(pages), page))
  pool.starmap(worker, args)
  driver.close()