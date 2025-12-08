import base64
import gzip
import hashlib
import io
import json
import logging
import os
import threading
import time
from typing import Any, Dict, Optional, Set

from flask import Flask
from flask import request
from flask import Response
from werkzeug.utils import secure_filename

from server.lib.recorder.fallbacks import FALLBACK_RESPONSES
from server.lib.recorder.fallbacks import PREFIX_FALLBACK_RESPONSES

# Environment variables
RECORDING_MODE_ENV = 'WEBDRIVER_RECORDING_MODE'
RECORDING_DIR_ENV = 'RECORDING_DIR'

# Modes
MODE_RECORD = 'record'
MODE_REPLAY = 'replay'
MODE_LIVE = 'live'

# Stats
RECORDING_FOUND_COUNT = 0
RECORDING_NOT_FOUND_COUNT = 0
RECORDING_SKIPPED_COUNT = 0
RECORDED_HASHES: Set[str] = set()
RECORDING_NOT_FOUND_BY_PATH: Dict[str, int] = {}


def log_recording_stats():
  """Logs recording stats to stdout."""
  global RECORDING_FOUND_COUNT, RECORDING_NOT_FOUND_COUNT, RECORDING_SKIPPED_COUNT, RECORDING_NOT_FOUND_BY_PATH
  print(
      f"Recording Stats - Found: {RECORDING_FOUND_COUNT}, Not Found: {RECORDING_NOT_FOUND_COUNT}, Skipped: {RECORDING_SKIPPED_COUNT}",
      flush=True)
  if RECORDING_NOT_FOUND_BY_PATH:
    print(
        f"Missing Recordings by Path: {json.dumps(RECORDING_NOT_FOUND_BY_PATH, sort_keys=True)}",
        flush=True)


def _get_recording_dir() -> str:
  return os.environ.get(RECORDING_DIR_ENV,
                        'server/tests/test_data/webdriver_recordings')


def _sort_lists(obj):
  """Recursively sorts lists in a JSON object."""
  if isinstance(obj, dict):
    return {k: _sort_lists(v) for k, v in obj.items()}
  elif isinstance(obj, list):
    # Sort list elements using deterministic JSON string representation
    return sorted([_sort_lists(x) for x in obj],
                  key=lambda x: json.dumps(x, sort_keys=True))
  else:
    return obj


PATH_ALLOWED_JSON_FIELDS = {
    '/api/explore/fulfill': {
        'entities', 'variables', 'childEntityType', 'comparisonEntities'
    },
    '/api/explore/follow-up-questions': {'q'},
    '/api/explore/detect-and-fulfill': {'q'},
    '/api/variable-group/info': {'dcid', 'numEntitiesExistence'}
}

PATH_ALLOWED_ARG_FIELDS = {
    '/api/explore/fulfill': {'chartType'},
    '/api/explore/detect-and-fulfill': {'q', 'chartType'}
}


def _normalize_data(data: Dict,
                    req_path: str,
                    allowed_fields: Dict[str, Set[str]] = None) -> Dict:
  """Normalizes data (args or json) to ensure deterministic hashing."""

  # Create a copy to avoid modifying the original request
  normalized = data.copy()

  # Use provided allowed_fields or default to empty (or global if needed, but better to be explicit)
  if allowed_fields:
    # Check if path has specific allowed fields
    for path, allowed in allowed_fields.items():
      if req_path.endswith(path):
        normalized = {k: v for k, v in normalized.items() if k in allowed}
        break

  # Remove keys with None values
  keys_to_remove = [k for k, v in normalized.items() if v is None]
  for k in keys_to_remove:
    del normalized[k]

  return normalized


def _get_request_hash(request) -> str:
  """Generates a hash for the request."""
  req_path = request.path

  # Sort args
  args = request.args.to_dict(flat=False)
  # Normalize args
  args = _normalize_data(args, req_path, PATH_ALLOWED_ARG_FIELDS)
  # Sort lists in args to ensure determinism for multi-value params
  args = _sort_lists(args)
  sorted_args = json.dumps(args, sort_keys=True)

  req_json = request.get_json(silent=True)

  # Normalize and sort lists in the request JSON to ensure determinism.
  if req_json:
    req_json = _normalize_data(req_json, req_path, PATH_ALLOWED_JSON_FIELDS)
    req_json = _sort_lists(req_json)

  # Sort JSON body if it's a dict or list
  sorted_json = json.dumps(req_json, sort_keys=True) if req_json else ""

  # Combine path, sorted args, and sorted json
  combined = f"{req_path}|{sorted_args}|{sorted_json}"
  return hashlib.sha1(combined.encode('utf-8')).hexdigest()


# Path grouping configuration
PATH_GROUPING = {
    '/api/node/triples/out/': 'api_node_triples_out',
    '/api/place/charts/': 'api_place_charts',
    '/api/place/overview-table/': 'api_place_overview-table',
    '/api/place/related-places/': 'api_place_related-places',
    '/api/place/summary/': 'api_place_summary',
    '/api/place/mapinfo/': 'api_place_mapinfo',
    '/api/place/type/': 'api_place_type',
    '/api/ranking/': 'api_ranking',
}


def _get_recording_path(req_path: str, hash_key: str) -> str:
  """Generates the file path for the recording."""
  # Check for path grouping
  slug = None
  for prefix, group_name in PATH_GROUPING.items():
    if req_path.startswith(prefix):
      slug = group_name
      break

  if not slug:
    # Clean up path for filename if no group found
    # Use secure_filename to ensure the filename is safe
    slug = secure_filename(req_path)
    if not slug:
      slug = "root"

  recording_dir = _get_recording_dir()
  return os.path.join(recording_dir, slug, f"{hash_key}.json")


def _create_response_from_recording(data: Dict) -> Response:
  """Creates a Flask Response object from recording data."""
  resp_data = data['response_body']
  mimetype = data.get('mimetype', 'application/json')
  encoding = data.get('encoding')

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


def register_recorder(app: Flask):
  """Registers the recorder middleware with the Flask app."""
  mode = os.environ.get(RECORDING_MODE_ENV, MODE_LIVE).lower()

  if mode not in [MODE_RECORD, MODE_REPLAY]:
    return

  logging.warning(f"Initializing Webdriver Recorder in {mode} mode")

  @app.before_request
  def handle_before_request():
    if mode not in [MODE_RECORD, MODE_REPLAY]:
      return

    # Only record API calls
    if not request.path.startswith('/api/'):
      return

    try:
      req_json = request.get_json(silent=True)
      hash_key = _get_request_hash(request)
      recording_path = _get_recording_path(request.path, hash_key)

      global RECORDING_FOUND_COUNT, RECORDING_NOT_FOUND_COUNT, RECORDING_SKIPPED_COUNT, RECORDING_NOT_FOUND_BY_PATH

      # Short-circuit for RECORD mode if already recorded in this session
      if mode == MODE_RECORD:
        if hash_key in RECORDED_HASHES:
          # If we have it in memory, we can try to return it from disk to simulate the response
          # This avoids hitting the backend.
          if os.path.exists(recording_path):
            with open(recording_path, 'r') as f:
              data = json.load(f)
              RECORDING_SKIPPED_COUNT += 1
              if RECORDING_SKIPPED_COUNT % 50 == 0:
                log_recording_stats()
              logging.warning(
                  f"Skipping backend for {request.path} (already recorded)")
              return _create_response_from_recording(data)
        return

    # REPLAY MODE
      if os.path.exists(recording_path):
        with open(recording_path, 'r') as f:
          data = json.load(f)
          RECORDING_FOUND_COUNT += 1
          if (RECORDING_FOUND_COUNT + RECORDING_NOT_FOUND_COUNT) % 50 == 0:
            log_recording_stats()

          return _create_response_from_recording(data)
      else:
        # Check for fallback responses (static or dynamic)
        handler = FALLBACK_RESPONSES.get(request.path)

        # Check for prefix fallbacks if no exact match
        if not handler:
          for prefix, h in PREFIX_FALLBACK_RESPONSES.items():
            if request.path.startswith(prefix):
              handler = h
              break

        if handler:
          logging.warning(
              f"Recording not found for {request.path}. Returning fallback response."
          )
          log_recording_stats()
          if callable(handler):
            return handler(request)
          else:
            # Should not happen with current implementation but for safety
            return Response(json.dumps(handler),
                            mimetype='application/json',
                            headers={'X-Webdriver-Dummy-Response': 'true'})

        RECORDING_NOT_FOUND_COUNT += 1
        if request.path not in RECORDING_NOT_FOUND_BY_PATH:
          RECORDING_NOT_FOUND_BY_PATH[request.path] = 0
        RECORDING_NOT_FOUND_BY_PATH[request.path] += 1

        if (RECORDING_FOUND_COUNT + RECORDING_NOT_FOUND_COUNT) % 50 == 0:
          log_recording_stats()

        # If not found and no fallback, we let it fall through to the backend (which might be mocked or live)
        # In strict replay mode, we might want to error out here.
        logging.warning(
            f"Recording not found for {request.path}. Hash: {hash_key}. Falling through to live backend."
        )
        return None

    except Exception as e:
      logging.error(f"Error in recorder before_request: {e}")

  @app.after_request
  def handle_record(response: Response):
    if mode not in [MODE_RECORD, MODE_REPLAY]:
      return response

    # Check for dummy response header
    if response.headers.get('X-Webdriver-Dummy-Response') == 'true':
      return response

    # Only record API calls
    if not request.path.startswith('/api/'):
      return response

    # Only record successful responses
    if response.status_code != 200:
      return response

    try:
      req_json = request.get_json(silent=True)
      hash_key = _get_request_hash(request)

      # Check in-memory cache
      if hash_key in RECORDED_HASHES:
        return response

      recording_path = _get_recording_path(request.path, hash_key)

      # Don't overwrite existing recordings (especially important in REPLAY mode)
      if os.path.exists(recording_path):
        return response

      logging.warning(
          f"Recording new recording for {request.path}. Hash: {hash_key}")

      encoding = None

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

      record_data = {
          'url': request.path,
          'args': dict(request.args),
          'json': req_json,
          'mimetype': response.mimetype,
          'encoding': encoding,
          'response_body': resp_body
      }

      os.makedirs(os.path.dirname(recording_path), exist_ok=True)
      # Atomic write to avoid race conditions
      temp_path = f"{recording_path}.tmp.{os.getpid()}.{threading.get_ident()}"

      with open(temp_path, 'w') as f:
        json.dump(record_data, f, indent=2)
      os.rename(temp_path, recording_path)

      # Add to cache
      RECORDED_HASHES.add(hash_key)

      logging.warning(f"Recorded {request.path} to {recording_path}")

    except Exception as e:
      logging.warning(f"Failed to record response for {request.path}: {e}")

    return response
