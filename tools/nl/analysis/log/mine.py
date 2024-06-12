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

import csv
from datetime import datetime
from datetime import timedelta
import json
import logging
import os

from absl import app
from absl import flags
from google.cloud import bigtable
from google.cloud.bigtable import row_filters

FLAGS = flags.FLAGS

flags.DEFINE_string('project', 'datcom-store', 'GCP project')
flags.DEFINE_string('instance', 'website-data', 'BT instance')
flags.DEFINE_string('table', 'nl-query', 'BT table')
flags.DEFINE_integer('past_days', 1, 'Days to go back')
flags.DEFINE_string('output_dir', '/tmp/', 'Output dir for CSV')
flags.DEFINE_string('env_name', 'prod', 'Env name')
flags.DEFINE_bool('all_rows', False, 'Process all rows')

_CHART_IDX_THRESHOLD = 15
_SUPPORTED_ENV = {
    'datcom-website-prod': {
        'name': 'prod',
        'url': 'https://datacommons.org/'
    },
    'datcom-website-autopush': {
        'name': 'autopush',
        'url': 'https://autopush.datacommons.org/'
    },
    'datcom-website-dev': {
        'name': 'dev',
        'url': 'https://dev.datacommons.org/'
    }
}
_COL_SESSION = 'session_info'
_COL_DATA = 'data'
_COL_FEEDBACK = 'feedback'


def _lidx(ctx, val, d, keys):
  for k1, k2 in keys:
    items = val.get(k1, [])
    if d[k2] >= len(items):
      logging.error(f'Invalid {ctx} {k1} {k2} {d[k2]} {len(items)}')
      return {}
    val = items[d[k2]]
  return val


def _midx(val, keys):
  for i, k in enumerate(keys):
    if i == len(keys) - 1:
      val = val.get(k)
    else:
      val = val.get(k, {})
  return val


def _abs_chart_idx(config, d):
  num_charts = 0
  for i1, c1 in enumerate(config['categories']):
    if i1 > d['categoryIdx']:
      break

    for i2, c2 in enumerate(c1['blocks']):
      if i1 == d['categoryIdx'] and i2 > d['blockIdx']:
        break

      for i3, c3 in enumerate(c2['columns']):
        c = len(c3['tiles'])
        if i1 == d['categoryIdx'] and i2 == d['blockIdx']:
          if i3 > d['columnIdx']:
            break
          if i3 == d['columnIdx']:
            c = d['tileIdx'] + 1
        num_charts += c

  return num_charts - 1


def _fname(start, now):
  return 'querylog_' + start.strftime('%Y%m%d%H') + '_' + \
    now.strftime('%Y%m%d%H') + '.csv'


def _key_parse(key: str):
  # Format xxx_yyyyyyyy_<app>#<project>
  prefix = key.split('#')[0]
  parts = prefix.split('_')
  ts = int(parts[1])
  time = datetime.fromtimestamp(ts / 1000000.0).strftime('%Y-%m-%d %H:%M:%S')
  app = parts[2] if len(parts) > 2 else 'nl'
  return time, app


# TODO: Support special Explore params for url.
def _url(ditem, base_url, app):
  parts = []

  queries = [it['query'] for it in ditem['session']['items']]

  if app == 'explore':
    url = f'{base_url}/explore#oq={queries[0]}'
  else:
    url = f'{base_url}/nl#a=True&d=True&q=' + ';'.join(queries)

  return url


def _write_all_rows(key, data, env, out_rows):
  for i, it in enumerate(data[_COL_SESSION]['items']):
    time, app = _key_parse(key)

    if i < len(data[_COL_DATA]):
      ditem = data[_COL_DATA][i]
    else:
      continue

    detection = _midx(ditem, ['debug', 'detection_type'])
    index = _midx(ditem, [
        'debug', 'query_detection_debug_logs', 'query_transformations',
        'sv_detection_query_index_types'
    ])
    output_row = {
        'Time': time,
        'Query': it['query'],
        'Application': app,
        'Env': env['name'],
        'Detection': detection,
        'EmbeddingsIndex':  # The index type is nested...
            index,
        'SessionId': key,
        'URL': _url(ditem, env['url'], app),
        'Status': it['status']
    }
    out_rows.append(output_row)


def _write_feedback_rows(key, data, env, out_rows):
  for fb in data[_COL_FEEDBACK]:
    if 'queryId' in fb:
      # Query-level feedback
      item = _lidx(key, data[_COL_SESSION], fb, [('items', 'queryId')])
      if not item:
        continue
      query = item['query']

      ditem = _lidx(key, data, fb, [(_COL_DATA, 'queryId')])
      if not ditem:
        continue

      config = {}
      abs_chart_idx = -1

    elif 'chartId' in fb:
      cid = fb['chartId']
      qitem = _lidx(key, data[_COL_SESSION], cid, [('items', 'queryIdx')])
      if not qitem:
        continue
      query = qitem['query']

      ditem = _lidx(key, data, cid, [(_COL_DATA, 'queryIdx')])
      if not ditem:
        continue

      config = ditem['config']
      config = _lidx(key, config, cid, [('categories', 'categoryIdx'),
                                        ('blocks', 'blockIdx'),
                                        ('columns', 'columnIdx'),
                                        ('tiles', 'tileIdx')])
      if not config:
        continue
      abs_chart_idx = _abs_chart_idx(ditem['config'], cid)
      if abs_chart_idx >= _CHART_IDX_THRESHOLD:
        continue

    sentiment = fb['sentiment']
    comment = fb.get('comment', '')

    # Format xxx_yyyyyyyy_<app>#<project>
    time, app = _key_parse(key)

    detection = _midx(ditem, ['debug', 'detection_type'])
    index = _midx(ditem, [
        'debug', 'query_detection_debug_logs', 'query_transformations',
        'sv_detection_query_index_types'
    ])
    output_row = {
        'Time':
            time,
        'Application':
            app,
        'Env':
            env['name'],
        'Query':
            query,
        'ChartIndex':
            abs_chart_idx,
        'Feedback':
            sentiment,
        'UserComment':
            comment,
        'Detection':
            detection,
        'ChartTitle':
            config.get('title'),
        'ChartType':
            config.get('type'),
        'ChartVarKeys':  # Just a few keys for sanity check
            '\n'.join(config.get('statVarKey', [])[:5]),
        'EmbeddingsIndex':  # The index type is nested...
            index,
        'SessionId':
            key,
        'URL':
            _url(ditem, env['url'], app)
    }
    out_rows.append(output_row)


def mine(table, start, out_rows, supported_env, all_rows):
  rows = table.read_rows(filter_=row_filters.TimestampRangeFilter(
      row_filters.TimestampRange(start=start)))
  for row in rows:
    key = row.row_key.decode('utf-8')
    # Format xxx_yyyyyyyy#<project>
    project = key.split('#')[1].strip()
    if project not in supported_env:
      continue
    data = {
        _COL_DATA: [],
        _COL_FEEDBACK: [],
        _COL_SESSION: {},
    }
    skip_session = False
    for _, cols in row.cells.items():

      for col, cells in cols.items():
        col = col.decode('utf-8')

        if col == _COL_SESSION:
          # The latest value will have *all* the queries.
          val = cells[0].value.decode('utf-8')
          data[col] = json.loads(val)
        elif col in [_COL_DATA, _COL_FEEDBACK]:
          for cell in cells:
            try:
              value = cell.value.decode('utf-8')
            except UnicodeDecodeError as e:
              logging.error(f'Unable to decode {col} {row.row_key}')
              skip_session = True
              break
            data[col].append(json.loads(value))
      if skip_session:
        break
    if skip_session:
      continue

    # We should sort data[_COL_DATA] in order of num-session-items.
    # (the default order will be reversed).
    data[_COL_DATA].sort(key=lambda x: len(x['session']['items']))

    if all_rows:
      _write_all_rows(key, data, supported_env[project], out_rows)
    else:
      _write_feedback_rows(key, data, supported_env[project], out_rows)


def main(_):
  client = bigtable.Client(project=FLAGS.project)
  instance = client.instance(FLAGS.instance)
  table = instance.table(FLAGS.table)

  now = datetime.now()
  start = now - timedelta(days=FLAGS.past_days)

  out_rows = []
  if FLAGS.env_name:
    supported_env = {}
    for k, v in _SUPPORTED_ENV.items():
      if v.get('name') == FLAGS.env_name:
        supported_env[k] = v
    assert supported_env
  else:
    supported_env = _SUPPORTED_ENV

  mine(table, start, out_rows, supported_env, FLAGS.all_rows)
  out_rows.sort(key=lambda x: x['Time'])

  output_csv = os.path.join(FLAGS.output_dir, _fname(start, now))
  with open(output_csv, 'w') as fp:
    if FLAGS.all_rows:
      fieldnames = [
          'Time', 'Application', 'Env', 'Query', 'Detection', 'EmbeddingsIndex',
          'SessionId', 'URL', 'Status'
      ]
    else:
      fieldnames = [
          'Time', 'Application', 'Env', 'Query', 'ChartIndex', 'Feedback',
          'UserComment', 'Detection', 'ChartTitle', 'ChartType', 'ChartVarKeys',
          'EmbeddingsIndex', 'SessionId', 'URL', 'Status'
      ]
    csvw = csv.DictWriter(fp, fieldnames=fieldnames)
    csvw.writeheader()
    csvw.writerows(out_rows)

  print(f'\nOutput written to: {output_csv}\n')


if __name__ == "__main__":
  app.run(main)
