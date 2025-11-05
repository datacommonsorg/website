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
"""Custom cache that logs mixer request IDs from cache hits"""

import asyncio
from functools import wraps
import logging

from flask import request
from flask import Response

from server.lib.cache import cache

logger = logging.getLogger(__name__)


# TODO: handle unless, etc. and other options
def cache_and_log(timeout, query_string: bool = False, make_cache_key=None):

  def decorator(f):

    def get_cache_key(*args, **kwargs):
      # if a custom key function is provided, use it
      if make_cache_key:
        key = make_cache_key()
      else:
        # Otherwise, use the default cache key maker
        key = cache._memoize_make_cache_key()(f, *args, **kwargs)
      # If query_string is True, append the request query string to the key
      if query_string:
        # Make sure the request is available in context for query_string
        if request:
          return key + request.query_string.decode('utf-8')
      return key

    # TODO: modify this to log all IDs with an indicator if it was a hit/miss
    def log_cache_hit(key, cached_result):
      try:
        # Handling flask responses and regular dicts
        if isinstance(cached_result, Response):
          cached_data = cached_result.get_json()
        else:
          cached_data = cached_result

        unique_id = cached_data.get("requestId")
        # TODO: these should all be logged as lists for consistency
        if unique_id:
          logger.info(f"Cache hit for ID {unique_id}")
        else:
          # more than one ID, for higher-level functions that make multiple mixer requests
          ids = cached_data.get("requestIds")
          if ids:
            logger.info(f"Cache hit for IDs {ids}")
      except Exception as e:
        logger.error(f"Error logging cache hit for key {key}: {e}")

    # Handling async functions -- TODO: clean this up
    if asyncio.iscoroutinefunction(f):
      # If it's an async function, return an async wrapper.
      @wraps(f)
      async def async_wrapper(*args, **kwargs):
        key = get_cache_key(f, *args, **kwargs)
        cached_result = cache.get(key)
        if cached_result is not None:
          log_cache_hit(key, cached_result)
          return cached_result

        # Cache miss
        result = await f(*args, **kwargs)  # Await the async function
        cache.set(key, result, timeout=timeout)
        return result

      return async_wrapper
    else:
      # If it's a synchronous function, return a synchronous wrapper.
      @wraps(f)
      def sync_wrapper(*args, **kwargs):
        key = get_cache_key(f, *args, **kwargs)
        cached_result = cache.get(key)
        if cached_result is not None:
          log_cache_hit(key, cached_result)
          return cached_result

        # Cache miss
        result = f(*args, **kwargs)  # calling the function directly
        cache.set(key, result, timeout=timeout)
        return result

      return sync_wrapper

  return decorator
