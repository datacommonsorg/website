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

import hashlib
import json
from typing import Any, Dict, Set

# Constants for hashing normalization
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


class RequestHasher:
  """Handles request normalization and hashing for the recorder."""

  def get_hash(self, request) -> str:
    """Generates a hash for the request."""
    req_path = request.path

    # Sort args
    args = request.args.to_dict(flat=False)
    # Normalize args
    args = self._normalize_data(args, req_path, PATH_ALLOWED_ARG_FIELDS)
    # Sort lists in args to ensure determinism for multi-value params
    args = self._sort_lists(args)
    sorted_args = json.dumps(args, sort_keys=True)

    req_json = request.get_json(silent=True)

    # Normalize and sort lists in the request JSON to ensure determinism.
    if req_json:
      req_json = self._normalize_data(req_json, req_path,
                                      PATH_ALLOWED_JSON_FIELDS)
      req_json = self._sort_lists(req_json)

    # Sort JSON body if it's a dict or list
    sorted_json = json.dumps(req_json, sort_keys=True) if req_json else ""

    # Combine path, sorted args, and sorted json
    combined = f"{req_path}|{sorted_args}|{sorted_json}"
    return hashlib.sha1(combined.encode('utf-8')).hexdigest()

  def _normalize_data(self,
                      data: Dict,
                      req_path: str,
                      allowed_fields: Dict[str, Set[str]] = None) -> Dict:
    """Normalizes data (args or json) to ensure deterministic hashing."""

    # Create a copy to avoid modifying the original request
    normalized = data.copy()

    # Use provided allowed_fields or default to empty
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

  def _sort_lists(self, obj: Any) -> Any:
    """Recursively sorts lists in a JSON object."""
    if isinstance(obj, dict):
      return {k: self._sort_lists(v) for k, v in obj.items()}
    elif isinstance(obj, list):
      # Sort list elements using deterministic JSON string representation
      return sorted([self._sort_lists(x) for x in obj],
                    key=lambda x: json.dumps(x, sort_keys=True))
    else:
      return obj
