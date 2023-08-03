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
import difflib
import os
import re

from absl import app
from absl import flags
from jinja2 import Environment
from jinja2 import FileSystemLoader

from nl_server import gcs
from nl_server.embeddings import Embeddings

_SV_THRESHOLD = 0.5
_NUM_SVS = 10

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'base', '', 'Base index. Can be a versioned embeddings file name on GCS '
    'or a local file with absolute path')
flags.DEFINE_string(
    'test', '', 'Test index. Can be a versioned embeddings file name on GCS '
    'or a local file with absolute path')
flags.DEFINE_string('queryset', '', 'Full path to queryset CSV')

_TEMPLATE = 'tools/nl/svindex_differ/template.html'
_REPORT = '/tmp/diff_report.html'
_FILE_PATTERN_EMBEDDINGS = r'embeddings_.*_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.csv'
_FILE_PATTERN_FINETUNED_EMBEDDINGS = r'embeddings_.*_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.ft.*\.csv'


def _prune(res):
  result = []
  for i in range(len(res['SV'])):
    if i < _NUM_SVS and res['CosineScore'][i] >= _SV_THRESHOLD:
      result.append(res['SV'][i])
  return result


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


def _diff_table(base, test):
  return difflib.HtmlDiff().make_table(base, test)


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
    model_path = gcs.download_model_folder(model_name)

    assert "ft_final" in model_path
    assert len(model_path.split(".")) >= 2

  return model_path


def run_diff(base_file, test_file, base_model_path, test_model_path, query_file,
             output_file):
  env = Environment(loader=FileSystemLoader(os.path.dirname(_TEMPLATE)))
  env.filters['diff_table'] = _diff_table
  template = env.get_template(os.path.basename(_TEMPLATE))

  print("=================================")
  print(
      f"Setting up the Base Embeddings from: {base_file}; Base model from: {base_model_path}"
  )
  base = Embeddings(base_file, base_model_path)
  print("=================================")
  print(
      f"Setting up the Test Embeddings from: {test_file}; Test model from: {test_model_path}"
  )
  test = Embeddings(test_file, test_model_path)
  print("=================================")

  diffs = []
  with open(query_file) as f:
    for row in csv.reader(f):
      if not row:
        continue
      query = row[0].strip()
      if not query or query.startswith('#') or query.startswith('//'):
        continue
      assert ';' not in query, 'Multiple query not yet supported'
      base_result = _prune(base.detect_svs(query))
      test_result = _prune(test.detect_svs(query))
      if base_result != test_result:
        diffs.append((query, base_result, test_result))

  with open(output_file, 'w') as f:
    f.write(
        template.render(base_file=FLAGS.base,
                        test_file=FLAGS.test,
                        diff_table=_diff_table,
                        diffs=diffs))
  print('')
  print(f'Output written to {output_file}')
  print('')


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
