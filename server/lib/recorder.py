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

import functools
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Callable, Dict, Union

from flask import current_app

# Environment variable to control mixer mode: 'live', 'record', 'replay'
MIXER_MODE_ENV = 'MIXER_MODE'
MODE_RECORD = 'record'
MODE_REPLAY = 'replay'
MODE_LIVE = 'live'

# Directory to store cassettes
CASSETTE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tests',
                            'test_data', 'mixer_cassettes')


import urllib.parse

def _get_cassette_path(url: str, req_body: str) -> Path:
  """Generates a file path for the cassette based on URL and request body."""
  parsed_url = urllib.parse.urlparse(url)
  path = parsed_url.path
  
  # Create a stable hash of the request
  # We use the path, query, and the sorted JSON body
  # We exclude scheme/netloc to allow replay across different environments
  key = f"{path}?{parsed_url.query}|{req_body}"
  hash_key = hashlib.md5(key.encode('utf-8')).hexdigest()

  # Derive a slug from the URL for readability
  # e.g. /v2/observation -> v2_observation
  slug = path.strip('/').replace('/', '_')
  if not slug:
    slug = 'root'

  filename = f"{slug}-{hash_key}.json"
  return Path(CASSETTE_DIR) / filename


def record_replay_mixer(fn: Callable) -> Callable:
  """Decorator to record or replay Mixer API calls."""

  @functools.wraps(fn)
  def wrapper(url: str, req: Union[Dict, str] = None, *args, **kwargs):
    mode = os.environ.get(MIXER_MODE_ENV, MODE_LIVE).lower()

    # If live, just run the function
    if mode == MODE_LIVE:
      return fn(url, req, *args, **kwargs)

    # Normalize request body for hashing
    req_str = ""
    if req:
      if isinstance(req, str):
        req_str = req
      else:
        req_str = json.dumps(req, sort_keys=True)

    cassette_path = _get_cassette_path(url, req_str)

    if mode == MODE_REPLAY:
      if cassette_path.exists():
        logging.info(f"Replaying mixer response from {cassette_path}")
        with open(cassette_path, 'r') as f:
          return json.load(f)
      else:
        # Fallback or error? For now, let's error to be strict,
        # or log warning and hit live if we want to be lenient.
        # Strict is better for reproducible tests.
        raise FileNotFoundError(
            f"Cassette not found for {url} in replay mode. Path: {cassette_path}"
        )

    if mode == MODE_RECORD:
      # Execute the real function
      response = fn(url, req, *args, **kwargs)

      # Only record successful responses (assuming dict response implies success/parsed JSON)
      # The wrapped functions (get/post) usually raise ValueError on non-200,
      # so if we are here, it's likely a success or a handled error returning a dict.
      # We'll assume if it returns a dict, it's worth saving.
      # If the underlying function returns something else, we might need to adjust.
      # datacommons.py get/post return dicts.

      # Ensure directory exists
      os.makedirs(CASSETTE_DIR, exist_ok=True)

      with open(cassette_path, 'w') as f:
        json.dump(response, f, indent=2, sort_keys=True)
      
      logging.info(f"Recorded mixer response to {cassette_path}")
      return response

    # Fallback for unknown modes
    return fn(url, req, *args, **kwargs)

  return wrapper
