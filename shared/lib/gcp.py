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

import urllib.request

url = "http://metadata.google.internal/computeMetadata/v1/project/project-id"


def in_google_network():
  '''Check whether the instance runs in GCP. Cache this call if it's called
  multiple times.
  '''
  try:
    req = urllib.request.Request(url, headers={"Metadata-Flavor": "Google"})
    resp = urllib.request.urlopen(req)
    resp.read().decode()
    return True
  except Exception as e:
    # Do not use logging here otherwise logging.baseConfig won't have effect
    print('Not in Google network: ', e)
    return False
