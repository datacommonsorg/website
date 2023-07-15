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
import requests
import datacommons as dc

FLAGS = flags.FLAGS

flags.DEFINE_string('input_csv', 'data/bootstrap.csv', 'Input tokens CSV file')
flags.DEFINE_string('checkpoint_dir', 'checkpoint/', 'Generated files')
flags.DEFINE_string('run_name', 'foo',
                    'Unique name of the test, for continuation, etc.')
flags.DEFINE_bool('do_places_in', False, 'Generate places in?')

_PLACE_PREF = [
    'State',
    'County',
    'Country',
    'AdministrativeArea1',
    'AdministrativeArea2',
    'EurostatNUTS2',
    'EurostatNUTS3',
    'EurostatNUTS1',
]

URL = 'https://api.datacommons.org/v1/recognize/places?key=AIzaSyCTI4Xz-UW_G2Q2RfknhcfdAnTHq5X5XuI'
POP_URL = 'https://api.datacommons.org/v1/bulk/observations/point?key=AIzaSyCTI4Xz-UW_G2Q2RfknhcfdAnTHq5X5XuI'

OUT_HEADER = [
    'Query', 'OrigPlace', 'WrongPlace', 'BogusPlace', 'WrongPlaceName', 'BogusPlaceName',
    'Success', 'Exception', 'EmptyResult', 'SV'
]

CHECKPOINT_INTERVAL = 100


@dataclass
class Context:
  rows: List[Dict]
  counters: Dict
  bootstrap: Dict
  input_csv: str
  output_csv: str
  counters_json: str
  bad_dcids: Set[str]
  dcid_names: Dict
  dcid_pop: Dict


def load_bootstrap(ctx):
  with open(ctx.input_csv) as fin:
    print('Loading bootstrap...\n')
    for row in csv.DictReader(fin):
      sv = row['SV']
      if sv not in ctx.bootstrap:
        ctx.bootstrap[sv] = {'name': row['SVDesc']}

      pt = row['PlaceType']
      ctx.bootstrap[sv][pt] = {
          'dcid': row['Place'],
          'name': row['PlaceName'],
      }


def load_checkpoint(ctx):
  if (os.path.exists(ctx.output_csv) and os.path.exists(ctx.counters_json)):
    print('Loading checkpoint...\n')

    with open(ctx.output_csv, 'r') as fin:
      for row in csv.DictReader(fin):
        ctx.rows.append(row)
        # Don't process it again!
        del ctx.bootstrap[row['SV']]

    with open(ctx.counters_json, 'r') as fin:
      ctx.counters = json.load(fin)


def write_checkpoint(ctx):
  print('Checkpointing...')
  print(f'  Counters: {ctx.counters}\n')

  with open(ctx.output_csv, 'w') as fout:
    csvw = csv.DictWriter(fout, fieldnames=OUT_HEADER)
    csvw.writeheader()
    csvw.writerows(ctx.rows)

  with open(ctx.counters_json, 'w') as fout:
    json.dump(ctx.counters, fout)


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
  for c in ['Total', 'Exception', 'EmptyResult', 'WrongPlace', 'BogusPlace', 'Success']:
    counters[c] = 0
  return counters


def compose_query(v):
  # clean up some stuff
  v = v.lower()
  if v.startswith('population: '):
    v = v.replace('population: ', 'number of people who are ')
  v += ' in'
  return ' '.join(v.split())


def query(sv, pl, sv_name, pl_name, counters, bad_dcids):
  qsv = compose_query(sv_name)
  q = qsv + ' ' + pl_name

  ret = init_result(q, sv, pl)

  counters['Total'] += 1
  try:
    resp = requests.post(URL + f'&queries={q}').json()
  except Exception as e:
    print(f'ERROR: {e}')
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
      # print(f'{q} - {ngot} {nsv}')
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


def update_rows(ctx):
  dcids = sorted([d for d in ctx.bad_dcids if d not in ctx.dcid_names])

  if dcids:
    print(f'Looking up {len(dcids)} entries')
    try:
      res = dc.get_property_values(dcids, 'name')
    except Exception as e:
      print(f'DC ERROR: {e}')
      return
    for k, v in res.items():
      if v:
        ctx.dcid_names[k] = v[0]

    try:
      url = POP_URL + '&variables=Count_Person&' + '&'.join('entities=' + e for e in dcids)
      resp = requests.get(url).json()
    except Exception as e:
      print(f'API ERROR: {e}')
      return
    
    for einfo in resp['observationsByVariable'][0].get('observationsByEntity', []):
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
  load_bootstrap(ctx)

  # Load any prior checkpoint (which drops stuff from bootstrap)
  load_checkpoint(ctx)

  print('Processing...\n')
  for sv in sorted(ctx.bootstrap):
    svi = ctx.bootstrap[sv]
    for pt in _PLACE_PREF:
      if pt not in svi:
        continue
      result = query(sv=sv,
                     pl=svi[pt]['dcid'],
                     sv_name=svi['name'],
                     pl_name=svi[pt]['name'],
                     counters=ctx.counters,
                     bad_dcids=ctx.bad_dcids)
      ctx.rows.append(result)

      # Time for checkpointing?
      if ctx.counters['Total'] % CHECKPOINT_INTERVAL == 0:
        update_rows(ctx)
        write_checkpoint(ctx)

      # We only want one place.
      break

  update_rows(ctx)
  # Finally write checkpoint.
  write_checkpoint(ctx)


def main(_):
  output_csv = os.path.join(FLAGS.checkpoint_dir, FLAGS.run_name + '.csv')
  counters_json = os.path.join(FLAGS.checkpoint_dir,
                               FLAGS.run_name + '_counters.json')
  run(
      Context(bootstrap={},
              counters=init_counters(),
              rows=[],
              input_csv=FLAGS.input_csv,
              output_csv=output_csv,
              counters_json=counters_json,
              bad_dcids=set(),
              dcid_names={},
              dcid_pop={}))


if __name__ == "__main__":
  app.run(main)
