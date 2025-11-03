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
import logging
from functools import wraps
from flask import Response
from server.lib.cache import cache

logger = logging.getLogger(__name__)


def cache_and_log(timeout):

  def decorator(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):
      # Generate the cache key
      key = cache._memoize_make_cache_key()(f, *args, **kwargs)
      # Try to get the result from the cache
      cached_result = cache.get(key)

      if cached_result is not None:
        # Cache hit
        try:
          if isinstance(cached_result, Response):
            # The cached result is a Flask Response object.
            # .get_json() parses the response data as JSON.
            cached_data = cached_result.get_json()
          else:
            # The cached result is a dict.
            cached_data = cached_result

          unique_id = cached_data.get("requestId")
          print("cache hit! requestId from cache: ", unique_id)
          if unique_id:
            logger.info(
                f"Cache hit for key {key} with unique ID {unique_id}")
        except Exception as e:
          logger.error(f"Error logging cache hit for key {key}: {e}")
        return cached_result

      # Cache miss
      print("cache miss")
      # Check if the function we're decorating is async
      if asyncio.iscoroutinefunction(f):
        # If it is, we get the coroutine
        coro = f(*args, **kwargs)
        # And then we run it to get the actual result
        result = asyncio.run(coro)
      else:
        # Otherwise, just call the synchronous function
        result = f(*args, **kwargs)
      cache.set(key, result, timeout=timeout)
      return result

    return decorated_function

  return decorator
