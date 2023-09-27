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

import pandas as pd


def partition_by_language(input_file, output_dir):
  os.makedirs(output_dir, exist_ok=True)
  filename_prefix, _ = os.path.splitext(os.path.basename(input_file))
  in_df = pd.read_csv(input_file)
  column_names = in_df.columns.values.tolist()
  for i in range(1, len(column_names)):
    lang = column_names[i]
    out_file = os.path.join(output_dir, f"{filename_prefix}_{lang}.csv")
    print(f"{lang} partition:", out_file)
    out_df = in_df.iloc[:, [0, i]].copy()
    out_df.to_csv(out_file, index=False)


partition_by_language("data/input/queries.csv", "data/output")
