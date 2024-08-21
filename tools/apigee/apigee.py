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
import gspread
from httpx import AsyncClient
from httpx import HTTPStatusError
from httpx import Limits

_BILLING_PROJECT_ID = "datcom-204919"
_API_KEYS_BASE_URL = "https://apikeys.googleapis.com"
_APIGEE_BASE_URL = "https://apigee.googleapis.com"
_HTTPX_LIMITS = Limits(max_keepalive_connections=5, max_connections=10)
_HTTP_RESOURCE_EXISTS_CODE = 409

# The DC API target of the keys being migrated.
# e.g. api.datacommons.org
_DC_API_TARGET = os.environ.get("DC_API_TARGET")
# The apigee organization to migrate the keys to.
# e.g. datcom-apigee
_APIGEE_ORGANIZATION = os.environ.get("APIGEE_ORGANIZATION")
# The URL to the Google Sheet with details of partners to be migrated.
_SHEETS_URL = os.environ.get("SHEETS_URL")
# The name of the worksheet at the SHEETS_URL with details of partners to be migrated.
# Worksheet should have the following named columns:
# project_id, developer_email, developer_first_name, developer_last_name, org_name, keys
_WORKSHEET_NAME = os.environ.get("WORKSHEET_NAME")

assert _DC_API_TARGET, "'DC_API_TARGET' env variable not specified"
assert _APIGEE_ORGANIZATION, "'APIGEE_ORGANIZATION' env variable not specified"
assert _SHEETS_URL, "'SHEETS_URL' env variable not specified"
assert _WORKSHEET_NAME, "'WORKSHEET_NAME' env variable not specified"


class CloudApiClient:

  def __init__(self, dc_api_target: str, apigee_organization: str) -> None:
    self.dc_api_target = dc_api_target
    self.apigee_organization = apigee_organization
    self.credentials, self.project_id = default()
    self.credentials.refresh(Request())
    logging.info("Obtained cloud credentials, project id = %s", self.project_id)
    self.http_client = AsyncClient(limits=_HTTPX_LIMITS)
    self.http_headers = {
        "Authorization": f"Bearer {self.credentials.token}",
        "x-goog-user-project": _BILLING_PROJECT_ID,
        "Content-Type": "application/json"
    }

  async def import_key(self, developer_email: str, app_name: str,
                       key: str) -> str:
    request = {"consumerKey": key, "consumerSecret": key}
    try:
      response = await self.http_post(
          f"{_APIGEE_BASE_URL}/v1/organizations/{self.apigee_organization}/developers/{developer_email}/apps/{app_name}/keys",
          request)
      logging.info(json.dumps(response, indent=1))
      return response.get("consumerKey", "")
    except HTTPStatusError as hse:
      # 409 status = Key already exists, log and return key.
      if hse.response.status_code == _HTTP_RESOURCE_EXISTS_CODE:
        logging.info("Key already exists: %s", key)
        return app_name
      raise hse

  async def create_app(self, developer_email: str, app_name: str) -> str:
    request = {"name": app_name}
    try:
      response = await self.http_post(
          f"{_APIGEE_BASE_URL}/v1/organizations/{self.apigee_organization}/developers/{developer_email}/apps",
          request)
      logging.info(json.dumps(response, indent=1))
      return response.get("name", "")
    except HTTPStatusError as hse:
      # 409 status = App already exists, log and return app name.
      if hse.response.status_code == _HTTP_RESOURCE_EXISTS_CODE:
        logging.info("App already exists: %s", app_name)
        return app_name
      raise hse

  async def create_developer(self, email: str, first_name: str,
                             last_name: str) -> str:
    request = {
        "email": email,
        "userName": email,
        "firstName": first_name,
        "lastName": last_name
    }
    try:
      response = await self.http_post(
          f"{_APIGEE_BASE_URL}/v1/organizations/{self.apigee_organization}/developers",
          request)
      logging.info(json.dumps(response, indent=1))
      return response.get("email", "")
    except HTTPStatusError as hse:
      # 409 status = Developer already exists, log and return email.
      if hse.response.status_code == _HTTP_RESOURCE_EXISTS_CODE:
        logging.info("Developer already exists: %s", email)
        return email
      raise hse

  async def batch_get_dc_api_keys(
      self, project_ids: list[str]) -> dict[str, list[str]]:
    futures = [self.get_dc_api_keys(project_id) for project_id in project_ids]
    keys = dict(await asyncio.gather(*futures))
    return keys

  async def get_dc_api_keys(self, project_id: str) -> tuple[str, list[str]]:
    key_names = await self.fetch_dc_api_key_names(project_id)
    futures = [self.fetch_dc_api_key_string(key_name) for key_name in key_names]
    keys = list(filter(lambda x: x, await asyncio.gather(*futures)))
    return project_id, keys

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
        if api_target.get("service", "") == self.dc_api_target:
          key_names.append(key_name)
    if not key_names:
      logging.warning("No DC API key name found for project: %s", project_id)
    return key_names

  async def http_get(self, url: str, params: dict = None) -> dict:
    async with asyncio.Semaphore(_HTTPX_LIMITS.max_connections):
      response = await self.http_client.get(url,
                                            params=params,
                                            headers=self.http_headers)
      response.raise_for_status()
      result = response.json()
      logging.debug("Response: %s", json.dumps(result, indent=1))
      return result

  async def http_post(self, url: str, data: dict = None) -> dict:
    async with asyncio.Semaphore(_HTTPX_LIMITS.max_connections):
      response = await self.http_client.post(url,
                                             json=data,
                                             headers=self.http_headers)
      response.raise_for_status()
      result = response.json()
      logging.debug("Response: %s", json.dumps(result, indent=1))
      return result


class SheetsClient:

  def __init__(self, cloud_client: CloudApiClient, sheets_url: str,
               worksheet_name: str) -> None:
    self.cloud_client = cloud_client
    self.sheets_url = sheets_url
    self.worksheet_name = worksheet_name
    gs = gspread.oauth()
    sheet = gs.open_by_url(self.sheets_url)
    self.worksheet = sheet.worksheet(self.worksheet_name)
    logging.info("Connected to worksheet '%s' at: %s", self.worksheet_name,
                 self.sheets_url)

  async def write_dc_api_keys(self):
    """
    Reads the sheet, fetches DC api keys for each project and writes them back to the sheet.
    """
    # Read sheet data.
    data = self._read_sheet_data()

    # Extract project ids from the data.
    project_ids: list[str] = list(
        filter(lambda x: x, map(lambda row: row.get("project_id"), data)))

    # Fetch API keys for each project.
    project_id_2_keys = await self.cloud_client.batch_get_dc_api_keys(
        project_ids)

    # Insert fetched keys into the in-memory data.
    self._insert_project_keys(data, project_id_2_keys)

    # Write data with keys back to the sheet.
    self._write_sheet_data(data)

  def _insert_project_keys(self, data: list[dict[str, str]],
                           project_id_2_keys: dict[str, list[str]]):
    for row in data:
      project_id = row.get("project_id")
      keys = project_id_2_keys.get(project_id)
      if not keys:
        logging.warning("No API keys found for project: %s", project_id)
        continue
      # Write keys as comma separated values.
      row["keys"] = ", ".join(keys)

  def _read_sheet_data(self) -> list[dict[str, str]]:
    # Get all values from the sheet.
    sheet_data = self.worksheet.get_all_values()
    # Extract headers (first row)
    headers = sheet_data.pop(0)
    # Create a list of dictionaries, where each dictionary represents a row
    data = [dict(zip(headers, row)) for row in sheet_data]
    return data

  def _write_sheet_data(self, data: list[dict[str, str]]):
    # Prepare data to write back to the sheet
    headers = list(data[0].keys())  # Get headers from the first dictionary
    # # Convert dictionaries to lists of values.
    rows = [list(row.values()) for row in data]
    # Combine headers and rows to write to sheet.
    sheet_data = [headers] + rows
    # Clear existing sheet content.
    self.worksheet.clear()
    # Write updated data back to the sheet.
    self.worksheet.update(range_name="A1", values=sheet_data)
    logging.info("Wrote keys back to worksheet '%s' at: %s",
                 self.worksheet_name, self.sheets_url)


async def async_main():
  cloud_client = CloudApiClient(dc_api_target=_DC_API_TARGET,
                                apigee_organization=_APIGEE_ORGANIZATION)
  sheets_client = SheetsClient(cloud_client, _SHEETS_URL, _WORKSHEET_NAME)
  await sheets_client.write_dc_api_keys()


def main(_):
  asyncio.run(async_main())


if __name__ == "__main__":
  app.run(main)
