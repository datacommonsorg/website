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

from flask import current_app
import google.auth
from google.cloud import bigtable
from google.cloud.bigtable import row_filters

_PROJECT_ID = 'datcom-store'
_INSTANCE_ID = 'website-data'
_TABLE_ID = 'nl-query'
_COLUMN_FAMILY = 'all'
# Store the project of the server for filtering purpose.
_COL_PROJECT = 'project'
_COL_QUERY = 'query'
_SPAN_IN_DAYS = 1

client = bigtable.Client(project=_PROJECT_ID)
instance = client.instance(_INSTANCE_ID)
table = instance.table(_TABLE_ID)


async def write_row(query):
  # Explicitly set project to '' for local dev.
  project_id = ''
  if not current_app.config['LOCAL']:
    _, project_id = google.auth.default()
  ts = datetime.utcnow()
  # use length of query as prefix to avoid Bigtable hotspot nodes.
  row_key = '{}#{}#{}'.format(len(query), project_id, ts.timestamp()).encode()
  row = table.direct_row(row_key)
  row.set_cell(_COLUMN_FAMILY, _COL_PROJECT.encode(), project_id, timestamp=ts)
  row.set_cell(_COLUMN_FAMILY, _COL_QUERY.encode(), query, timestamp=ts)
  table.mutate_rows([row])


def read_row():
  # Fetch recent queries
  start = datetime.now() - timedelta(days=_SPAN_IN_DAYS)
  rows = table.read_rows(filter_=row_filters.TimestampRangeFilter(
      row_filters.TimestampRange(start=start)))
  result = []
  for row in rows:
    project = ''
    query = ''
    timestamp = 0
    for _, cols in row.cells.items():
      for col, cells in cols.items():
        if col.decode('utf-8') == _COL_PROJECT:
          project = cells[0].value.decode('utf-8')
        elif col.decode('utf-8') == _COL_QUERY:
          query = cells[0].value.decode('utf-8')
          timestamp = cells[0].timestamp.timestamp()
    result.append({
        'project': project,
        'query': query,
        'timestamp': timestamp,
    })
  result.sort(key=lambda x: x['timestamp'], reverse=True)
  return result
