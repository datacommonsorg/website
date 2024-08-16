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

import asyncio
import json
import logging
import os

from absl import app
from google.auth import default
from google.auth.transport.requests import Request
from httpx import AsyncClient
from httpx import Limits

_BILLING_PROJECT_ID = "datcom-204919"
_API_KEYS_BASE_URL = "https://apikeys.googleapis.com"
_HTTPX_LIMITS = Limits(max_keepalive_connections=5, max_connections=10)

_DC_API_TARGET = os.environ.get("DC_API_TARGET", "api.datacommons.org")


class CloudApiClient:

  def __init__(self) -> None:
    self.credentials, self.project_id = default()
    self.credentials.refresh(Request())
    self.http_client = AsyncClient(limits=_HTTPX_LIMITS)

  async def get_dc_api_keys(self, project_id: str) -> list[str]:
    key_names = await self.fetch_dc_api_key_names(project_id)
    futures = [self.fetch_dc_api_key_string(key_name) for key_name in key_names]
    return list(filter(lambda x: x, await asyncio.gather(*futures)))

  async def fetch_dc_api_key_string(self, key_name: str) -> str:
    if not key_name:
      return ""
    response = await self.http_get(
        f"{_API_KEYS_BASE_URL}/v2/{key_name}/keyString")
    key_string = response.get("keyString", "")
    if not key_string:
      logging.warning("No DC API key string found for key name: %s", key_name)
    return key_string

  async def fetch_dc_api_key_names(self, project_id: str) -> list[str]:
    response = await self.http_get(
        f"{_API_KEYS_BASE_URL}/v2/projects/{project_id}/locations/global/keys")
    key_names: list[str] = []
    for key in response.get("keys", []):
      key_name = key.get("name")
      if not key_name:
        continue
      for api_target in key.get("restrictions", {}).get("apiTargets", []):
        if api_target.get("service", "") == _DC_API_TARGET:
          key_names.append(key_name)
    if not key_names:
      logging.warning("No DC API key name found for project: %s", project_id)
    return key_names

  async def http_get(self, url: str, params: dict = None) -> dict:
    headers = {
        "Authorization": f"Bearer {self.credentials.token}",
        "x-goog-user-project": _BILLING_PROJECT_ID
    }

    async with asyncio.Semaphore(_HTTPX_LIMITS.max_connections):
      response = await self.http_client.get(url, params=params, headers=headers)
      response.raise_for_status()
      result = response.json()
      logging.debug("Response: %s", json.dumps(result, indent=1))
      return result


def main(_):
  client = CloudApiClient()
  project_id = "datcom-api-key-trial"
  dc_api_keys = asyncio.run(client.get_dc_api_keys(project_id))
  logging.info("%s = %s", project_id, ", ".join(dc_api_keys))


if __name__ == "__main__":
  app.run(main)
