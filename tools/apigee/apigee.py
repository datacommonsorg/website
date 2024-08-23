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
from collections import defaultdict
from enum import StrEnum
from functools import wraps
import json
import logging
import os
import random
import re
import string

from absl import app
from absl import flags
from google.auth import default
from google.auth.transport.requests import Request
import gspread
from httpx import AsyncClient
from httpx import HTTPStatusError
from httpx import Limits

FLAGS = flags.FLAGS


class Mode(StrEnum):
  MIGRATE = "migrate"
  IMPORT = "import"
  EXPORT = "export"


flags.DEFINE_enum_class("mode", Mode.MIGRATE, Mode, "The mode of operation")

_BILLING_PROJECT_ID = "datcom-204919"
_API_KEYS_BASE_URL = "https://apikeys.googleapis.com"
_APIGEE_BASE_URL = "https://apigee.googleapis.com"
_HTTPX_LIMITS = Limits(max_keepalive_connections=5, max_connections=10)
_HTTP_RESOURCE_EXISTS_CODE = 409
_SECRET_CHARS = string.ascii_letters + string.digits

# The DC API target of the keys being migrated.
# e.g. api.datacommons.org
_DC_API_TARGET = os.environ.get("DC_API_TARGET")
# The apigee organization to migrate the keys to.
# e.g. datcom-apigee
_APIGEE_ORGANIZATION = os.environ.get("APIGEE_ORGANIZATION")
# The apigee api product that the migrated keys should be associated to.
# e.g. api, api-staging
_APIGEE_API_PRODUCT = os.environ.get("APIGEE_API_PRODUCT")
# The URL to the Google Sheet with details of partners to be migrated.
_SHEETS_URL = os.environ.get("SHEETS_URL")
# The name of the worksheet at the SHEETS_URL with details of partners to be migrated.
# Worksheet should have the following named columns:
# project_id, developer_email, developer_first_name, developer_last_name, org_name, keys
_WORKSHEET_NAME = os.environ.get("WORKSHEET_NAME")

_DEFAULT_DEVELOPER_EMAIL = "datcom-core@google.com"
_DEFAULT_DEVELOPER_FIRST_NAME = "Data Commons"
_DEFAULT_ORG_NAME = "Unknown Org"
_APP_NAME_SUFFIX = " - Data Commons"

assert _DC_API_TARGET, "'DC_API_TARGET' env variable not specified"
assert _APIGEE_ORGANIZATION, "'APIGEE_ORGANIZATION' env variable not specified"
assert _APIGEE_API_PRODUCT, "'APIGEE_API_PRODUCT' env variable not specified"
assert _SHEETS_URL, "'SHEETS_URL' env variable not specified"
assert _WORKSHEET_NAME, "'WORKSHEET_NAME' env variable not specified"


def _generate_secret() -> str:
  """Generates a random 16 character secret string."""
  return ''.join(random.choices(_SECRET_CHARS, k=16))


class CloudApiClient:

  def __init__(self, dc_api_target: str, apigee_organization: str,
               apigee_api_product: str) -> None:
    self.dc_api_target = dc_api_target
    self.apigee_organization = apigee_organization
    self.apigee_api_product = apigee_api_product
    self.credentials, self.project_id = default()
    self.credentials.refresh(Request())
    logging.info("Obtained cloud credentials, project id = %s", self.project_id)
    self.http_client = AsyncClient(limits=_HTTPX_LIMITS)
    self.http_headers = {
        "Authorization": f"Bearer {self.credentials.token}",
        "x-goog-user-project": _BILLING_PROJECT_ID,
        "Content-Type": "application/json"
    }
    self._concurrent_requests_limit = asyncio.Semaphore(
        _HTTPX_LIMITS.max_connections)
    # Used to serialize calls to the same URL to prevent concurrent calls from mutating the same resource.
    self._in_flight_urls = defaultdict(asyncio.Lock)

  async def bulk_import_keys(self,
                             key_2_data: dict[str, dict[str, str]]) -> set[str]:
    futures = [self.import_key(key, data) for key, data in key_2_data.items()]
    keys = set(filter(lambda x: x, await asyncio.gather(*futures)))
    return keys

  async def import_key(self, key: str, data: dict[str, str]) -> str:
    """
    Imports the key to apigee by creating the developer, app and key in apigee 
    and associating the key with the configured api product.

    The data needed is expected in the form of a dict with the following fields:
    developer_email, developer_first_name, developer_last_name and org_name.

    Defaults are assigned if these fields don"t exist or are empty.

    If import was successful, it returns the imported key.
    In case of a failure, it logs the failure and returns an empty string. 
    """

    developer_email = data.get("developer_email") or _DEFAULT_DEVELOPER_EMAIL
    developer_first_name = data.get(
        "developer_first_name") or _DEFAULT_DEVELOPER_FIRST_NAME
    developer_last_name = data.get(
        "developer_last_name") or developer_first_name
    org_name = data.get("org_name") or _DEFAULT_ORG_NAME
    app_name = f"{org_name}{_APP_NAME_SUFFIX}"

    try:
      await self.create_developer(developer_email, developer_first_name,
                                  developer_last_name)
      logging.info("Created / found developer: %s", developer_email)

      await self.create_app(developer_email, app_name)
      logging.info("Created / found app: %s", app_name)

      await self.create_key(developer_email, app_name, key)
      logging.info("Created / found key: %s", key)

      await self.associate_key(developer_email, app_name, key)
      logging.info("Associated key with api product: %s",
                   self.apigee_api_product)

      # If successful, set the migrated* fields so they are reflected in the sheet.
      data["migrated_app_name"] = app_name
      data["migrated_developer_first_name"] = developer_first_name
      data["migrated_developer_last_name"] = developer_last_name
      data["migrated_api_product"] = self.apigee_api_product

      return key
    except HTTPStatusError as hse:
      logging.error(
          "Error importing key to apigee: %s (%s),\nRequest:\n%s,\nResponse:\n%s",
          key, str(hse), hse.request.content, hse.response.content)
      return ""

  async def associate_key(self, developer_email: str, app_name: str,
                          key: str) -> str:
    """Associates the key with the configured api product."""
    request = {"apiProducts": [self.apigee_api_product]}
    response = await self.http_put(
        f"{_APIGEE_BASE_URL}/v1/organizations/{self.apigee_organization}/developers/{developer_email}/apps/{app_name}/keys/{key}",
        request)
    return response.get("consumerKey", "")

  async def create_key(self, developer_email: str, app_name: str,
                       key: str) -> str:
    request = {"consumerKey": key, "consumerSecret": _generate_secret()}
    try:
      response = await self.http_post(
          f"{_APIGEE_BASE_URL}/v1/organizations/{self.apigee_organization}/developers/{developer_email}/apps/{app_name}/keys",
          request)
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
      return response.get("email", "")
    except HTTPStatusError as hse:
      # 409 status = Developer already exists, log and return email.
      if hse.response.status_code == _HTTP_RESOURCE_EXISTS_CODE:
        logging.info("Developer already exists: %s", email)
        return email
      raise hse

  async def bulk_export_keys(self,
                             project_ids: list[str]) -> dict[str, list[str]]:
    futures = [self.export_keys(project_id) for project_id in project_ids]
    keys = dict(await asyncio.gather(*futures))
    return keys

  async def export_keys(self, project_id: str) -> tuple[str, list[str]]:
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

  def _serialize_in_flight_urls(func):

    @wraps(func)
    async def wrapper(self, url, *args, **kwargs):
      async with self._in_flight_urls[url]:
        try:
          return await func(self, url, *args, **kwargs)
        finally:
          if url in self._in_flight_urls:
            del self._in_flight_urls[url]

    return wrapper

  @_serialize_in_flight_urls
  async def http_get(self, url: str, params: dict = None) -> dict:
    async with self._concurrent_requests_limit:
      response = await self.http_client.get(url,
                                            params=params,
                                            headers=self.http_headers)
      response.raise_for_status()
      result = response.json()
      logging.debug("Response: %s", json.dumps(result, indent=1))
      return result

  @_serialize_in_flight_urls
  async def http_post(self, url: str, data: dict = None) -> dict:
    async with self._concurrent_requests_limit:
      response = await self.http_client.post(url,
                                             json=data,
                                             headers=self.http_headers)
      response.raise_for_status()
      result = response.json()
      logging.debug("Response: %s", json.dumps(result, indent=1))
      return result

  @_serialize_in_flight_urls
  async def http_put(self, url: str, data: dict = None) -> dict:
    async with self._concurrent_requests_limit:
      response = await self.http_client.put(url,
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

  async def export_keys(self):
    """
    Exports DC API keys from apikeys.

    Reads the sheet, fetches DC api keys for each project and writes them back to the sheet.
    """
    # Read sheet data.
    data = self._read_sheet_data(clear_keys=True)

    # Extract project ids from the data.
    project_ids: list[str] = list(
        filter(lambda x: x, map(lambda row: row.get("project_id"), data)))

    # Fetch API keys for each project.
    project_id_2_keys = await self.cloud_client.bulk_export_keys(project_ids)

    # Insert fetched keys into the in-memory data.
    self._insert_project_keys(data, project_id_2_keys)

    # Write data with keys back to the sheet.
    self._write_sheet_data(data)

  async def import_keys(self):
    """
    Imports DC API keys into apigee.

    Reads the sheet that should already include they keys,
    imports the keys to apigee and 
    writes the keys that were migrated back in the sheet.
    """
    # Read sheet data.
    data = self._read_sheet_data(clear_migrated=True)

    # Create a reverse lookup dict from key to row data to prepare for bulk import.
    key_2_data: dict[str, dict[str, str]] = {}
    for row in data:
      keys_value = row.get("keys", "")
      if not keys_value:
        logging.warning("No keys found in row and will be skipped: %s",
                        ", ".join(row.values()))
        continue
      keys = re.split(r"\s*,\s*", keys_value)
      for key in keys:
        key_2_data[key] = row

    # Migrated keys.
    migrated_keys = await self.cloud_client.bulk_import_keys(key_2_data)

    if migrated_keys:
      # Insert migrated keys into the in-memory data.
      self._insert_migrated_keys(key_2_data, migrated_keys)
      # Write data with migrated keys back to the sheet.
      self._write_sheet_data(data)

  def _insert_migrated_keys(self, key_2_data: dict[str, dict[str, str]],
                            migrated_keys: set[str]):
    for key, data in key_2_data.items():
      if key in migrated_keys:
        migrated_keys_value = data.get("migrated_keys", "")
        migrated_keys_value = f"{migrated_keys_value}, {key}" if migrated_keys_value else key
        data["migrated_keys"] = migrated_keys_value

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

  def _read_sheet_data(self,
                       clear_keys: bool = False,
                       clear_migrated: bool = False) -> list[dict[str, str]]:
    # Get all values from the sheet.
    sheet_data = self.worksheet.get_all_values()
    # Extract headers (first row)
    headers = sheet_data.pop(0)
    # Create a list of dictionaries, where each dictionary represents a row
    data: list[dict[str, str]] = []
    for row_values in sheet_data:
      row: dict[str, str] = dict(zip(headers, row_values))
      # Clear all migrated fields when clearing keys or migrated fields.
      if clear_keys or clear_migrated:
        for field in row.keys():
          if field.startswith("migrated_"):
            row[field] = ""
      if clear_keys:
        row["keys"] = ""
      data.append(row)
    return data

  def _write_sheet_data(self, data: list[dict[str, str]]):
    # Prepare data to write back to the sheet
    headers = list(data[0].keys())  # Get headers from the first dictionary
    # # Convert dictionaries to lists of values.
    rows = [list(row.values()) for row in data]
    # Combine headers and rows to write to sheet.
    sheet_data = [headers] + rows
    # Write updated data back to the sheet.
    self.worksheet.update(range_name="A1", values=sheet_data)
    logging.info("Wrote keys back to worksheet '%s' at: %s",
                 self.worksheet_name, self.sheets_url)


async def async_main(mode: Mode):
  cloud_client = CloudApiClient(dc_api_target=_DC_API_TARGET,
                                apigee_organization=_APIGEE_ORGANIZATION,
                                apigee_api_product=_APIGEE_API_PRODUCT)
  sheets_client = SheetsClient(cloud_client, _SHEETS_URL, _WORKSHEET_NAME)

  if mode == Mode.IMPORT:
    await sheets_client.import_keys()
  elif mode == Mode.EXPORT:
    await sheets_client.export_keys()
  elif mode == Mode.MIGRATE:
    await sheets_client.export_keys()
    await sheets_client.import_keys()
  else:
    raise ValueError(f"Invalid mode: {mode}")


def main(_):
  asyncio.run(async_main(FLAGS.mode))


if __name__ == "__main__":
  app.run(main)
