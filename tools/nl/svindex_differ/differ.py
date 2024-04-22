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
import re

from absl import app
from absl import flags
from google.cloud import storage
from jinja2 import Environment
from jinja2 import FileSystemLoader
import requests

from nl_server import gcs
from nl_server.embeddings import Embeddings
from nl_server.model.sentence_transformer import LocalSentenceTransformerModel
from nl_server.search import search_vars
from nl_server.store.memory import MemoryEmbeddingsStore
from shared.lib.detected_variables import VarCandidates

_SV_THRESHOLD = 0.5
_NUM_SVS = 10
_SUB_COLOR = '#ffaaaa'
_ADD_COLOR = '#aaffaa'
_PROPERTY_URL = 'https://autopush.api.datacommons.org/v2/node'
_GCS_BUCKET = 'datcom-embedding-diffs'

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'base', '', 'Base index. Can be a versioned embeddings file name on GCS '
    'or a local file with absolute path')
flags.DEFINE_string(
    'test', '', 'Test index. Can be a versioned embeddings file name on GCS '
    'or a local file with absolute path')
flags.DEFINE_string('queryset', '', 'Full path to queryset CSV')
flags.DEFINE_string('indextype', '',
                    'The base index type such as small or medium_ft')

_GCS_PREFIX = 'https://storage.mtls.cloud.google.com'
_TEMPLATE = 'tools/nl/svindex_differ/template.html'
_REPORT = '/tmp/diff_report.html'
_FILE_PATTERN_EMBEDDINGS = r'embeddings_.*_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.csv'
_FILE_PATTERN_FINETUNED_EMBEDDINGS = r'embeddings_.*_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.ft.*\.csv'

AUTOPUSH_KEY = os.environ.get('AUTOPUSH_KEY')
assert AUTOPUSH_KEY


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
  return f'{username}_{FLAGS.indextype}_{date}.html'


def _maybe_copy_embeddings(file):
  if re.match(_FILE_PATTERN_EMBEDDINGS, file) or re.match(
      _FILE_PATTERN_FINETUNED_EMBEDDINGS, file):
    lpath = gcs.local_path(file)
    if os.path.exists(lpath):
      return lpath
    return gcs.download_embeddings(file)
  assert file.startswith('/'), \
    f'File should either be {_FILE_PATTERN_EMBEDDINGS} or {_FILE_PATTERN_FINETUNED_EMBEDDINGS} or an absolute local path'
  return file


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


def _extract_model_name(embeddings_name: str, embeddings_file_path: str) -> str:
  model_path = ""
  if "ft" in embeddings_file_path:
    # This means we are using embeddings built on finetuned model.
    # Download the model if needed.

    # Extract the model name.
    # test embeddings name is of the form:
    #    <embeddings_size_*>.<ft_final_*>.<ft_intermediate_*>.<base_model>.csv
    # OR <embeddings_size_*>.<ft_final_*>.<base_model>.csv
    # The model name is comprised of all the parts between <embeddings_size_*>.
    # and ".csv".
    parts = embeddings_name.split(".")
    model_name = ".".join(parts[1:-1])
    print(f"finetuned model_name: {model_name}")
    model_path = gcs.download_folder(model_name)

    assert "ft_final" in model_path
    assert len(model_path.split(".")) >= 2

  return model_path


def run_diff(base_file, test_file, base_model_path, test_model_path, query_file,
             output_file):
  env = Environment(loader=FileSystemLoader(os.path.dirname(_TEMPLATE)))
  template = env.get_template(os.path.basename(_TEMPLATE))

  print("=================================")
  print(
      f"Setting up the Base Embeddings from: {base_file}; Base model from: {base_model_path}"
  )
  base = Embeddings(model=LocalSentenceTransformerModel(base_model_path),
                    store=MemoryEmbeddingsStore(base_file))
  print("=================================")
  print(
      f"Setting up the Test Embeddings from: {test_file}; Test model from: {test_model_path}"
  )
  test = Embeddings(model=LocalSentenceTransformerModel(test_model_path),
                    store=MemoryEmbeddingsStore(test_file))
  print("=================================")

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
      base_svs, base_sv_info = _prune(search_vars(base, query)[query])
      test_svs, test_sv_info = _prune(search_vars(test, query)[query])
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
        template.render(base_file=FLAGS.base, test_file=FLAGS.test,
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
  assert FLAGS.base and FLAGS.test and FLAGS.queryset
  base_file = _maybe_copy_embeddings(FLAGS.base)
  test_file = _maybe_copy_embeddings(FLAGS.test)

  base_model_path = _extract_model_name(FLAGS.base, base_file)
  test_model_path = _extract_model_name(FLAGS.test, test_file)

  run_diff(base_file, test_file, base_model_path, test_model_path,
           FLAGS.queryset, _REPORT)


if __name__ == "__main__":
  app.run(main)
