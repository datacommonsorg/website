# Copyright 2020 Google LLC
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

import json
import os

from flask_caching import Cache
import requests

# Per GCP region redis config. This is a mounted volume for the website container.
REDIS_CONFIG = '/datacommons/redis/redis.json'

# TODO(boxu): delete this after migrating to gke
if os.path.isfile(REDIS_CONFIG):
  with open(REDIS_CONFIG) as f:
    redis = json.load(f)
    metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/zone"
    metadata_flavor = {'Metadata-Flavor': 'Google'}
    zone = requests.get(metadata_url, headers=metadata_flavor).text
    # zone is in the format of projects/projectnum/zones/zone
    region = '-'.join(zone.split('/')[3].split('-')[0:2])
    if region in redis:
      host = redis[region]["host"]
      port = redis[region]["port"]
      cache = Cache(
          config={
              'CACHE_TYPE': 'redis',
              'CACHE_REDIS_HOST': host,
              'CACHE_REDIS_PORT': port,
              'CACHE_REDIS_URL': 'redis://{}:{}'.format(host, port)
          })
    else:
      cache = Cache(config={'CACHE_TYPE': 'simple'})
else:
  cache = Cache(config={'CACHE_TYPE': 'simple'})
