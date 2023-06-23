# Copyright 2023 Google LLC
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

from datetime import datetime
from datetime import timedelta
import json
import os

from flask import current_app
import google.auth
from google.cloud import bigtable
from google.cloud.bigtable import row_filters

import server.lib.nl.common.constants as nl_constants
from server.services import datacommons as dc

_PROJECT_ID = 'datcom-store'
_INSTANCE_ID = 'website-data'
_TABLE_ID = 'nl-query'
_COLUMN_FAMILY = 'all'

_COL_PROJECT = 'project'
_COL_SESSION = 'session_info'
_COL_VERSION = 'version'
_COL_DATA = 'data'
_COL_FEEDBACK = 'feedback'

_SPAN_IN_DAYS = 3


def get_row_key(session_info, project_id):
  # The session_id starts with a rand to avoid hotspots.
  return '{}#{}'.format(session_info['id'], project_id).encode()


def get_nl_table():
  client = bigtable.Client(project=_PROJECT_ID)
  instance = client.instance(_INSTANCE_ID)
  return instance.table(_TABLE_ID)


def get_project_id():
  # Explicitly set project to '' for local dev.
  if current_app.config['LOCAL']:
    return ''
  _, project_id = google.auth.default()
  return project_id


def write_feedback(session_info, data):
  project_id = get_project_id()
  row_key = get_row_key(session_info, project_id)
  table = current_app.config['NL_TABLE']
  row = table.direct_row(row_key)
  row.set_cell(_COLUMN_FAMILY, _COL_FEEDBACK.encode(), json.dumps(data))
  table.mutate_rows([row])


async def write_row(session_info, data):
  if not session_info.get('id', None):
    return
  table = current_app.config['NL_TABLE']
  if not table:
    return
  project_id = get_project_id()
  # The session_id starts with a rand to avoid hotspots.
  row_key = get_row_key(session_info, project_id)
  row = table.direct_row(row_key)
  mixer_version = dc.version()
  version = {
      'website_hash': os.environ.get("WEBSITE_HASH"),
      'mixer_hash': mixer_version.get('gitHash', ''),
      'table': mixer_version.get('tables', ''),
  }
  # Rely on timestamp in BT server
  row.set_cell(_COLUMN_FAMILY, _COL_PROJECT.encode(), project_id)
  row.set_cell(_COLUMN_FAMILY, _COL_SESSION.encode(), json.dumps(session_info))
  row.set_cell(_COLUMN_FAMILY, _COL_VERSION.encode(), json.dumps(version))
  row.set_cell(_COLUMN_FAMILY, _COL_DATA.encode(), json.dumps(data))
  table.mutate_rows([row])


def read_success_rows():
  project_id = get_project_id()
  table = current_app.config['NL_TABLE']
  if not table:
    return []
  # Fetch recent queries
  start = datetime.now() - timedelta(days=_SPAN_IN_DAYS)
  rows = table.read_rows(filter_=row_filters.TimestampRangeFilter(
      row_filters.TimestampRange(start=start)))
  result = []
  for row in rows:
    project = ''
    session_info = {}
    timestamp = 0
    for _, cols in row.cells.items():
      for col, cells in cols.items():
        if col.decode('utf-8') == _COL_PROJECT:
          project = cells[0].value.decode('utf-8')
        if col.decode('utf-8') == _COL_SESSION:
          session_info = json.loads(cells[0].value.decode('utf-8'))
          timestamp = cells[0].timestamp.timestamp()
    if project != project_id:
      continue
    if not session_info or not session_info.get('items', []):
      continue
    if session_info['items'][0]['status'] == nl_constants.QUERY_FAILED:
      continue
    query_list = [it['query'] for it in session_info['items'] if 'query' in it]
    result.append({
        'project': project,
        'query_list': query_list,
        'timestamp': timestamp,
    })
  result.sort(key=lambda x: x['timestamp'], reverse=True)
  return result
