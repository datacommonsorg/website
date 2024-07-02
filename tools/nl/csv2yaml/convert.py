# Copyright 2024 Google LLC
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
from typing import Dict, List

from absl import app
from absl import flags
from ruamel.yaml import YAML

_COL_DCID = 'dcid'
_COL_SENTENCE = 'sentence'

FLAGS = flags.FLAGS

flags.DEFINE_string('input_file', '', 'The input csv file path')

yaml = YAML()
yaml.indent(mapping=3, sequence=2, offset=2)
yaml.preserve_quotes = True
yaml.width = 800


def main(_):
  file_name = FLAGS.input_file
  sv2texts: Dict[str, List[str]] = {}

  with open(file_name) as f:
    reader = csv.DictReader(f)
    for row in reader:
      texts = row[_COL_SENTENCE].split(';')
      sv2texts[row[_COL_DCID]] = sorted(texts)

  with open(file_name.replace('.csv', '.yaml'), 'w') as f:
    yaml.dump(sv2texts, f)


if __name__ == "__main__":
  app.run(main)
