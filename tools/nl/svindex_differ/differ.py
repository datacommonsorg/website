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

import os
import csv, difflib
from jinja2 import Environment, FileSystemLoader
from nl_server.embeddings import Embeddings
from absl import app
from absl import flags

_SV_THRESHOLD = 0.5

FLAGS = flags.FLAGS

flags.DEFINE_string('base', '', 'Full path to base SV index CSV')
flags.DEFINE_string('test', '', 'Full path to test SV index CSV')
flags.DEFINE_string('queryset', '', 'Full path to queryset CSV')

_TEMPLATE = 'tools/nl/svindex_differ/template.html'
_REPORT = 'tools/nl/svindex_differ/diff_report.html'


def _prune(res):
  result = []
  for i in range(len(res['SV'])):
    if i < 5 and res['CosineScore'][i] >= _SV_THRESHOLD:
      result.append(res['SV'][i])
  return result


def _diff_table(base, test):
  return difflib.HtmlDiff().make_table(base, test)


def run_diff(base_file, test_file, query_file, output_file):
  env = Environment(loader=FileSystemLoader(os.path.dirname(_TEMPLATE)))
  env.filters['diff_table'] = _diff_table
  template = env.get_template(os.path.basename(_TEMPLATE))

  base = Embeddings(base_file)
  test = Embeddings(test_file)

  diffs = []
  with open(query_file) as f:
    for row in csv.reader(f):
      query = row[0]
      assert ';' not in query, 'Multiple query not yet supported'
      base_result = _prune(base.detect_svs(query))
      test_result = _prune(test.detect_svs(query))
      if base_result != test_result:
        print(f'{query}: {base_result} vs. {test_result}')
        diffs.append((query, base_result, test_result))
      else:
        print(f'{query}: matches - {test_result}')
  with open(output_file, 'w') as f:
    f.write(template.render(diff_table=_diff_table, diffs=diffs))


def main(_):
  assert FLAGS.base and FLAGS.test and FLAGS.queryset
  run_diff(FLAGS.base, FLAGS.test, FLAGS.queryset, _REPORT)


if __name__ == "__main__":
  app.run(main)
