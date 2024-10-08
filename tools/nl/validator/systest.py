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

from dataclasses import dataclass
import os
from typing import Dict, List

from absl import app
from absl import flags
import requests
import utils

FLAGS = flags.FLAGS

flags.DEFINE_string('input_csv', 'data/bootstrap.csv',
                    'Input bootstrap CSV file')
flags.DEFINE_string('names_csv', 'data/llm_output.csv',
                    'Input SV descriptions CSV file')
flags.DEFINE_string('checkpoint_dir', 'checkpoint/', 'Generated files')
flags.DEFINE_string('run_name', 'foo',
                    'Unique name of the test, for continuation, etc.')
flags.DEFINE_bool('do_places_in', False, 'Generate places in?')

CONFIG = 'detector=heuristic&idx=base_uae_mem'

URL = 'https://dev.datacommons.org/api/nl/data?' + CONFIG

OUT_HEADER = [
    'Query', 'SV', 'Place', 'Exception', 'EmptyResult', 'WrongPlace',
    'ChartSVRank', 'EmbeddingsSVRank'
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
    print(f'ERROR: {q} {e}')
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
      break
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
                       counters=ctx.counters)
        ctx.rows.append(result)

      # Time for checkpointing?
      nsvproc += 1
      if nsvproc % CHECKPOINT_INTERVAL == 0:
        utils.write_checkpoint(ctx)

      # We only want one place.
      break

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
              out_header=OUT_HEADER))


if __name__ == "__main__":
  app.run(main)
