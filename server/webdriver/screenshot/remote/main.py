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

from server.webdriver import base
from server.webdriver.screenshot import runner

parser = argparse.ArgumentParser()
parser.add_argument("-d",
                    "--domain",
                    help="Domain to take the screenshot for ",
                    type=str,
                    required=True)

logging.getLogger().setLevel(logging.ERROR)

if __name__ == "__main__":
  args = parser.parse_args()
  logging.info(args.domain)
  driver = base.create_driver()
  runner.run(driver, 'https://' + args.domain, f'remote/{args.domain}')
  driver.quit()