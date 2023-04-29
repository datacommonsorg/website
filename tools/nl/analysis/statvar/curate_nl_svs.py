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

from absl import app
from absl import flags

FLAGS = flags.FLAGS

flags.DEFINE_string('input_sv_csv', 'sv_schemaful.csv', 'Input SV CSV file')
flags.DEFINE_string('output_sv_csv', 'sv_trimmed.csv', 'Output SV file')
flags.DEFINE_string('output_dbg', 'sv_trimmed_dbg_info.json', 'Debug json')
flags.DEFINE_string('quantity_csv', 'sv_quantity_cvals.csv',
                    'Quantity CSV file')

_cval_count_map = {}
_flagged_cprops = {}
_curated_sv_map = {}
_qty_cprops = set()

_ERR_TOO_MANY_PVS = 'Too many PVs'
_ERR_TOO_MANY_CVALS = 'Too many cvals'
_ERR_QUANTITY_VALS = 'Quantity range cvals'
_ERR_CURATED_DUP = 'Auto-generated / curated duplicate'


def _get_key(row, i):
    nc = int(row['num_constraints'])
    key_list = [
        row['population_type'], row['measured_prop'], row['stat_type'],
        row['measurement_qualifier'], row['measurement_denominator']
    ]
    for j in range(1, nc + 1):
        cp = 'p' + str(j)
        cv = 'v' + str(j)
        key_list.append(row[cp])
        if i == j:
            key_list.append('_')
        else:
            key_list.append(row[cv])
    return ';'.join(key_list)


def _load_maps(sv_csv, qty_csv):
    with open(sv_csv) as f:
        for row in csv.DictReader(f):
            sv = row['id']
            nc = int(row['num_constraints'])
            for i in range(1, nc + 1):
                key = _get_key(row, i)
                _cval_count_map[key] = _cval_count_map.get(key, 0) + 1

            if not sv.startswith('dc/'):
                key = _get_key(row, -1)
                assert key not in _curated_sv_map, f'{_curated_sv_map[key]} vs. {sv}'
                _curated_sv_map[key] = sv

    with open(qty_csv) as f:
        for row in csv.DictReader(f):
            # NOTE: Special handle for povertyStatus!
            if row['p'] == 'povertyStatus':
                continue
            _qty_cprops.add(row['p'])
        print(f'Quantity cprops: {_qty_cprops}')

def _admit_sv(row, dbg_info):
    nc = int(row['num_constraints'])
    if nc == 0:
        return True
    sv = row['id']
    if sv.startswith('dc/'):
        key = _get_key(row, -1)
        if key in _curated_sv_map:
            dbg_info[_ERR_CURATED_DUP].append(sv)
            return False

    distinct_nvals = []
    for i in range(1, nc + 1):
        key = _get_key(row, i)
        nv = _cval_count_map[key]
        cp = 'p' + str(i)
        if row[cp] in _qty_cprops and nv > 1:
            # This is a quantity cprop and is not a DPV
            # (since there are multiple values) for the
            # same peer group (i.e., SVs minus this cval).
            dbg_info[_ERR_QUANTITY_VALS].append(sv)
            return False
        if nv > 50:
            msg = f'{row[cp]} ({sv})'
            dbg_info[_ERR_TOO_MANY_CVALS].append(msg)
            _flagged_cprops[row[cp]] = _flagged_cprops.get(row[cp], 0) + 1
            # return False
        distinct_nvals.append(nv)
    if len(list(filter(lambda x: x > 1, distinct_nvals))) > 3:
        # There are more than 3 PVs here and none of them is a DPV.
        dbg_info[_ERR_TOO_MANY_PVS].append(sv)
        return False
    return True


def main(_):
    _load_maps(FLAGS.input_sv_csv, FLAGS.quantity_csv)
    total = 0
    dbg_info = {
        _ERR_TOO_MANY_CVALS: [],
        _ERR_QUANTITY_VALS: [],
        _ERR_TOO_MANY_PVS: [],
        _ERR_CURATED_DUP: []
    }
    with open(FLAGS.input_sv_csv) as fin:
        with open(FLAGS.output_sv_csv, 'w') as fout:
            fout.write('dcid\n')
            for row in csv.DictReader(fin):
                total += 1
                if _admit_sv(row, dbg_info):
                    fout.write(row['id'] + '\n')

    print('')
    print(f'Total: {total}')
    for k, v in dbg_info.items():
        print(f'Trimmed: {k} - {len(v)}')
    print(_ERR_TOO_MANY_CVALS + f': {_flagged_cprops}')
    print('')
    with open(FLAGS.output_dbg, 'w') as f:
        json.dump(dbg_info, f, indent=2)


if __name__ == "__main__":
    app.run(main)
