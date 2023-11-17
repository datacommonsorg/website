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

import json
import logging
import time
from typing import Dict


#
# A helper class to track info / error / timing counters.
#
class Counters:

  def __init__(self):
    self._err: Dict = {}
    self._info: Dict = {}
    self._timing: Dict = {}

  #
  # Adds/updates an info counter.
  #
  # For a given counter, caller should always pass the same type
  # for value.  If value is numeric, then its a single updated
  # counter, otherwise, counter is a list of values.
  #
  # REQUIRES: `value` should be a JSON serializable type
  #
  def info(self, counter: str, value: any):
    # logging.info(f'counter["{counter}"] = {value}')
    self._update(self._info, counter, value)

  #
  # Adds/updates a warning counter.
  #
  # Same behavior as info()
  #
  # REQUIRES: `value` should be a JSON serializable type
  #
  def err(self, counter: str, value: any):
    # logging.error(f'counter["{counter}"] = {value}')
    self._update(self._err, counter, value)

  #
  # Given start-time, computes the elapsed time and
  # accounts it to the given counter.
  #
  def timeit(self, counter: str, start: float):
    duration = round(time.time() - start, 2)
    self._timing[counter] = self._timing.get(counter, 0) + duration

  #
  # Returns a JSON serializable dict with all counters.
  #
  def get(self) -> Dict:
    result = {'ERROR': self._err, 'INFO': self._info, 'TIMING': self._timing}
    try:
      json.dumps(result)
      return result
    except TypeError as e:
      logging.exception(e)
      return {'ERROR': 'FATAL: Found unserializable counter value!'}

  def _update(self, counters: Dict, counter: str, value: any):
    should_add = counter not in counters
    if isinstance(value, int) or isinstance(value, float):
      if should_add:
        counters[counter] = 0
      counters[counter] += value
    else:
      if isinstance(value, set):
        value = list(value)
      if should_add:
        counters[counter] = []
      counters[counter].append(value)
