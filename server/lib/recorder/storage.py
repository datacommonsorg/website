import json
import os
import threading

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field
from werkzeug.utils import secure_filename

RECORDING_DIR_ENV = 'RECORDING_DIR'

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


class Recording(BaseModel):
  """Represents a recorded HTTP interaction (request and response)."""
  model_config = ConfigDict(populate_by_name=True)

  # Request URL path (e.g., /api/place/stats/vars)
  request_path: str
  # Request query parameters
  request_args: dict
  # Request JSON body (if any)
  request_json: dict | list | None
  # Response MIME type (e.g., application/json)
  response_mimetype: str
  # Response content encoding (e.g., 'gzip' or None). If 'gzip', response_body is base64 encoded.
  response_encoding: str | None
  # Response body content. If encoding is 'gzip', this is a base64 encoded string.
  response_body: str


class RecordingStorage:
  """Handles file path generation and storage for recordings."""

  def __init__(self, base_dir: str = None):
    self.base_dir = base_dir or os.environ.get(
        RECORDING_DIR_ENV, 'server/tests/test_data/webdriver_recordings')

  def get_recording_path(self, req_path: str, hash_key: str) -> str:
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

    return os.path.join(self.base_dir, slug, f"{hash_key}.json")

  def load_record(self, path: str) -> Recording | None:
    """Loads a recording from disk if it exists."""
    if os.path.exists(path):
      with open(path, 'r') as f:
        try:
          data = json.load(f)
          return Recording(**data)
        except Exception as e:
          # Handle corrupted files or schema mismatches
          print(f"Error loading recording {path}: {e}")
          return None
    return None

  def save_record(self, path: str, record: Recording):
    """Saves a recording to disk atomically."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # Atomic write to avoid race conditions
    temp_path = f"{path}.tmp.{os.getpid()}.{threading.get_ident()}"

    with open(temp_path, 'w') as f:
      f.write(record.model_dump_json(indent=2, by_alias=True))
    os.rename(temp_path, path)
