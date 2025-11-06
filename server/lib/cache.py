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
import json
import logging
import os
from pathlib import Path
from typing import Callable, Optional, Union

from flask import has_request_context
from flask import request
from flask_caching import Cache

import server.lib.config as lib_config
import server.lib.redis as lib_redis

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


def cache_and_log_mixer_usage(timeout: int = 300,
                              query_string: bool = False,
                              make_cache_key: Optional[Callable] = None,
                              unless: Callable = None) -> Callable:
  """
  Decorator that memoizes a function's result and logs mixer response IDs.

  The Mixer usage logs can't track usage from the website cache, so this decorator
  wraps cache.cached and logs mixer response IDs (IDs unique to each mixer response) which are 
  ingested in GCP cloud logging and incoroporated into the usage logs.

  Notes that this decorator should only be applied to uses where mixer results are used meaningfully
  and should be included in the Mixer usage logs. There are some places like `place_charts` 
  and `filter_chart_config_for_data_existence` in the place page, for example, that make mixer calls
  to check if data exists, but these results aren't meaningfully shown to users so we don't log them.

  Args:
    timeout (int): The cache timeout in seconds.
    query_string (bool): Whether to include the query string in the cache key.
    make_cache_key (function): A function to generate a custom cache key.
    unless (bool or function): A condition to skip caching. If it evaluates to
      True, caching is skipped.

  Returns:
    function: A decorator that wraps the target function with caching and
      logging.
  """

  def decorator(fn):
    # This is either the cached result or the evaluation of the function,
    # if it wasn't cached previously
    cached_fn = cache.cached(timeout=timeout,
                             query_string=query_string,
                             make_cache_key=make_cache_key,
                             unless=unless)(fn)

    # Handles logging the mixer response ID
    return _cache_wrapper(fn, cached_fn)

  return decorator


def memoize_and_log_mixer_usage(timeout: int = 300,
                                unless: Callable = None) -> Callable:
  """
  Decorator that memoizes a function's result and logs Mixer response IDs.

  This decorator is similar to `cache_and_log_mixer_usage` but uses
  `cache.memoize` instead of `cache.cached`.

  Args:
    timeout (int): The cache timeout in seconds.
    unless (bool or function): A condition to skip memoization. If it
      evaluates to True, memoization is skipped.

  Returns:
    function: A decorator that wraps the target function with memoization and
      logging.
  """

  def decorator(fn):
    # This is either the memoized result or the evaluation of the function,
    # if it wasn't cached previously
    memoized_fn = cache.memoize(timeout=timeout, unless=unless)(fn)

    # Handles logging the mixer response ID
    return _cache_wrapper(fn, memoized_fn)

  return decorator


def log_mixer_response_id(result: dict) -> None:
  """Extracts and logs Mixer response IDs from a function's result.

  If an error occurs during logging, a warning
  is logged. Note that it is expected in some cases for the result
  to not have a mixer response ID because the IDs are only found on `v2/observation`
  endpoint calls, and certain cached functions like `get` and `post` are 
  used by other endpoints as well.

  Args:
    result (dict): A cached result that may contain mixer response IDs.
  """
  try:
    log_payload = {
        "message": "Website cache mixer usage",
    }
    ids = result.get("mixerResponseIds")
    if ids:
      log_payload["mixer_response_ids"] = ids
      logger.info(json.dumps(log_payload))
  except Exception as e:
    logger.info(f"Error logging the mixer response ID for result {result}: {e}")


def _cache_wrapper(fn: Callable, cached_fn: Callable) -> Callable:
  """Wraps a cached or memoized function to log Mixer response IDs.

  Args:
    fn (function): The original function being wrapped.
    cached_fn (function): The cached or memoized version of the original
      function.

  Returns:
    function: A wrapper function that executes the cached function and logs
      mixer response IDs.
  """

  @functools.wraps(fn)
  def wrapper(*args, **kwargs):
    result = cached_fn(*args, **kwargs)
    try:
      log_mixer_response_id(result)
    except Exception as e:
      logger.warning(f"Error logging response for {fn.__name__}: {e}")

    return result

  return wrapper
