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

from absl import app
from absl import flags

FLAGS = flags.FLAGS

flags.DEFINE_string('kg_csv', 'data/kg.csv', 'Places')
flags.DEFINE_string('names_csv', 'data/base_names.csv', 'Descriptions')
flags.DEFINE_string('output_csv', 'data/llm_input.csv', 'Descriptions')

def main(_):
  svs = {}
  with open(FLAGS.kg_csv) as fin:
    for row in csv.DictReader(fin):
      svs[row['SV']] = ''

  with open(FLAGS.names_csv) as fin:
    for row in csv.DictReader(fin):
      if row['dcid'] in svs:
        for c in ['Revised Description', 'Description', 'Revised Name', 'Name']:
          if not row[c]:
            continue
          svs[row['dcid']] = row[c].split(';')[0].strip()
          break

  with open(FLAGS.output_csv, 'w') as fout:
    csvw = csv.writer(fout)
    csvw.writerow(['SV', 'SVDesc'])
    for sv in sorted(svs):
      csvw.writerow([sv, svs[sv]])

if __name__ == "__main__":
  app.run(main)
