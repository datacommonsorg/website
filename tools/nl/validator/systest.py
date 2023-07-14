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
from typing import Dict, List

from absl import app
from absl import flags
import requests

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

CONFIG = 'detector=heuristic&idx=medium_ft&place_detector=ner'

URL = 'https://dev.datacommons.org/api/nl/data?' + CONFIG

OUT_HEADER = [
    'Query', 'SV', 'Place', 'Exception', 'EmptyResult', 'WrongPlace',
    'ChartSVRank', 'EmbeddingsSVRank'
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
      'Place': pl,
      'Exception': '',
      'EmptyResult': '',
      'WrongPlace': '',
      'ChartSVRank': '',
      'EmbeddingsSVRank': '',
  }


def init_counters():
  counters = {}
  for c in [
      'Total', 'Exception', 'EmptyResult', 'WrongPlace', 'ChartSVRank_0',
      'ChartSVRank_1', 'ChartSVRank_2', 'ChartSVRank_3', 'ChartSVRank_4',
      'ChartSVRank_5', 'ChartSVRank_6-14', 'ChartSVRank_15+', 'ChartSVRank_INF',
      'EmbeddingsSVRank_0', 'EmbeddingsSVRank_1', 'EmbeddingsSVRank_2',
      'EmbeddingsSVRank_3+', 'EmbeddingsSVRank_INF'
  ]:
    counters[c] = 0
  return counters


def compose_query(v, p):
  # clean up some stuff
  v = v.lower()
  if v.startswith('population: '):
    v = v.replace('population: ', 'number of people who are ')
  return v + ' in ' + p.lower()


def query(sv, pl, sv_name, pl_name, counters):
  q = compose_query(sv_name, pl_name)
  ret = init_result(q, sv, pl)

  counters['Total'] += 1
  try:
    resp = requests.post(URL + f'&q={q}', json={'contextHistory': {}}).json()
  except Exception as e:
    print(f'ERROR: {e}')
    ret['Exception'] = '*'
    counters['Exception'] += 1
    return ret

  if not resp.get('config'):
    ret['EmptyResult'] = '*'
    counters['EmptyResult'] += 1
    return ret
  cfg = resp['config']

  p = cfg['metadata']['placeDcid'][0]
  if p != pl:
    ret['WrongPlace'] = '*'
    counters['WrongPlace'] += 1

  found_sv = False
  for i, s in enumerate(
      resp.get('debug', {}).get('sv_matching', {}).get('CosineScore', [])):
    if s < 0.5:
      # An SV with this score is good as an SV with INF
      # rank because the backend filters these.
      # TODO: Maybe in future we mark them separate.
      continue
    if sv == resp['debug']['sv_matching']['SV'][i]:
      found_sv = True
      ret['EmbeddingsSVRank'] = i
      if i >= 3:
        counters['EmbeddingsSVRank_3+'] += 1
      else:
        counters[f'EmbeddingsSVRank_{i}'] += 1
  if not found_sv:
    ret['EmbeddingsSVRank'] = -1
    counters['EmbeddingsSVRank_INF'] += 1

  idx = 0
  for cat in cfg.get('categories', []):
    kmap = cat.get('statVarSpec', {})
    for blk in cat.get('blocks', []):
      for col in blk.get('columns', []):
        for tile in col.get('tiles', []):
          for k in tile.get('statVarKey', []):
            if sv == kmap[k]['statVar']:
              ret['ChartSVRank'] = idx
              if idx >= 15:
                counters['ChartSVRank_15+'] += 1
              elif idx >= 6:
                counters['ChartSVRank_6-14'] += 1
              else:
                counters[f'ChartSVRank_{idx}'] += 1
              return ret
          idx += 1

  ret['ChartSVRank'] = -1
  counters['ChartSVRank_INF'] += 1
  return ret


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
                     counters=ctx.counters)
      ctx.rows.append(result)

      # Time for checkpointing?
      if ctx.counters['Total'] % CHECKPOINT_INTERVAL == 0:
        write_checkpoint(ctx)

      # We only want one place.
      break

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
              counters_json=counters_json))


if __name__ == "__main__":
  app.run(main)
