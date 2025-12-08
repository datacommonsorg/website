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

from functools import wraps
import json
import threading


def locked(method):
  """Decorator to synchronize method calls using the instance's lock."""

  @wraps(method)
  def wrapper(self, *args, **kwargs):
    with self._lock:
      return method(self, *args, **kwargs)

  return wrapper


class RecorderStats:
  """Tracks statistics for the recorder middleware."""

  def __init__(self):
    self.found_count = 0
    self.fallback_fake_count = 0
    self.fallback_live_count = 0
    self.not_found_by_path: dict[str, int] = {}
    self.recorded_hashes: set[str] = set()
    self._lock = threading.RLock()

  @locked
  def is_recorded(self, hash_key: str) -> bool:
    """Checks if a request hash has already been recorded in this session."""
    return hash_key in self.recorded_hashes

  @locked
  def add_recorded_hash(self, hash_key: str):
    """Adds a request hash to the set of recorded hashes."""
    self.recorded_hashes.add(hash_key)

  @locked
  def increment_found(self):
    """Increments the count of recordings found and replayed."""
    self.found_count += 1
    self.log_if_needed()

  @locked
  def increment_fallback_fake(self):
    """Increments the count of requests handled by a fallback fake response."""
    self.fallback_fake_count += 1
    self.log_if_needed()

  @locked
  def increment_fallback_live(self, path: str):
    """Increments the count of requests falling back to the live backend."""
    self.fallback_live_count += 1
    self.not_found_by_path[path] = self.not_found_by_path.get(path, 0) + 1
    self.log_if_needed()

  @locked
  def log_if_needed(self):
    """Logs stats if the total count is a multiple of 50."""
    total = (self.found_count + self.fallback_fake_count +
             self.fallback_live_count)
    if total % 50 == 0:
      self.log_stats()

  @locked
  def log_stats(self):
    """Logs the current statistics to stdout."""
    print(
        f"Recording Stats - Found: {self.found_count}, Fallback Fake: {self.fallback_fake_count}, Fallback Live: {self.fallback_live_count}",
        flush=True)
    if self.not_found_by_path:
      print(
          f"Missing Recordings by Path: {json.dumps(self.not_found_by_path, sort_keys=True)}",
          flush=True)
