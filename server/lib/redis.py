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

import json
import os

from flask import current_app
import requests

# Per GCP region Redis config. This is a mounted volume for the website container.
_REDIS_CONFIG = '/datacommons/redis/redis.json'
REDIS_HOST = os.environ.get('REDIS_HOST', '')
REDIS_PORT = os.environ.get('REDIS_PORT', '6379')


def get_redis_config():
  # First check environment for redis configuration
  if REDIS_HOST:
    return {"host": REDIS_HOST, "port": REDIS_PORT}
  # Next try local redis config file (used in gke)
  if not os.path.isfile(_REDIS_CONFIG):
    return None
  with open(_REDIS_CONFIG) as f:
    redis = json.load(f)
    metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/zone"
    metadata_flavor = {'Metadata-Flavor': 'Google'}
    zone = requests.get(metadata_url, headers=metadata_flavor).text
    # zone is in the format of projects/projectnum/zones/zone
    region = '-'.join(zone.split('/')[3].split('-')[0:2])
    if not region or region not in redis:
      return None
    host = redis[region]["host"]
    port = redis[region]["port"]
    return {"host": host, "port": port}
