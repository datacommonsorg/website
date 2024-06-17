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
import datetime as datetime
import glob
import os
from typing import Dict, List

from absl import app
from absl import flags

FLAGS = flags.FLAGS

flags.DEFINE_string('input_dir', 'base',
                    'Input folder that contains stat var descriptions.')


def main(_):
  assert FLAGS.input_dir
  input_dir = FLAGS.input_dir
  output_file = os.path.join(input_dir, '_preindex.csv')

  text2sv: Dict[str, List[str]] = {}
  for file_name in glob.glob(input_dir + "/[!_]*.csv"):
    with open(file_name) as f:
      reader = csv.DictReader(f)
      for row in reader:
        sentences = row['sentence'].split(';')
        for sentence in sentences:
          if sentence not in text2sv:
            text2sv[sentence] = []
          text2sv[sentence].append(row['dcid'])

  with open(str(output_file), 'w+') as csvfile:
    csv_writer = csv.writer(csvfile, delimiter=',')
    csv_writer.writerow(['sentence', 'dcid'])
    for key in sorted(text2sv.keys()):
      csv_writer.writerow([key] + sorted(text2sv[key]))


if __name__ == "__main__":
  app.run(main)
