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

import os
from pathlib import Path

from flask_caching import Cache

import server.lib.config as lib_config
import server.lib.redis as lib_redis

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
