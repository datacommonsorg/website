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

import logging
from functools import wraps
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
                print("cache hit! result: ", cached_result.get("requestId", {}))
                
                # Cache hit
                try:
                    # NOTE: this will eventually be a list if we expand the cache to other places that use multiple requests
                    unique_id = cached_result.get("requestId", {})
                    # for id in unique_ids:
                    if unique_id:
                        logger.info(f"Cache hit for key {key} with unique ID {unique_id}")
                except Exception as e:
                    logger.error(f"Error logging cache hit for key {key}: {e}")
                return cached_result

            # Cache miss
            print("cache miss")
            result = f(*args, **kwargs)
            cache.set(key, result, timeout=timeout)
            return result
        return decorated_function
    return decorator
