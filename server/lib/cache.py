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

from flask import g
from flask import has_request_context
from flask import request
from flask import Response
from flask_caching import Cache
from flask_caching.backends.filesystemcache import FileSystemCache
from flask_caching.backends.nullcache import NullCache
from flask_caching.backends.rediscache import RedisCache
from flask_caching.backends.simplecache import SimpleCache

import server.lib.config as lib_config
import server.lib.redis as lib_redis
from shared.lib.constants import LOG_CACHED_MIXER_RESPONSE_USAGE
from shared.lib.constants import MIXER_RESPONSE_ID_FIELD

logger = logging.getLogger(__name__)

# _redis_cache is a redis cache client when a redis config is available.
# It will be used by the regular flask "cache" and/or the flask "model_cache".
_redis_cache = None

# cache is the default flask cache for endpoints.
cache = None

# model_cache is flask cache for endpoints that invoke vertex models.
model_cache = None


class CohortAwareBackendMixin:
  """Mixin to inject Spanner cohort key suffixing into any standard cache backend."""

  COHORT_SUFFIX = "__cohort:spanner"

  def _is_isolatable_key(self, key) -> bool:
    if not isinstance(key, str):
      return False
    if key.endswith('_memver') or key.endswith(self.COHORT_SUFFIX):
      return False
    return True

  def _suffix_key(self, key):
    # Only suffix if in request context and assigned to Spanner
    if has_request_context() and g.get('use_spanner',
                                       False) and self._is_isolatable_key(key):
      return f"{key}{self.COHORT_SUFFIX}"
    return key

  def get(self, key, *args, **kwargs):
    return super().get(self._suffix_key(key), *args, **kwargs)

  def set(self, key, value, *args, **kwargs):
    return super().set(self._suffix_key(key), value, *args, **kwargs)

  def add(self, key, value, *args, **kwargs):
    return super().add(self._suffix_key(key), value, *args, **kwargs)

  def inc(self, key, delta=1, *args, **kwargs):
    return super().inc(self._suffix_key(key), delta, *args, **kwargs)

  def dec(self, key, delta=1, *args, **kwargs):
    return super().dec(self._suffix_key(key), delta, *args, **kwargs)

  def delete(self, key, *args, **kwargs):
    # 1. Delete the base key (Bigtable / Contextless)
    res = super().delete(key, *args, **kwargs)
    # 2. Proactively delete the Spanner key to prevent stale data
    res_spanner = False
    if self._is_isolatable_key(key):
      res_spanner = super().delete(f"{key}{self.COHORT_SUFFIX}", *args,
                                   **kwargs)
    return res or res_spanner

  def has(self, key, *args, **kwargs):
    return super().has(self._suffix_key(key), *args, **kwargs)

  def delete_many(self, *keys, **kwargs):
    # 1. Delete the base keys and capture their result
    res = super().delete_many(*keys, **kwargs)
    # 2. Proactively delete corresponding Spanner keys
    spanner_keys = [
        f"{k}{self.COHORT_SUFFIX}" for k in keys if self._is_isolatable_key(k)
    ]
    if spanner_keys:
      super().delete_many(*spanner_keys, **kwargs)
    return res

  def get_many(self, *keys, **kwargs):
    suffixed_keys = [self._suffix_key(k) for k in keys]
    return super().get_many(*suffixed_keys, **kwargs)

  def set_many(self, mapping, *args, **kwargs):
    suffixed_mapping = {self._suffix_key(k): v for k, v in mapping.items()}
    return super().set_many(suffixed_mapping, *args, **kwargs)


class CohortAwareRedisCache(CohortAwareBackendMixin, RedisCache):
  pass


class CohortAwareFileSystemCache(CohortAwareBackendMixin, FileSystemCache):
  pass


class CohortAwareSimpleCache(CohortAwareBackendMixin, SimpleCache):
  pass


class CohortAwareNullCache(CohortAwareBackendMixin, NullCache):
  pass


def cohort_aware_redis_cache_factory(app, config, args, kwargs):
  """Factory to map Flask config to CohortAwareRedisCache constructor."""
  kwargs.update(
      dict(
          host=config.get("CACHE_REDIS_HOST", "localhost"),
          port=config.get("CACHE_REDIS_PORT", 6379),
          password=config.get("CACHE_REDIS_PASSWORD"),
          db=config.get("CACHE_REDIS_DB", 0),
          key_prefix=config.get("CACHE_KEY_PREFIX"),
          default_timeout=config.get("CACHE_DEFAULT_TIMEOUT", 300),
      ))
  redis_url = config.get("CACHE_REDIS_URL")
  if redis_url:
    from redis import from_url as redis_from_url
    kwargs.pop("db", None)
    url_kwargs = {}
    db = config.get("CACHE_REDIS_DB")
    if db is not None:
      url_kwargs["db"] = db
    kwargs["host"] = redis_from_url(redis_url, **url_kwargs)
  return CohortAwareRedisCache(*args, **kwargs)


def cohort_aware_filesystem_cache_factory(app, config, args, kwargs):
  """Factory to map Flask config to CohortAwareFileSystemCache constructor."""
  cache_dir = config.get("CACHE_DIR")
  if cache_dir and cache_dir not in args:
    args.insert(0, cache_dir)
  kwargs.update(
      dict(
          threshold=config.get("CACHE_THRESHOLD", 500),
          ignore_errors=config.get("CACHE_IGNORE_ERRORS", False),
      ))
  return CohortAwareFileSystemCache(*args, **kwargs)


def cohort_aware_simple_cache_factory(app, config, args, kwargs):
  """Factory to map Flask config to CohortAwareSimpleCache constructor."""
  kwargs.update(
      dict(
          threshold=config.get("CACHE_THRESHOLD", 500),
          ignore_errors=config.get("CACHE_IGNORE_ERRORS", False),
      ))
  return CohortAwareSimpleCache(*args, **kwargs)


def cohort_aware_null_cache_factory(app, config, args, kwargs):
  """Factory for CohortAwareNullCache."""
  return CohortAwareNullCache(*args, **kwargs)


redis_config = lib_redis.get_redis_config()
REDIS_HOST = os.environ.get('REDIS_HOST', '')

# Setup model_cache, use redis if available, otherwise use filesystem cache
# which is good for local development.
if redis_config:
  redis_host = redis_config['host']
  redis_port = redis_config['port']
  _redis_cache = Cache(
      config={
          'CACHE_TYPE': 'server.lib.cache.cohort_aware_redis_cache_factory',
          'CACHE_REDIS_HOST': redis_host,
          'CACHE_REDIS_PORT': redis_port,
          'CACHE_REDIS_URL': 'redis://{}:{}'.format(redis_host, redis_port)
      })
  model_cache = _redis_cache
else:
  model_cache = Cache(
      config={
          'CACHE_TYPE':
              'server.lib.cache.cohort_aware_filesystem_cache_factory',
          'CACHE_DIR':
              os.path.join(Path(__file__).parents[2], '.cache')
      })

cfg = lib_config.get_config()
# Configure cache if USE_MEMCACHE is set, or if there's a REDIS_HOST environment
# variable
if cfg.USE_MEMCACHE or REDIS_HOST:
  # Setup regular flask cache. Use Redis if available, otherwise use SimpleCache.
  if _redis_cache:
    cache = _redis_cache
  else:
    cache = Cache(config={
        'CACHE_TYPE': 'server.lib.cache.cohort_aware_simple_cache_factory'
    })
else:
  # For some instance with fast updated data, we may not want to use memcache.
  cache = Cache(
      config={'CACHE_TYPE': 'server.lib.cache.cohort_aware_null_cache_factory'})


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

  def decorator(fn: Callable) -> Callable:
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

  def decorator(fn: Callable) -> Callable:
    # This is either the memoized result or the evaluation of the function,
    # if it wasn't cached previously
    memoized_fn = cache.memoize(timeout=timeout, unless=unless)(fn)

    # Handles logging the mixer response ID
    return _cache_wrapper(fn, memoized_fn)

  return decorator


def log_mixer_response_id(result: Union[dict, Response]) -> None:
  """Extracts and logs Mixer response IDs from a function's result.

  If an error occurs during logging, a message with the error details
  is logged.

  Note that it is expected in some cases for the result
  to not have a mixer response ID because the IDs are only found on `v2/observation`
  endpoint calls, and certain cached functions like `get` and `post` are 
  used by other endpoints as well, so we don't print an error if the ID is missing, 
  only when the logging itself fails.

  Args:
    result (dict or Flask Response): A cached result that may contain mixer response IDs.
  """
  if not getattr(cfg, LOG_CACHED_MIXER_RESPONSE_USAGE, False):
    return
  try:
    log_payload = {
        "message": "Mixer responses used in the website cache",
    }
    data = result
    # handling formatting for response types
    if hasattr(result, 'get_json'):
      data = result.get_json()
    ids = data.get(MIXER_RESPONSE_ID_FIELD)
    if ids:
      # The GCP log router that directs these logs to BigQuery detects them
      # Based on the presence of the MIXER_RESPONSE_ID_FIELD field in the jsonPayload.
      # If you update the field name here, also update the filter on the website_cache_mixer_usage_logs log router here:
      # https://pantheon.corp.google.com/logs/router?e=13803378&mods=-monitoring_api_staging&project=datcom-website-prod
      log_payload[MIXER_RESPONSE_ID_FIELD] = ids
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
  def wrapper(*args, **kwargs) -> dict:
    result = cached_fn(*args, **kwargs)
    log_mixer_response_id(result)
    return result

  return wrapper
