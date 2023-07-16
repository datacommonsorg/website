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
import json
import os
import datetime

PLACE_PREF = [
    'State',
    'County',
    'Country',
    'AdministrativeArea1',
    'AdministrativeArea2',
    'EurostatNUTS2',
    'EurostatNUTS3',
    'EurostatNUTS1',
]


def load_bootstrap(ctx):
  sv2descs = {}
  if ctx.names_csv:
    with open(ctx.names_csv) as fin:
      # SV,SVDesc,alternatives
      print('Loading descriptions...\n')
      for row in csv.DictReader(fin):
        sv = row['SV']
        if row['alternatives']:
          descs = row['alternatives'].split(';')
          descs = [d.strip() for d in descs]
          sv2descs[sv] = descs
        else:
          sv2descs[sv] = [row['SVDesc'].strip()]

  with open(ctx.input_csv) as fin:
    print('Loading bootstrap...\n')
    for row in csv.DictReader(fin):
      sv = row['SV']
      if sv not in ctx.bootstrap:
        names = sv2descs.get(sv, [row['SVDesc']])
        ctx.bootstrap[sv] = {'names': names}

      pt = row['PlaceType']
      ctx.bootstrap[sv][pt] = {
          'dcid': row['Place'],
          'name': row['PlaceName'],
      }


def load_checkpoint(ctx):
  if (os.path.exists(ctx.output_csv) and os.path.exists(ctx.counters_json)):
    print('Loading checkpoint...\n')

    with open(ctx.output_csv, 'r') as fin:
      for row in csv.DictReader(fin):
        ctx.rows.append(row)

        # Don't process it again!
        sv = row['SV']
        if sv in ctx.bootstrap:
          del ctx.bootstrap[sv]

    with open(ctx.counters_json, 'r') as fin:
      ctx.counters = json.load(fin)


def write_checkpoint(ctx):
  print(f'[{datetime.datetime.now()}] Checkpointing...')
  print(f'  Counters: {ctx.counters}\n')

  with open(ctx.output_csv, 'w') as fout:
    csvw = csv.DictWriter(fout, fieldnames=ctx.out_header)
    csvw.writeheader()
    csvw.writerows(ctx.rows)

  with open(ctx.counters_json, 'w') as fout:
    json.dump(ctx.counters, fout)
