# Copyright 2020 Google LLC
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
import time
import urllib.request

logging.getLogger().setLevel(logging.INFO)

SITEMAP_PATH = '../../static/sitemap/'

# Only add state componenet for now. Will decide the place types to run
# after launch.

FILES = [
    'Country.0.txt', 'State.0.txt', 'County.0.txt', 'City.0.txt', 'City.1.txt'
]


def click_file(file_name):
    logging.info(file_name)
    with open(file_name, 'r') as f:
        count = 0
        for url in f.readlines():
            urllib.request.urlopen(url)
            count += 1
            if count % 10 == 0:
                time.sleep(1)
                logging.info(count)


def main():
    for file in FILES:
        click_file(os.path.join(SITEMAP_PATH, file))


if __name__ == "__main__":
    main()
