# Copyright 2024 Google LLC
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

#
# When there are extreme RPC calls - in terms of number of requested
# entities/variables, response bytes, duration, or failures - log some
# debug info including the function call stack.
#

import logging
import os
import time
import traceback

import requests

# 3500 may seem v high,  but there are known paths (like ranking across
# counties in US) ask for very many entities (3.2K)
_ENTITY_LIMIT = 3500
_VAR_LIMIT = 500
_BYTE_LIMIT = 5 << 20  # 5 MB
_MAX_DURATION_SECS = 2


# Usage:
#
# call_logger = ExtremeCallLogger(request)
#
# ... make the call ....
#
# # On success or failure
# call_logger.finish(response)
#
class ExtremeCallLogger:

  def __init__(self, request: dict = None):
    self.request = request
    self.start = time.time()

  def finish(self, resp: requests.Response = None):
    if os.environ.get('FLASK_ENV') in ['production', 'custom']:
      return

    # Error msgs
    cases = []

    # Always log long calls.
    dur = time.time() - self.start
    if dur > _MAX_DURATION_SECS:
      cases.append(f'long-call: {dur}s')

    # If request is set, then check for known schema things
    nvars = 0
    nents = 0
    if self.request:
      nents = len(self.request.get('nodes', []))
      if not nents:
        nents = len(self.request.get('entity', {}).get('dcids', []))
        nvars = len(self.request.get('variable', {}).get('dcids', []))
      if nents > _ENTITY_LIMIT:
        cases.append(f'big-req: {nents} entities')
      if nvars > _VAR_LIMIT:
        cases.append(f'big-req: {nvars} vars')

    # If response is set, check byte limit
    if resp:
      if resp.status_code != 200:
        cases.append(
            f'failed-call: {resp.reason} - {nents} entities, {nvars} vars - {resp.content}'
        )
      else:
        if len(resp.text) > _BYTE_LIMIT:
          cases.append(f'big-resp: {len(resp.text)} bytes')

    if cases:
      msg = ' | '.join(cases)
      stack = ''.join(traceback.format_stack(limit=10))
      logging.error(f'ExtremeCall # {msg} #\nStack Trace:\n{stack}')
