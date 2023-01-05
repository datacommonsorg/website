# Copyright 2021 Google LLC
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

import redis

redis_hosts = ['10.167.58.139', '10.158.101.59']
redis_port = 6379


def clear_cache(request):
  for host in redis_hosts:
    redis_client = redis.StrictRedis(host=host, port=redis_port)
    redis_client.flushall(asynchronous=True)
