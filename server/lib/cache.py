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
import logging
import os
from pathlib import Path

from flask import has_request_context
from flask import request
from flask_caching import Cache

import server.lib.config as lib_config
import server.lib.redis as lib_redis

import asyncio
from functools import wraps
from flask import Response

logger = logging.getLogger(__name__)

# _redis_cache is a redis cache client when a redis config is available.
# It will be used by the regular flask "cache" and/or the flask "model_cache".
_redis_cache = None

# cache is the default flask cache for endpoints.
cache = None

# model_cache is flask cache for endpoints that invoke vertex models.
model_cache = None

redis_config = lib_redis.get_redis_config()
REDIS_HOST = os.environ.get('REDIS_HOST', '')

# Setup model_cache, use redis if available, otherwise use filesystem cache
# which is good for local development.
if redis_config:
  redis_host = redis_config['host']
  redis_port = redis_config['port']
  _redis_cache = Cache(
      config={
          'CACHE_TYPE': 'RedisCache',
          'CACHE_REDIS_HOST': redis_host,
          'CACHE_REDIS_PORT': redis_port,
          'CACHE_REDIS_URL': 'redis://{}:{}'.format(redis_host, redis_port)
      })
  model_cache = _redis_cache
else:
  model_cache = Cache(
      config={
          'CACHE_TYPE': 'FileSystemCache',
          'CACHE_DIR': os.path.join(Path(__file__).parents[2], '.cache')
      })

cfg = lib_config.get_config()
# Configure cache if USE_MEMCACHE is set, or if there's a REDIS_HOST environment
# variable
if cfg.USE_MEMCACHE or REDIS_HOST:
  # Setup regular flask cache. Use Redis if available, otherwise use SimpleCache.
  if _redis_cache:
    cache = _redis_cache
  else:
    cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
elif cfg.LOCAL:
  cache = Cache(
      config={
          'CACHE_TYPE': 'FileSystemCache',
          'CACHE_DIR': os.path.join(Path(__file__).parents[2], '.cache')
      })
else:
  # For some instance with fast updated data, we may not want to use memcache.
  cache = Cache(config={'CACHE_TYPE': 'NullCache'})


def should_skip_cache():
  """Check if cache should be skipped based on request header.
  
  Returns:
    True if X-Skip-Cache header is set to 'true', False otherwise.
    Always returns False on any error to ensure caching remains functional.
  """
  if not has_request_context():
    # Cannot skip cache if there is no request context (e.g., in a thread).
    return False
  try:
    skip_cache_header = request.headers.get('X-Skip-Cache')
    return skip_cache_header is not None and str(
        skip_cache_header).lower() == 'true'
  except Exception:
    logging.warning("Error checking X-Skip-Cache header.", exc_info=True)
    # Any error should default to False to preserve normal caching behavior
    return False
  
# memoize_and_log_response_id
def cache_and_log(timeout=300):
  """
  Wraps cache.memoize and runs a logging function on the
  final result, regardless of cache status.
  """
  def decorator(fn):
      # create the memoized version of the function 
      memoized_fn = cache.memoize(timeout)(fn)

      @functools.wraps(fn)  # Wrap the *original* fn to keep its name/docs
      def wrapper(*args, **kwargs):
          
          # will either return a cached value or run the function and cache it.
          result = memoized_fn(*args, **kwargs)

          # log response
          try:
              log_request_id(result, True) # todo: define this fun, diff between cache hits and misses
              # or just subtract 1 from num times used
          except Exception as e:
              logger.warning(f"Error logging response for {fn.__name__}: {e}")

          return result
      return wrapper
  return decorator


def log_request_id(result, is_hit):
      print("hitting logger!")
      try:
        # Handling flask responses and regular dicts
        if isinstance(result, Response):
          cached_data = result.get_json()
        else:
          cached_data = result

        unique_id = cached_data.get("requestId")
        # TODO: these should all be logged as lists for consistency
        if unique_id:
          logger.info(f"Cache hit for ID {unique_id}") if is_hit else logger.info(f"Cache miss for ID {unique_id}")
        else:
          # more than one ID, for higher-level functions that make multiple mixer requests
          ids = cached_data.get("requestIds")
          if ids:
            logger.info(f"Cache hit for IDs {ids}")
      except Exception as e:
        logger.info(f"Cache hit for IDs {unique_id}") if is_hit else logger.info(f"Cache miss for IDs {unique_id}")

# # TODO: handle unless, etc. and other options
# def cache_and_log(timeout, query_string: bool = False, make_cache_key=None):

#   def decorator(f):

#     def get_cache_key(*args, **kwargs):
#       # if a custom key function is provided, use it
#       if make_cache_key:
#         key = make_cache_key()
#       else:
#         # Otherwise, use the default cache key maker
#         key = cache._memoize_make_cache_key()(f, *args, **kwargs)
#       # If query_string is True, append the request query string to the key
#       if query_string:
#         # Make sure the request is available in context for query_string
#         if request:
#           return key + request.query_string.decode('utf-8')
#       return key

#     # TODO: modify this to log all IDs with an indicator if it was a hit/miss
#     def log_request_id(result, is_hit):
#       try:
#         # Handling flask responses and regular dicts
#         if isinstance(result, Response):
#           cached_data = result.get_json()
#         else:
#           cached_data = result

#         unique_id = cached_data.get("requestId")
#         # TODO: these should all be logged as lists for consistency
#         if unique_id:
#           logger.info(f"Cache hit for ID {unique_id}") if is_hit else logger.info(f"Cache miss for ID {unique_id}")
#         else:
#           # more than one ID, for higher-level functions that make multiple mixer requests
#           ids = cached_data.get("requestIds")
#           if ids:
#             logger.info(f"Cache hit for IDs {ids}")
#       except Exception as e:
#         logger.info(f"Cache hit for IDs {unique_id}") if is_hit else logger.info(f"Cache miss for IDs {unique_id}")

#     # Handling async functions -- TODO: clean this up
#     if asyncio.iscoroutinefunction(f):
#       # If it's an async function, return an async wrapper.
#       @wraps(f)
#       async def async_wrapper(*args, **kwargs):
#         key = get_cache_key(f, *args, **kwargs)
#         cached_result = cache.get(key)
#         if cached_result is not None:
#           log_request_id(cached_result, True)
#           return cached_result

#         # Cache miss
#         result = await f(*args, **kwargs)  # Await the async function
#         cache.set(key, result, timeout=timeout)
#         # Log the cache miss as well as a hit
#         log_request_id(result, False)
#         return result

#       return async_wrapper
#     else:
#       # If it's a synchronous function, return a synchronous wrapper.
#       @wraps(f)
#       def sync_wrapper(*args, **kwargs):
#         key = get_cache_key(f, *args, **kwargs)
#         cached_result = cache.get(key)
#         if cached_result is not None:
#           log_request_id(cached_result)
#           return cached_result

#         # Cache miss
#         result = f(*args, **kwargs)  # calling the function directly
#         cache.set(key, result, timeout=timeout)
#         return result

#       return sync_wrapper

#   return decorator