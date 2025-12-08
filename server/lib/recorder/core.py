# Copyright 2025 Google LLC
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

import base64
import logging
import os
from typing import Dict

from flask import Flask
from flask import request
from flask import Response

from server.lib.recorder.fallbacks import FALLBACK_RESPONSES
from server.lib.recorder.fallbacks import PREFIX_FALLBACK_RESPONSES
from server.lib.recorder.hashing import RequestHasher
from server.lib.recorder.stats import RecorderStats
from server.lib.recorder.storage import Recording
from server.lib.recorder.storage import RecordingStorage

# Environment variables
RECORDING_MODE_ENV = 'WEBDRIVER_RECORDING_MODE'

# Modes
# Record new responses and save to disk
MODE_RECORD = 'record'
# Replay responses from disk (default for local and cloud testing)
MODE_REPLAY = 'replay'
# Bypass recorder entirely (can be used for releases)
MODE_LIVE = 'live'


class Recorder:
  """Webdriver Recorder middleware."""

  def __init__(self, app: Flask = None):
    self.stats = RecorderStats()
    self.hasher = RequestHasher()
    self.storage = RecordingStorage()
    self.mode = os.environ.get(RECORDING_MODE_ENV, MODE_LIVE).lower()
    if app:
      self.init_app(app)

  def init_app(self, app: Flask):
    """Registers the recorder middleware with the Flask app."""
    if self.mode not in [MODE_RECORD, MODE_REPLAY]:
      return

    print(f"Initializing Webdriver Recorder in {self.mode} mode")

    app.before_request(self._handle_before_request)
    app.after_request(self._handle_after_request)

  def _handle_before_request(self):
    """Handles request interception before it reaches the view."""
    if self.mode not in [MODE_RECORD, MODE_REPLAY]:
      return

    # Only record API calls
    if not request.path.startswith('/api/'):
      return

    try:
      hash_key = self.hasher.get_hash(request)

      # Short-circuit for RECORD mode if already recorded in this session
      if self.mode == MODE_RECORD:
        if self.stats.is_recorded(hash_key):
          # If we have it in memory, we can try to return it from disk to simulate the response
          # This avoids hitting the backend.
          recording_path = self.storage.get_recording_path(
              request.path, hash_key)
          data = self.storage.load_record(recording_path)
          if data:
            logging.debug(
                f"Skipping backend for {request.path} (already recorded)")
            return self._create_response_from_recording(data)
        return

      # REPLAY MODE
      recording_path = self.storage.get_recording_path(request.path, hash_key)
      return self._try_replay(request, hash_key, recording_path)

    except Exception as e:
      logging.error(f"Error in recorder before_request: {e}")

  def _handle_after_request(self, response: Response) -> Response:
    """Handles response interception after the view has processed it."""
    if self.mode not in [MODE_RECORD, MODE_REPLAY]:
      return response

    # Check for dummy response header
    if response.headers.get('X-Webdriver-Dummy-Response') == 'true':
      return response

    # Only record API calls
    if not request.path.startswith('/api/'):
      return response

    try:
      if self.mode == MODE_RECORD:
        hash_key = self.hasher.get_hash(request)
        recording_path = self.storage.get_recording_path(request.path, hash_key)
        self._save_recording(request, response, hash_key, recording_path)

    except Exception as e:
      logging.error(f"Error in recorder after_request: {e}")

    return response

  def _try_replay(self, request, hash_key: str,
                  recording_path: str) -> Response | None:
    """Attempts to replay a recording or fallback."""
    data = self.storage.load_record(recording_path)
    if data:
      self.stats.increment_found()
      return self._create_response_from_recording(data)

    # Check for fallback responses (static or dynamic)
    handler = FALLBACK_RESPONSES.get(request.path)

    # Check for prefix fallbacks if no exact match
    if not handler:
      for prefix, h in PREFIX_FALLBACK_RESPONSES.items():
        if request.path.startswith(prefix):
          handler = h
          break

    if handler:
      logging.debug(
          f"Recording not found for {request.path}. Returning fallback response."
      )
      self.stats.increment_fallback_dummy()

      if callable(handler):
        return handler(request)
      else:
        # Should not happen with current implementation but for safety
        return Response(self._json_dumps(handler),
                        mimetype='application/json',
                        headers={'X-Webdriver-Dummy-Response': 'true'})

    self.stats.increment_fallback_live(request.path)

    # If not found and no fallback, we let it fall through to the backend (which might be mocked or live)
    logging.debug(
        f"Recording not found for {request.path}. Hash: {hash_key}. Falling through to live backend."
    )
    return None

  def _save_recording(self, request, response: Response, hash_key: str,
                      recording_path: str):
    """Saves the response to a recording file."""
    # Don't overwrite existing recordings
    if os.path.exists(recording_path):
      logging.debug(
          f"Recording already exists for {request.path} at {recording_path}. Skipping write."
      )
      return

    logging.debug(
        f"Recording new recording for {request.path}. Hash: {hash_key}")

    encoding = None
    resp_body = None

    # Check for gzip encoding
    if response.headers.get('Content-Encoding') == 'gzip':
      # Store as base64 encoded gzip for size efficiency
      try:
        compressed_data = response.get_data()
        resp_body = base64.b64encode(compressed_data).decode('utf-8')
        encoding = 'gzip'
      except Exception as e:
        logging.warning(f"Failed to process gzip response: {e}")
        # Fallback to base64 encoded raw bytes
        resp_body = base64.b64encode(response.get_data()).decode('utf-8')
    else:
      # Assume text
      resp_body = response.get_data(as_text=True)

    record = Recording(request_path=request.path,
                       request_args=dict(request.args),
                       request_json=request.get_json(silent=True),
                       response_mimetype=response.mimetype,
                       response_encoding=encoding,
                       response_body=resp_body)

    self.storage.save_record(recording_path, record)

    # Add to cache
    self.stats.add_recorded_hash(hash_key)

    logging.debug(f"Recorded {request.path} to {recording_path}")

  def _create_response_from_recording(self, record: Recording) -> Response:
    """Creates a Flask Response object from recording data."""
    resp_data = record.response_body
    mimetype = record.response_mimetype
    encoding = record.response_encoding

    headers = {}
    if encoding == 'gzip':
      # Decode base64 to get back the compressed bytes
      try:
        resp_data = base64.b64decode(resp_data)
        headers['Content-Encoding'] = 'gzip'
      except Exception as e:
        logging.error(f"Failed to decode base64 gzip body: {e}")
        # Fallback or re-raise? For now let's return as is, though it might be broken

    return Response(response=resp_data,
                    status=200,
                    mimetype=mimetype,
                    headers=headers)

  def _json_dumps(self, obj):
    """Helper to dump JSON (can be moved to utils if needed)."""
    import json
    return json.dumps(obj)


def init_recorder(app: Flask):
  """Initializes the recorder middleware."""
  Recorder(app)
