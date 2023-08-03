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
import re
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

CONFIG = 'sz=medium_ft&skip_multi_sv=1'

URL = 'http://localhost:6060/api/search_sv?' + CONFIG

OUT_HEADER = [
    'Query',
    'SV',
    'EmbeddingsSVRank',
    'BelowThresholdSVRank',
    'Exception',
    'EmptyResult',
    'DemoteSV',
    'BelowThresholdDemoteSV',
    'FineTuningPairs',
]

INCR_THRESHOLD = 0.1

CHECKPOINT_INTERVAL = 100


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


def init_result(q, sv):
  return {
      'Query': q,
      'SV': sv,
      'Exception': '',
      'EmptyResult': '',
      'EmbeddingsSVRank': '',
      'BelowThresholdSVRank': '',
      'DemoteSV': '',
      'BelowThresholdDemoteSV': '',
      'FineTuningPairs': []
  }


def init_counters():
  counters = {}
  for c in [
      'Total',
      'Exception',
      'EmptyResult',
      'WrongPlace',
      'EmbeddingsSVRank_0',
      'EmbeddingsSVRank_1',
      'EmbeddingsSVRank_2',
      'EmbeddingsSVRank_3',
      'EmbeddingsSVRank_4',
      'EmbeddingsSVRank_5',
      'EmbeddingsSVRank_6-14',
      'EmbeddingsSVRank_15+',
      'EmbeddingsSVRank_INF',
      'BelowThresholdSVRank_x',
      'BelowThresholdSVRank_INF',
      'FineTuningPairs',
  ]:
    counters[c] = 0
  return counters


def compose_query(v):
  # clean up some stuff
  v = v.lower()
  if v.startswith('population: '):
    v = v.replace('population: ', 'number of people who are ')
  return v


def ft_pairs(query, good_sv, bad_sv, sv2sentences):
  good = {}
  bad = {}
  for l, o in [(sv2sentences[good_sv], good), (sv2sentences[bad_sv], bad)]:
    for i in l:
      # "population of men (0.6353)"
      pattern = r'^(.*?)\((\d+\.\d+)\)$'
      match = re.search(pattern, i)
      if match:
        txt = match.group(1).strip()
        num = float(match.group(2))
        o[txt] = num

  # Get max-score, ensure it is at least 0.5
  max_score = max(list(bad.values()))
  # TODO: Use a sharedlib const.
  if max_score < 0.5:
    max_score = 0.5

  # Add some delta over it.
  new_score = max_score + INCR_THRESHOLD

  res = []
  res.append(f'# {bad_sv} -> {good_sv}')
  for txt in sorted(good.keys()):
    res.append(f'{query},{txt},{new_score}')
  return res


#
# Queries the NL server and updates counters and returns
# a CSV row.
#
# Given the list of ranked SVs with scores, it updates the
# ranks of the queried SV.  Also if the queried SV is not
# at the top, it generates query pairs for fine-tuning
# between the query and every sentence of the queried SV,
# with a score that exceeds the top-most bad SV.
#
def query(sv, sv_name, counters):
  q = compose_query(sv_name)
  ret = init_result(q, sv)

  counters['Total'] += 1
  try:
    resp = requests.get(URL + f'&q={q}').json()
  except Exception as e:
    print(f'ERROR: {q} {e}')
    ret['Exception'] = '*'
    counters['Exception'] += 1
    return ret

  if not resp.get('SV'):
    ret['EmptyResult'] = '*'
    counters['EmptyResult'] += 1
    return ret

  sv2sentences = resp['SV_to_Sentences']

  found_sv = False
  sv0 = ''
  for i, s in enumerate(resp.get('CosineScore', [])):
    # An SV with this score is good as an SV with INF
    # rank because the backend filters these.
    is_below = True if s < 0.5 else False
    if sv == resp['SV'][i]:
      found_sv = True
      if is_below:
        ret['BelowThresholdSVRank'] = i
        counters['BelowThresholdSVRank_x'] += 1

        ret['EmbeddingsSVRank'] = -1
        counters['EmbeddingsSVRank_INF'] += 1
        break

      ret['EmbeddingsSVRank'] = i
      if i >= 15:
        counters['EmbeddingsSVRank_15+'] += 1
      elif i >= 6:
        counters['EmbeddingsSVRank_6-14'] += 1
      else:
        counters[f'EmbeddingsSVRank_{i}'] += 1

      ret['BelowThresholdSVRank'] = -1
      counters['BelowThresholdSVRank_INF'] += 1

      if i > 0:
        pairs = ft_pairs(q, sv, sv0, sv2sentences)
        counters['FineTuningPairs'] += len(pairs)
        ret['FineTuningPairs'].extend(pairs)
      break
    else:
      sv0 = resp['SV'][0]
      if i == 0:
        if is_below:
          ret['DemoteSV'] = sv0
        else:
          ret['BelowThresholdDemoteSV'] = sv0

  if not found_sv:
    ret['EmbeddingsSVRank'] = -1
    counters['EmbeddingsSVRank_INF'] += 1
    ret['BelowThresholdSVRank'] = -1
    counters['BelowThresholdSVRank_INF'] += 1
    # TODO: Consider adding fine-tuning pairs for these.

  ret['FineTuningPairs'] = '\n'.join(ret['FineTuningPairs'])

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
    for sv_name in svi['names']:
      result = query(sv=sv, sv_name=sv_name, counters=ctx.counters)
      ctx.rows.append(result)

    # Time for checkpointing?
    nsvproc += 1
    if nsvproc % CHECKPOINT_INTERVAL == 0:
      utils.write_checkpoint(ctx)

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
