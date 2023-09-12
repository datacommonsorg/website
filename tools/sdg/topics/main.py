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

import copy
import csv
from dataclasses import dataclass
import json
import logging
import os
import re
from typing import Dict, List, Set

import requests

logging.getLogger().setLevel(logging.INFO)

_SDG_ROOT = "dc/g/SDG"
_SDG_TOPIC_JSON = '../../../server/config/nl_page/sdg_topic_cache.json'
_SDG_NON_COUNTRY_VARS = '../../../server/config/nl_page/sdg_non_country_vars.json'
_TMP_DIR = '/tmp'
_MCF_PATH = os.path.join(_TMP_DIR, 'custom_topics_sdg.mcf')
_VARIABLES_FILE = 'variable_grouping.csv'
API_ROOT = "https://autopush.api.datacommons.org"
API_PATH_SVG_INFO = API_ROOT + '/v1/bulk/info/variable-group'
API_PATH_PV = API_ROOT + '/v1/bulk/property/values/out'


def call_api(url, req):
  headers = {'Content-Type': 'application/json'}
  # Set MIXER_API_KEY to the autopush API key
  mixer_api_key = os.environ.get('MIXER_API_KEY', '')
  if mixer_api_key:
    headers['x-api-key'] = mixer_api_key
  # Send the request and verify the request succeeded
  response = requests.post(url, json=req, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer: "{}"'.format(
            response.status_code, response.reason, response.content))
  return response.json()


def _svg2t(svg):
  # NOTE: Use small "sdg" to avoid overlap with prior topics.
  return svg.replace('dc/g/SDG', 'dc/topic/sdg').replace('dc/g/', 'dc/topic/')


def download_svg_recursive(svgs: List[str], nodes: Dict[str, Dict],
                           filter_vars: Set[str]):
  resp = call_api(API_PATH_SVG_INFO, {'nodes': svgs})

  recurse_nodes = set()
  for data in resp.get('data', []):
    svg_id = data.get('node', '')
    if not svg_id:
      continue

    info = data.get('info', '')
    if not info:
      continue

    tid = _svg2t(svg_id)
    if tid in nodes:
      continue

    members = []
    for csv in info.get('childStatVars', []):
      svid = csv.get('id')
      if not csv.get('hasData') or not svid or svid not in filter_vars:
        continue
      members.append(csv['id'])

    for csvg in info.get('childStatVarGroups', []):
      if not csvg.get('id'):
        continue
      members.append(_svg2t(csvg['id']))
      recurse_nodes.add(csvg['id'])

    if not members:
      print(f'Skipping empty {tid}')
      continue

    nodes[tid] = {
        'dcid': [tid],
        'name': [info.get('absoluteName', '')],
        'typeOf': ['Topic'],
        'relevantVariableList': members
    }

  if recurse_nodes:
    download_svg_recursive(sorted(list(recurse_nodes)), nodes, filter_vars)


def download_sdg_svgs(filter_vars: Set[str]):
  nodes = {}
  download_svg_recursive([_SDG_ROOT], nodes, filter_vars)
  return nodes


@dataclass
class Variables:
  series2group2vars: Dict[str, Dict[str, List[str]]]
  grouped_vars: Set[str]
  group_descriptions: Dict[str, str]
  non_country_vars: Set[str]
  all_vars: Set[str]


def load_variables():
  vars = Variables(series2group2vars={},
                   grouped_vars=set(),
                   group_descriptions={},
                   non_country_vars=set(),
                   all_vars=set())
  with open(_VARIABLES_FILE) as fp:
    for row in csv.DictReader(fp):
      if not row.get('VARIABLE_CODE'):
        continue
      var = 'sdg/' + row['VARIABLE_CODE'].replace('@', '.').replace(' ', '')

      if row.get('SELECT'):
        if 'drop' in row['SELECT'].lower():
          print(f'Dropping variable {var}')
          continue
        elif 'do not display in country pages' in row['SELECT'].lower():
          vars.non_country_vars.add(var)

      vars.all_vars.add(var)

      if not row.get('GROUPING ID') or not row.get('SERIES_CODE'):
        continue
      srs = 'dc/topic/sdg' + row['SERIES_CODE'].replace('_', '')
      grp = 'dc/svpg/SDG' + row['GROUPING ID'].replace('_', '')

      if grp not in vars.group_descriptions:
        desc = row.get('GROUPING DESCRIPTION', '')
        # Drop the stuff within () and [].
        desc = re.sub("[\(\[].*?[\)\]]", '', desc)
        # Remove the extra spaces.
        desc = ' '.join(desc.strip().split())
        desc = desc.replace(' ,', ',')
        vars.group_descriptions[grp] = desc
      if srs not in vars.series2group2vars:
        vars.series2group2vars[srs] = {}
      if grp not in vars.series2group2vars[srs]:
        vars.series2group2vars[srs][grp] = []
      vars.series2group2vars[srs][grp].append(var)

      assert var not in vars.grouped_vars
      vars.grouped_vars.add(var)

  # Prune out the single-member stuff.
  deletions = {}
  for srs, grp2vars in vars.series2group2vars.items():
    deletions[srs] = []
    for grp, vs in grp2vars.items():
      if len(vs) > 1:
        continue
      deletions[srs].append(grp)
      for v in vs:
        vars.grouped_vars.remove(v)
  for srs, grps in deletions.items():
    for g in grps:
      del vars.series2group2vars[srs][g]
    if srs in vars.series2group2vars and not vars.series2group2vars[srs]:
      del vars.series2group2vars[srs]

  return vars


# As a result of creating SVPG nodes we might have dropped some empty Topic
# nodes that in turn led to "dangling" references.
#
# This function helps drop those references first and then check if as a result
# we dropped more Topic nodes, and then drop those refs, etc
def drop_dangling_topic_refs(nodes: List[Dict]):

  new_nodes = []
  rounds = 0
  while True:
    existing = set()
    for n in nodes:
      existing.add(n['dcid'][0])

    new_nodes = []
    for n in nodes:
      if n['typeOf'][0] != 'Topic':
        new_nodes.append(n)
        continue

      vars = []
      for t in n.get('relevantVariableList', []):
        if t.startswith('dc/topic/') and t not in existing:
          continue
        vars.append(t)

      if vars:
        n['relevantVariableList'] = vars
        new_nodes.append(n)

    if len(new_nodes) == len(nodes):
      break
    # There are fewer new_nodes, so this may in turn
    # lead to more orphan refs.
    rounds += 1
    nodes = copy.deepcopy(new_nodes)

  print(f'Took {rounds} rounds of orphan pruning!')
  return new_nodes


def generate(sdg_vars: Variables):
  nodes = download_sdg_svgs(sdg_vars.all_vars)

  final_nodes = []
  for topic, node in nodes.items():
    if not node.get('relevantVariableList'):
      continue

    pruned_members = []
    # Skip members in SVPG groups.
    for m in node['relevantVariableList']:
      if m not in sdg_vars.grouped_vars:
        pruned_members.append(m)

    # Add SVPGs in its place.
    for svpg, members in sdg_vars.series2group2vars.get(topic, {}).items():
      pruned_members.append(svpg)

      if sdg_vars.group_descriptions.get(svpg):
        names = [sdg_vars.group_descriptions[svpg]]
      else:
        names = node['name']
      final_nodes.append({
          'dcid': [svpg],
          'name': names,
          'memberList': members,
          'typeOf': ['StatVarPeerGroup']
      })

    if topic in sdg_vars.series2group2vars:
      del sdg_vars.series2group2vars[topic]

    if pruned_members:
      node['relevantVariableList'] = pruned_members
      final_nodes.append(node)

  # Assert we have consumed everything!
  assert not sdg_vars.series2group2vars, sdg_vars.series2group2vars

  final_nodes = drop_dangling_topic_refs(final_nodes)

  final_nodes.sort(key=lambda x: x['dcid'])
  return final_nodes


def write_non_country_vars(sdg_vars: Variables):
  js = {'variables': sorted(list(sdg_vars.non_country_vars))}
  with open(_SDG_NON_COUNTRY_VARS, 'w') as fp:
    json.dump(js, fp, indent=2)


def write_topic_json(nodes):
  with open(_SDG_TOPIC_JSON, 'w') as fp:
    json.dump({'nodes': nodes}, fp, indent=2)


def write_topic_mcf(nodes: list[dict]) -> None:
  logging.info("Writing MCF to: %s", _MCF_PATH)
  os.makedirs(_TMP_DIR, exist_ok=True)
  with open(_MCF_PATH, 'w') as out:
    for node in nodes:
      out.write(_write_mcf_node(node))


def _write_mcf_node(node: dict) -> str:
  lines = []

  if node['typeOf'][0] == 'Topic':
    prop = 'relevantVariable'
  else:
    prop = 'member'
  list_prop = prop + 'List'

  lines.append(f"Node: dcid:{node['dcid'][0]}")

  if node[list_prop]:
    refs_str = ", ".join([f"dcid:{var}" for var in node[list_prop]])
    lines.append(f"{prop}: {refs_str}")

  lines.append(f'name: "{node["name"][0]}"')
  lines.append(f"typeOf: dcid:{node['typeOf'][0]}")

  lines.append("\n")
  return "\n".join(lines)


def main():
  sdg_vars = load_variables()
  print(f'Found {len(sdg_vars.all_vars)} vars')
  nodes = generate(sdg_vars)
  write_topic_json(nodes)
  write_non_country_vars(sdg_vars)
  write_topic_mcf(nodes)


if __name__ == "__main__":
  main()
