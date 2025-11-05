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

# todo; rename cached_fn to fn when logging key is removed
def _cache_wrapper(fn, cached_fn, get_logging_key_fn):
  @functools.wraps(fn)
  def wrapper(*args, **kwargs):
      result = cached_fn(*args, **kwargs)

      key = get_logging_key_fn(fn, *args, **kwargs)
      res = cache.get(key)
      is_hit = res is not None

      try:
          log_request_id(result, is_hit)
      except Exception as e:
          logger.warning(f"Error logging response for {fn.__name__}: {e}")

      return result
  return wrapper


# memoize_and_log_response_id
def cache_and_log(timeout=300, query_string=False, make_cache_key=None, unless=False):
  """
  Wraps cache.cached and runs a logging function on the
  final result, regardless of cache status.
  """
  def decorator(fn):
      def get_logging_key(fn, *args, **kwargs):
        # if a custom key function is provided, use it
        if make_cache_key:
          key = make_cache_key()
        else:
          # Otherwise, use the default cache key maker
          key = cache._memoize_make_cache_key()(fn, *args, **kwargs)
        # If query_string is True, append the request query string to the key
        if query_string:
          # Make sure the request is available in context for query_string
          if request:
            return key + request.query_string.decode('utf-8')
        return key

      # create the memoized version of the function 
      cached_fn = cache.cached(timeout=timeout, query_string=query_string, make_cache_key=make_cache_key, unless=unless)(fn)

      return _cache_wrapper(fn, cached_fn, get_logging_key)
  return decorator

def memoize_and_log(timeout=300, make_cache_key=None, unless=False):
  """
  Wraps cache.memoize and runs a logging function on the
  final result, regardless of cache status.
  """
  def decorator(fn):
      def get_logging_key(fn, *args, **kwargs):
        # if a custom key function is provided, use it
        if make_cache_key:
          key = make_cache_key()
        else:
          # Otherwise, use the default cache key maker
          key = cache._memoize_make_cache_key()(fn, *args, **kwargs)
        return key

      # create the memoized version of the function 
      memoized_fn = cache.memoize(timeout=timeout, unless=unless)(fn)

      return _cache_wrapper(fn, memoized_fn, get_logging_key)
  return decorator


def log_request_id(result, is_hit):
      print("hitting logger!")
      try:
        unique_id = result.get("requestId")
        # TODO: these should all be logged as lists for consistency
        if unique_id:
          logger.info(f"Cache hit for ID {unique_id}") if is_hit else logger.info(f"Cache miss for ID {unique_id}")
        else:
          # more than one ID, for higher-level functions that make multiple mixer requests
          ids = result.get("requestIds")
          if ids:
            logger.info(f"Cache hit for IDs {ids}")
      except Exception as e:
        logger.info(f"Cache hit for IDs {unique_id}") if is_hit else logger.info(f"Cache miss for IDs {unique_id}")