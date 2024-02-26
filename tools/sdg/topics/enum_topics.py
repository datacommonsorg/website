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
from dataclasses import dataclass
import logging
import os
from typing import Dict, List

import common

logging.getLogger().setLevel(logging.INFO)

# Key: enum class whose instances are the constraint values to build topics for
# Value: the property linking SV to those enum class instances
_SLICE_DEFINITION = {
    'WHO_GhecausesEnum': {
        'property': 'who_ghecauses',
        'prefixForNL': '',
    },
    'WHO_EnvcauseEnum': {
        'property': 'who_envcause',
        'prefixForNL': 'Impact of',
    }
}

_ENUMS_TO_SKIP = ['WHO_GhecausesEnum_GHE000']

# TODO: Maybe relax this after basic validation.
# Skipping this there are 3K SVs, without skipping there are 18K SVs.
_PROPS_TO_SKIP = ['AGE']

_TMP_DIR = '/tmp'
_UNDATA_ENUM_TOPICS_CSV = os.path.join(_TMP_DIR, 'undata_enum_topics.csv')
_UNDATA_ENUM_TOPICS_NL_CSV = os.path.join(_TMP_DIR,
                                          'undata_enum_topics_for_nl.csv')
_UNDATA_ENUM_TOPICS_MCF = os.path.join(_TMP_DIR,
                                       'custom_enum_topics_undata.mcf')
_UNDATA_ENUM_TOPICS_JSON = '../../../server/config/nl_page/undata_enum_topic_cache.json'

API_ROOT = "https://autopush.api.datacommons.org"
API_PATH_PROP_IN = API_ROOT + '/v1/bulk/property/values/in'
API_PATH_PROP_OUT = API_ROOT + '/v1/bulk/property/values/out'


@dataclass
class Var:
  dcid: str
  nc: int
  series: str
  cprops: str


@dataclass
class TopicVal:
  name: str
  enum_type: str
  vars: List[Var]


def parse_var(var: str) -> Var:
  prefix, suffix = var.split('.', 1)
  prefix = prefix.replace('/', '_').upper()

  cprops = []
  for pv in suffix.split('__'):
    p, _ = pv.split('--', 1)
    cprops.append(p)

  for p in _PROPS_TO_SKIP:
    if p in cprops:
      return None

  return Var(dcid=var, nc=len(cprops), series=prefix, cprops='_'.join(cprops))


def get_topics() -> Dict[str, TopicVal]:
  # Get the enum instances.
  req = {'nodes': list(_SLICE_DEFINITION.keys()), 'property': 'typeOf'}
  resp = common.call_api(API_PATH_PROP_IN, req)
  topics = {}
  for n in resp.get('data', []):
    t = n.get('node')
    for v in n.get('values', []):
      if not v.get('name') or not v.get('dcid'):
        continue
      if v['dcid'] in _ENUMS_TO_SKIP:
        continue
      topics[v['dcid']] = TopicVal(name=v['name'], enum_type=t, vars=[])
  print(f'Gathered {len(topics)} enum topics')

  # Arrange by property to query.
  prop2enums = {}
  for tid, tval in topics.items():
    p = _SLICE_DEFINITION[tval.enum_type]['property']
    if p not in prop2enums:
      prop2enums[p] = []
    prop2enums[p].append(tid)

  # Get all SVs for each enum instance.
  nsvs = 0
  for prop, enums in prop2enums.items():
    resp = common.call_api(API_PATH_PROP_IN, {'nodes': enums, 'property': prop})
    for n in resp.get('data', []):
      t = n.get('node')
      for v in n.get('values', []):
        if not v.get('name') or not v.get('dcid'):
          continue
        v = parse_var(v['dcid'])
        if v:
          topics[t].vars.append(v)
          nsvs += 1
  print(f'Gathered {nsvs} SVs assigned to different topics')

  return topics


def get_series_info(topics: Dict[str, TopicVal]) -> Dict[str, str]:
  series_set = set()
  for tval in topics.values():
    for v in tval.vars:
      series_set.add(v.series)

  resp = common.call_api(API_PATH_PROP_OUT, {
      'nodes': list(series_set),
      'property': 'name'
  })
  series2name = {}
  for n in resp.get('data', []):
    series = n.get('node')
    name = n.get('values', [{}])[0].get('value')
    if name:
      series2name[series] = name
  print(f'Gathered {len(series2name)} names for series')

  return series2name


def generate(topic_file_path: str, nl_file_path: str):
  topics = get_topics()

  series2name = get_series_info(topics)

  def _dcid(t: str):
    return f'dc/topic/{t}'

  def _nl_name(v: TopicVal):
    p = _SLICE_DEFINITION[v.enum_type]['prefixForNL']
    if p:
      return f'{p} {v.name}'
    return v.name

  # Output topics to a CSV.
  with open(topic_file_path, 'w') as fp:
    csvw = csv.writer(fp)
    csvw.writerow(['topic', 'name', 'var'])
    for tid, tval in topics.items():
      # Sort the variables by nc, cprops, series
      tval.vars.sort(key=lambda x: (x.nc, x.cprops, x.series))
      for v in tval.vars:
        csvw.writerow([_dcid(tid), tval.name, v.dcid])
  print(f'Wrote topic contents to {topic_file_path}')

  # Output topics for NL CSV.
  with open(nl_file_path, 'w') as fp:
    csvw = csv.writer(fp)
    csvw.writerow([
        'dcid', 'Name', 'Description', 'Override_Alternatives',
        'Curated_Alternatives'
    ])
    for tid, tval in topics.items():
      # NOTE: We add alternate names for NL based on the contents of this topic.
      alt_names = set()
      for v in tval.vars:
        if v.series in series2name:
          sname = series2name[v.series]
          alt_names.add(f'{sname} due to {tval.name}')
      # We use the prefix name.
      # TODO: Consider adding alt-names.
      csvw.writerow([_dcid(tid), _nl_name(tval), '', '', ''])
  print(f'Wrote topics for NL addition to {nl_file_path}')

  # Produce Topic cache nodes.
  nodes = []
  for tid, tval in topics.items():
    nodes.append({
        'dcid': [_dcid(tid)],
        'name': [tval.name],
        'typeOf': ['Topic'],
        'relevantVariableList': [v.dcid for v in tval.vars]
    })
  return nodes


def main():
  nodes = generate(_UNDATA_ENUM_TOPICS_CSV, _UNDATA_ENUM_TOPICS_NL_CSV)
  common.write_topic_json(_UNDATA_ENUM_TOPICS_JSON, nodes)
  common.write_topic_mcf(_UNDATA_ENUM_TOPICS_MCF, nodes)


if __name__ == "__main__":
  main()
