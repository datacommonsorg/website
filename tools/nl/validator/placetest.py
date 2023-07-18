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
from dataclasses import dataclass
import json
import os
from typing import Dict, List, Set

from absl import app
from absl import flags
import datacommons as dc
import requests
import utils

FLAGS = flags.FLAGS

flags.DEFINE_string('input_csv', 'data/bootstrap.csv', 'Input tokens CSV file')
flags.DEFINE_string('names_csv', 'data/llm_output.csv',
                    'Input SV descriptions CSV file')
flags.DEFINE_string('checkpoint_dir', 'checkpoint/', 'Generated files')
flags.DEFINE_string('run_name', 'foo',
                    'Unique name of the test, for continuation, etc.')
flags.DEFINE_bool('do_places_in', False, 'Generate places in?')

# Use autopush endpoint for recon to get the latest fixes.
URL = 'https://autopush.api.datacommons.org/v1/recognize/places?key=AIzaSyBCybF1COkc05kj5n5FHpXOnH3EdGBnUz0'

POP_URL = 'https://api.datacommons.org/v1/bulk/observations/point?key=AIzaSyCTI4Xz-UW_G2Q2RfknhcfdAnTHq5X5XuI'

OUT_HEADER = [
    'Query', 'OrigPlace', 'WrongPlace', 'BogusPlace', 'WrongPlaceName',
    'BogusPlaceName', 'Success', 'Exception', 'EmptyResult', 'SV'
]

CHECKPOINT_INTERVAL = 30


@dataclass
class Context:
  rows: List[Dict]
  counters: Dict
  bootstrap: Dict
  input_csv: str
  names_csv: str
  output_csv: str
  counters_json: str
  out_header: List[str]
  bad_dcids: Set[str]
  dcid_names: Dict
  dcid_pop: Dict


def init_result(q, sv, pl):
  return {
      'Query': q,
      'SV': sv,
      'OrigPlace': pl,
      'WrongPlace': '',
      'BogusPlace': '',
      'Success': '',
      'Exception': '',
      'EmptyResult': '',
      'WrongPlaceName': '',
      'BogusPlaceName': '',
  }


def init_counters():
  counters = {}
  for c in [
      'Total', 'Exception', 'EmptyResult', 'WrongPlace', 'BogusPlace', 'Success'
  ]:
    counters[c] = 0
  return counters


def compose_query(v):
  # clean up some stuff
  v = v.lower()
  if v.startswith('population: '):
    v = v.replace('population: ', 'number of people who are ')
  v += ' in'
  return ' '.join(v.split())


#
# Query the RecognizePlaces Mixer API and update counters based
# on the results.  Any places that are wrong (not the requested place)
# or bogus (some unintended span mapped to a place), are added to
# bad_dcids set.
#
# TODO: refactor for readability
#
def query(sv, pl, sv_name, pl_name, counters, bad_dcids):
  qsv = compose_query(sv_name)
  q = qsv + ' ' + pl_name

  ret = init_result(q, sv, pl)

  counters['Total'] += 1
  try:
    resp = requests.post(URL + f'&queries={q}').json()
  except Exception as e:
    print(f'ERROR: {q} {e}')
    ret['Exception'] = '*'
    counters['Exception'] += 1
    return ret

  items = resp.get('queryItems', {}).get(q, {}).get('items', [])

  found_place = False
  bogus_dcids = []
  place_dcids = []
  nsv = len(qsv.replace(' ', ''))
  ngot = 0
  for item in items:
    if 'span' not in item:
      continue
    ngot += len(item['span'].replace(' ', ''))
    if 'places' in item and item['places'] and 'dcid' in item['places'][0]:
      found_place = True
      dcids = [it['dcid'] for it in item['places']]
      if ngot <= nsv:
        # Just one bogus DCID is enough.
        bogus_dcids.append(dcids[0])
      else:
        place_dcids.append(dcids)

  if not found_place:
    ret['EmptyResult'] = '*'
    counters['EmptyResult'] += 1
    return ret

  if bogus_dcids:
    # Flatten
    ret['BogusPlace'] = ';'.join(bogus_dcids)
    bad_dcids.update(bogus_dcids)
    counters['BogusPlace'] += 1

  if len(place_dcids) == 1 and pl in place_dcids[0]:
    if not bogus_dcids:
      ret['Success'] = '*'
      counters['Success'] += 1
    return ret

  wrong_dcids = []
  for plist in place_dcids:
    if pl in plist:
      continue
    wrong_dcids.extend(plist)

  ret['WrongPlace'] = ';'.join(wrong_dcids)
  bad_dcids.update(wrong_dcids)
  counters['WrongPlace'] += 1

  return ret


#
# Update `ctx.rows` with BogusPlaceName and WrongPlaceName fields
# by batching name and population queries.
#
def update_rows(ctx):
  dcids = sorted([d for d in ctx.bad_dcids if d not in ctx.dcid_names])

  if dcids:
    try:
      res = dc.get_property_values(dcids, 'name')
    except Exception as e:
      print(f'DC ERROR: {dcids} {e}')
      return
    for k, v in res.items():
      if v:
        ctx.dcid_names[k] = v[0]

    try:
      url = POP_URL + '&variables=Count_Person&' + '&'.join(
          'entities=' + e for e in dcids)
      resp = requests.get(url).json()
    except Exception as e:
      print(f'API ERROR: {dcids} {e}')
      return

    for einfo in resp['observationsByVariable'][0].get('observationsByEntity',
                                                       []):
      if 'entity' not in einfo or not einfo.get('pointsByFacet'):
        continue
      ctx.dcid_pop[einfo['entity']] = einfo['pointsByFacet'][0]['value']

  for row in ctx.rows:
    for k in ['BogusPlace', 'WrongPlace']:
      if not row[k]:
        continue
      if row[k + 'Name']:
        continue
      parts = row[k].split(';')
      names = []
      for p in parts:
        if p not in ctx.dcid_names:
          continue
        n = ctx.dcid_names[p]
        if p in ctx.dcid_pop:
          n += f' ({ctx.dcid_pop[p]})'
        names.append(n)
      row[k + 'Name'] = ';'.join(names)


def run(ctx):
  # Load bootstrap CSV.
  utils.load_bootstrap(ctx)

  # Load any prior checkpoint (which drops stuff from bootstrap)
  utils.load_checkpoint(ctx)

  print('Processing...\n')
  nsvproc = 0
  for sv in sorted(ctx.bootstrap):
    svi = ctx.bootstrap[sv]
    for pt in utils.PLACE_PREF:
      if pt not in svi:
        continue

      for sv_name in svi['names']:
        result = query(sv=sv,
                       pl=svi[pt]['dcid'],
                       sv_name=sv_name,
                       pl_name=svi[pt]['name'],
                       counters=ctx.counters,
                       bad_dcids=ctx.bad_dcids)
        ctx.rows.append(result)

      # Time for checkpointing?
      nsvproc += 1
      if nsvproc % CHECKPOINT_INTERVAL == 0:
        update_rows(ctx)
        utils.write_checkpoint(ctx)

      # We only want one place.
      break

  update_rows(ctx)
  # Finally write checkpoint.
  utils.write_checkpoint(ctx)


def main(_):
  output_csv = os.path.join(FLAGS.checkpoint_dir, FLAGS.run_name + '.csv')
  counters_json = os.path.join(FLAGS.checkpoint_dir,
                               FLAGS.run_name + '_counters.json')
  run(
      Context(bootstrap={},
              counters=init_counters(),
              rows=[],
              input_csv=FLAGS.input_csv,
              names_csv=FLAGS.names_csv,
              output_csv=output_csv,
              counters_json=counters_json,
              out_header=OUT_HEADER,
              bad_dcids=set(),
              dcid_names={},
              dcid_pop={}))


if __name__ == "__main__":
  app.run(main)
