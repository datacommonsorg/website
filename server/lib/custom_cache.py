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
from flask import request
from server.lib.cache import cache

logger = logging.getLogger(__name__)


def cache_and_log(timeout, query_string: bool = False, make_cache_key=None):
  # This is the outer decorator function. It takes the decorator's arguments
  # (timeout, query_string, make_cache_key) and returns the actual decorator.

  def decorator(f):
    # This is the actual decorator. It takes the function to be decorated (f)
    # and returns the wrapped function.

    # This nested function generates the cache key. It has access to the
    # make_cache_key from the outer scope (closure).
    def get_cache_key(*args, **kwargs):
      # if a custom key function is provided, use it
      print("make cache key: ", make_cache_key) # Preserve user's print statement
      if make_cache_key:
        key = make_cache_key() # Pass f to custom key maker
      else:
        # Otherwise, use the default cache key maker
        key = cache._memoize_make_cache_key()(f, *args, **kwargs)
      # If query_string is True, append the request query string to the key
      if query_string:
        # Ensure request is available in context for query_string
        if request:
          return key + request.query_string.decode('utf-8')
      return key

    # This nested function handles logging cache hits.
    def log_cache_hit(key, cached_result):
      try:
        if isinstance(cached_result, Response):
          # The cached result is a Flask Response object.
          # .get_json() parses the response data as JSON.
          cached_data = cached_result.get_json()
        else:
          # The cached result is a dict.
          cached_data = cached_result

        unique_id = cached_data.get("requestId")
        print("cache hit! requestId from cache: ", unique_id) # Preserve user's print statement
        if unique_id:
          logger.info(
              f"Cache hit for key {key} with unique ID {unique_id}")
        else:
          # more than one ID
          ids = cached_data.get("requestIds")
          if ids:
            logger.info(f"Cache hit for key {key} with MANY Ids {ids}")
      except Exception as e:
        logger.error(f"Error logging cache hit for key {key}: {e}")

    # Check if the function being decorated is an asynchronous coroutine function.
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
        print("cache miss") # Preserve user's print statement
        result = await f(*args, **kwargs) # Await the async function
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
        print("cache miss") # Preserve user's print statement
        result = f(*args, **kwargs) # Call the synchronous function directly
        cache.set(key, result, timeout=timeout)
        return result
      return sync_wrapper

  return decorator
