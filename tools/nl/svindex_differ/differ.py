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

# TODO: Consider including cosine scores in the comparison.
# TODO: Support index size

import csv
from datetime import datetime
import difflib
import os
import pwd

from absl import app
from absl import flags
from google.cloud import storage
from jinja2 import Environment
from jinja2 import FileSystemLoader
import requests
import yaml

from nl_server.embeddings_map import EmbeddingsMap
from nl_server.search import search_vars
from shared.lib.detected_variables import VarCandidates

_SV_THRESHOLD = 0.5
_NUM_SVS = 10
_SUB_COLOR = '#ffaaaa'
_ADD_COLOR = '#aaffaa'
_PROPERTY_URL = 'https://autopush.api.datacommons.org/v2/node'
_GCS_BUCKET = 'datcom-embedding-diffs'
_LOCAL_EMBEDDINGS_YAML = 'deploy/nl/embeddings.yaml'
_PROD_EMBEDDINGS_YAML = f'https://raw.githubusercontent.com/datacommonsorg/website/master/{_LOCAL_EMBEDDINGS_YAML}'

FLAGS = flags.FLAGS

flags.DEFINE_string('base_index', '',
                    'Base index name in PROD `embeddings.yaml` file.')
flags.DEFINE_string('test_index', '',
                    'Test index name in local `embeddings.yaml`')
flags.DEFINE_string('queryset', '', 'Full path to queryset CSV')

_GCS_PREFIX = 'https://storage.mtls.cloud.google.com'
_TEMPLATE = 'tools/nl/svindex_differ/template.html'
_REPORT = '/tmp/diff_report.html'

AUTOPUSH_KEY = os.environ.get('AUTOPUSH_KEY')
assert AUTOPUSH_KEY


def _load_yaml(path: str, idx: str):
  if path.startswith('https://'):
    embeddings_dict = yaml.safe_load(requests.get(path).text)
  else:
    with open(path) as fp:
      embeddings_dict = yaml.full_load(fp)
  assert idx in embeddings_dict
  # Return just this index
  return {idx: embeddings_dict[idx]}


def _get_sv_names(sv_dcids):
  """Get stat var names by making a mixer call"""
  headers = {'Content-Type': 'application/json'}
  headers['x-api-key'] = AUTOPUSH_KEY
  resp = requests.post(_PROPERTY_URL,
                       json={
                           'nodes': sv_dcids,
                           'property': '->name'
                       },
                       headers=headers).json()
  result = {}
  for node, node_arcs in resp.get('data', {}).items():
    for v in node_arcs.get('arcs', {}).get('name', {}).get('nodes', []):
      if 'value' in v:
        result[node] = (v['value'])
        break
  return result


def _prune(res: VarCandidates):
  svs = []
  sv_info = {}
  for i, var in enumerate(res.svs):
    score = res.scores[i]
    if i < _NUM_SVS and score >= _SV_THRESHOLD:
      svs.append(var)
      sv_info[var] = {
          'sv': var,
          'rank': i + 1,
          'score': score,
          'sentence_scores': res.sv2sentences[var],
      }
  return svs, sv_info


def _get_file_name():
  """Get the file name to use"""
  username = pwd.getpwuid(os.getuid()).pw_name
  date = datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
  return f'{username}_{FLAGS.base_index}_{date}.html'


def _get_diff_table(diff_list, base_sv_info, test_sv_info):
  """Given a list of diffs produced by the difflib.Differ, get the rows of
  sv information to show in the diff table.
  """
  diff_table_rows = []
  last_added = -1
  for i, diff in enumerate(diff_list):
    if i <= last_added:
      continue
    last_added = i
    # difflib.Differ will add 2 characters in front of the original text for every line.
    diff_sv = diff[2:]
    next_diff = None
    if i < len(diff_list) - 1:
      next_diff = diff_list[i + 1]
    # If the line starts with ?, this means it is not present in either base or test.
    # https://docs.python.org/3/library/difflib.html#difflib.Differ
    if diff.startswith('?'):
      continue
    # If theres no + or -, that means this line is the same in both base and test.
    elif not diff.startswith('+') and not diff.startswith('-'):
      base_info = base_sv_info.get(diff_sv, {})
      test_info = test_sv_info.get(diff_sv, {})
      diff_table_rows.append((base_info, test_info))
    # If the line starts with -, this means it was present in base but not in test.
    elif diff.startswith('-'):
      base_info = base_sv_info.get(diff_sv, {})
      base_info['color'] = _SUB_COLOR
      test_info = {}
      if next_diff and next_diff.startswith('+'):
        test_sv = next_diff[2:]
        test_info = test_sv_info.get(test_sv, {})
        test_info['color'] = _ADD_COLOR
        last_added = i + 1
      diff_table_rows.append((base_info, test_info))
    # Otherwise, the line started with +, which means it was present in test but not base.
    else:
      base_info = {}
      test_info = test_sv_info.get(diff_sv, {})
      test_info['color'] = _ADD_COLOR
      if next_diff and next_diff.startswith('-'):
        base_sv = next_diff[2:]
        base_info = base_sv_info.get(base_sv, {})
        base_info['color'] = _SUB_COLOR
        last_added = i + 1
      diff_table_rows.append((base_info, test_info))
  return diff_table_rows


def run_diff(base_idx: str, test_idx: str, base_dict: dict[str, dict[str, str]],
             test_dict: dict[str, dict[str, str]], query_file: str,
             output_file: str):
  env = Environment(loader=FileSystemLoader(os.path.dirname(_TEMPLATE)))
  template = env.get_template(os.path.basename(_TEMPLATE))

  base = EmbeddingsMap(base_dict).get(base_idx)
  test = EmbeddingsMap(test_dict).get(test_idx)

  # Get the list of diffs
  diffs = []
  all_svs = set()
  with open(query_file) as f:
    for row in csv.reader(f):
      if not row:
        continue
      query = row[0].strip()
      if not query or query.startswith('#') or query.startswith('//'):
        continue
      assert ';' not in query, 'Multiple query not yet supported'
      base_svs, base_sv_info = _prune(search_vars([base], [query])[query])
      test_svs, test_sv_info = _prune(search_vars([test], [query])[query])
      for sv in base_svs + test_svs:
        all_svs.add(sv)
      if base_svs != test_svs:
        diff_list = list(difflib.Differ().compare(base_svs, test_svs))
        diff_table_rows = _get_diff_table(diff_list, base_sv_info, test_sv_info)
        diffs.append((query, diff_table_rows))

  # Update the diffs with sv names
  sv_names = _get_sv_names(list(all_svs))
  for _, diff_table_rows in diffs:
    for row in diff_table_rows:
      for info in row:
        info['name'] = sv_names.get(info.get('sv'), '')

  # Render the html with the diffs
  with open(output_file, 'w') as f:
    f.write(
        template.render(base_file=base_dict[base_idx],
                        test_file=test_dict[test_idx],
                        diffs=diffs))
  print('')
  print(f'Saving locally to {output_file}')
  print('')
  sc = storage.Client()
  bucket = sc.bucket(_GCS_BUCKET)

  # Upload diff report html to GCS
  print("Attempting to write to GCS")
  gcs_filename = _get_file_name()
  blob = bucket.blob(gcs_filename)
  # Since the files can be fairly large, use a 10min timeout to be safe.
  blob.upload_from_filename(output_file, timeout=600)
  print("Done uploading to gcs.")
  print(f"\t Diff report Filename: {_GCS_PREFIX}/{_GCS_BUCKET}/{gcs_filename}")


def main(_):
  assert FLAGS.base_index and FLAGS.test_index and FLAGS.queryset

  base_dict = _load_yaml(_LOCAL_EMBEDDINGS_YAML, FLAGS.base_index)
  test_dict = _load_yaml(_PROD_EMBEDDINGS_YAML, FLAGS.test_index)

  run_diff(FLAGS.base_index, FLAGS.test_index, base_dict, test_dict,
           FLAGS.queryset, _REPORT)


if __name__ == "__main__":
  app.run(main)
