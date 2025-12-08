import json


class RecorderStats:
  """Tracks statistics for the recorder middleware."""

  def __init__(self):
    self.found_count = 0
    self.fallback_dummy_count = 0
    self.fallback_live_count = 0
    self.not_found_by_path: dict[str, int] = {}
    self.recorded_hashes: set[str] = set()

  def is_recorded(self, hash_key: str) -> bool:
    """Checks if a request hash has already been recorded in this session."""
    return hash_key in self.recorded_hashes

  def add_recorded_hash(self, hash_key: str):
    """Adds a request hash to the set of recorded hashes."""
    self.recorded_hashes.add(hash_key)

  def increment_found(self):
    """Increments the count of recordings found and replayed."""
    self.found_count += 1
    self.log_if_needed()

  def increment_fallback_dummy(self):
    """Increments the count of requests handled by a fallback dummy response."""
    self.fallback_dummy_count += 1
    self.log_if_needed()

  def increment_fallback_live(self, path: str):
    """Increments the count of requests falling back to the live backend."""
    self.fallback_live_count += 1
    self.not_found_by_path[path] = self.not_found_by_path.get(path, 0) + 1
    self.log_if_needed()

  def log_if_needed(self):
    """Logs stats if the total count is a multiple of 50."""
    total = (self.found_count + self.fallback_dummy_count +
             self.fallback_live_count)
    if total % 50 == 0:
      self.log_stats()

  def log_stats(self):
    """Logs the current statistics to stdout."""
    print(
        f"Recording Stats - Found: {self.found_count}, Fallback Dummy: {self.fallback_dummy_count}, Fallback Live: {self.fallback_live_count}",
        flush=True)
    if self.not_found_by_path:
      print(
          f"Missing Recordings by Path: {json.dumps(self.not_found_by_path, sort_keys=True)}",
          flush=True)
