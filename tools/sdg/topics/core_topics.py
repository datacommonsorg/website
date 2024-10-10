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

import copy
import csv
from dataclasses import dataclass
import json
import logging
import os
import re
from typing import Dict, List, Set

from absl import app
from absl import flags
import common

FLAGS = flags.FLAGS

flags.DEFINE_string('dc', '', 'Type of index to build')

logging.getLogger().setLevel(logging.INFO)

_TMP_DIR = '/tmp'

_SDG_ROOT = "dc/g/SDG"
_SDG_TOPIC_JSON = '../../../server/config/nl_page/sdg_topic_cache.json'
_SDG_NON_COUNTRY_VARS = '../../../server/config/nl_page/sdg_non_country_vars.json'
_SDG_MCF_PATH = os.path.join(_TMP_DIR, 'custom_topics_sdg.mcf')
_SDG_VARIABLES_FILE = 'sdg_variable_grouping.csv'

_UNDATA_ROOT = "dc/g/UN"
_UNDATA_TOPIC_JSON = '../../../server/config/nl_page/undata_topic_cache.json'
_UNDATA_NON_COUNTRY_VARS = '../../../server/config/nl_page/undata_non_country_vars.json'
_UNDATA_MCF_PATH = os.path.join(_TMP_DIR, 'custom_topics_undata.mcf')
_UNDATA_VARIABLES_FILE = 'undata_variable_grouping.csv'
_UNDATA_SERIES_TOPICS_FILE = 'un_who_series_topics.csv'
_UNDATA_NL_DESCRIPTIONS_FILE = os.path.join(_TMP_DIR,
                                            'undata_nl_descriptions.csv')

_UNDATA_ILO_ROOT = "dc/g/Custom_UN"
_UNDATA_ILO_TOPIC_JSON = '../../../server/config/nl_page/undata_ilo_topic_cache.json'
_UNDATA_ILO_NON_COUNTRY_VARS = '../../../server/config/nl_page/undata_ilo_non_country_vars.json'
_UNDATA_ILO_MCF_PATH = os.path.join(_TMP_DIR, 'custom_topics_undata_ilo.mcf')
_UNDATA_ILO_VARIABLES_FILE = 'undata_ilo_variable_grouping.csv'
_UNDATA_ILO_SERIES_TOPICS_FILE = 'un_ilo_series_topics.csv'
_UNDATA_ILO_NL_DESCRIPTIONS_FILE = os.path.join(
    _TMP_DIR, 'undata_ilo_nl_descriptions.csv')

# TODO(dwnoble): Add command line flag to handle generating custom DC groups
REMOVE_SVG_PREFIX = "Custom_"

# TODO(dwnoble): Extract API_ROOT (and potentially some of the variables above)
# to command line args or a config file
API_ROOT = "https://staging.unsdg.datacommons.org"
API_PATH_SVG_INFO = API_ROOT + '/v1/bulk/info/variable-group'
API_PATH_PROP_OUT = API_ROOT + '/v1/bulk/property/values/out'


def _svg2t(svg, remove_svg_prefix=""):
  # NOTE: Use small "sdg" to avoid overlap with prior topics.
  return svg.replace('dc/g/SDG',
                     'dc/topic/sdg').replace('dc/g/', 'dc/topic/').replace(
                         f"/{remove_svg_prefix}", "/")


def download_svg_recursive(svgs: List[str],
                           nodes: Dict[str, Dict],
                           keep_vars: Set[str],
                           remove_svg_prefix=""):
  resp = common.call_api(API_PATH_SVG_INFO, {'nodes': svgs})
  recurse_nodes = set()
  for data in resp.get('data', []):
    svg_id = data.get('node', '')
    if not svg_id:
      continue

    info = data.get('info', '')
    if not info:
      continue

    tid = _svg2t(svg_id, remove_svg_prefix)
    if tid in nodes:
      continue

    members = []
    for csv in info.get('childStatVars', []):
      svid = csv.get('id')
      if (not csv.get('hasData') or not svid or
          (keep_vars and svid not in keep_vars)):
        continue
      members.append(csv['id'])

    for csvg in info.get('childStatVarGroups', []):
      if not csvg.get('id'):
        continue
      members.append(_svg2t(csvg['id'], remove_svg_prefix))
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
    download_svg_recursive(sorted(list(recurse_nodes)), nodes, keep_vars,
                           remove_svg_prefix)


def download_svgs(init_nodes: List[str],
                  keep_vars: Set[str],
                  remove_svg_prefix=""):
  nodes = {}
  download_svg_recursive(init_nodes, nodes, keep_vars, remove_svg_prefix)
  return nodes


@dataclass
class Variables:
  series2group2vars: Dict[str, Dict[str, List[str]]]
  grouped_vars: Set[str]
  group_descriptions: Dict[str, str]
  non_country_vars: Set[str]
  keep_vars: Set[str]
  dropped_vars: Set[str]


def load_variables(vars_file: str, vars: Variables, var_prefix: str,
                   topic_prefix: str, svpg_prefix: str):
  with open(vars_file) as fp:
    for row in csv.DictReader(fp):
      if row.get('VARIABLE_CODE'):
        var = var_prefix + row['VARIABLE_CODE'].replace('@', '.').replace(
            ' ', '')
      elif row.get('VARIABLE'):
        var = row['VARIABLE'].strip()
      else:
        continue

      if row.get('SELECT'):
        if 'drop' in row['SELECT'].lower():
          print(f'Dropping variable {var}')
          vars.dropped_vars.add(var)
          continue
        elif 'do not display in country pages' in row['SELECT'].lower():
          vars.non_country_vars.add(var)
      if row.get('DISPLAY'):
        if 'do not display in country pages' in row['DISPLAY'].lower():
          vars.non_country_vars.add(var)

      vars.keep_vars.add(var)

      if row.get('SERIES_CODE'):
        srs = topic_prefix + row['SERIES_CODE'].replace('_', '').replace(
            '-', '')
      elif row.get('POPULATION_TYPE'):
        srs = topic_prefix + row['POPULATION_TYPE'].replace('_', '').replace(
            '-', '')
      else:
        continue
      if not row.get('GROUPING ID'):
        continue
      grp = svpg_prefix + row['GROUPING ID'].replace('_', '').replace('-', '')

      if grp not in vars.group_descriptions:
        desc = row.get('GROUPING DESCRIPTION', '')
        # Drop the stuff within [].  It has stuff like [ILO].
        desc = re.sub(r"[\[].*?[\]]", '', desc)
        # Remove the extra spaces.
        desc = ' '.join(desc.strip().split())
        desc = desc.replace(' ,', ',')
        vars.group_descriptions[grp] = desc
      if srs not in vars.series2group2vars:
        vars.series2group2vars[srs] = {}
      if grp not in vars.series2group2vars[srs]:
        vars.series2group2vars[srs][grp] = []
      vars.series2group2vars[srs][grp].append(var)

      assert var not in vars.grouped_vars, var
      vars.grouped_vars.add(var)
    assert vars.grouped_vars and vars.keep_vars
    print(
        f'TOTAL:  Loaded {len(vars.keep_vars)} vars, {len(vars.grouped_vars)} grouped'
    )

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


def generate(init_nodes: List[str],
             filter_vars: Variables,
             remove_svg_prefix="",
             skip_assert=False):
  nodes = download_svgs(init_nodes, filter_vars.keep_vars, remove_svg_prefix)
  final_nodes = []
  for topic, node in nodes.items():
    if not node.get('relevantVariableList'):
      continue

    pruned_members = []
    # Skip members in SVPG groups.
    for m in node['relevantVariableList']:
      if m not in filter_vars.grouped_vars:
        pruned_members.append(m)

    # Add SVPGs in its place.
    for svpg, members in filter_vars.series2group2vars.get(topic, {}).items():
      pruned_members.append(svpg)

      if filter_vars.group_descriptions.get(svpg):
        names = [filter_vars.group_descriptions[svpg]]
      else:
        names = node['name']
      final_nodes.append({
          'dcid': [svpg],
          'name': names,
          'memberList': members,
          'typeOf': ['StatVarPeerGroup']
      })

    if topic in filter_vars.series2group2vars:
      del filter_vars.series2group2vars[topic]

    if pruned_members:
      node['relevantVariableList'] = pruned_members
      final_nodes.append(node)

  # Assert we have consumed everything!
  if not skip_assert:
    assert not filter_vars.series2group2vars
  elif filter_vars.series2group2vars:
    print("Warning: filter_vars.series2group2vars is not empty:",
          filter_vars.series2group2vars)

  final_nodes = drop_dangling_topic_refs(final_nodes)

  final_nodes.sort(key=lambda x: x['dcid'])
  return final_nodes


def write_non_country_vars(non_country_vars_file: str, vars: Variables):
  js = {'variables': sorted(list(vars.non_country_vars))}
  with open(non_country_vars_file, 'w') as fp:
    json.dump(js, fp, indent=2)


def strip_parens(name: str):
  return name.replace('(', '').replace(')', '')


def alt_nl_name(name: str):
  new_name = ''
  for f, t in [('DALYs', 'disability-adjusted life years'),
               ('DALY', 'disability-adjusted life years'),
               ('YLLs', 'years life lost'), ('YLL', 'years life lost')]:
    if f in name:
      if t not in name.lower():
        new_name = name.replace(f, t)
        name = name.lower()
      else:
        new_name = name.replace(f, '')
        name = name.lower().replace(t, '')
      break

  return strip_parens(new_name), strip_parens(name)


def write_nl_descriptions(nl_desc_file: str, nodes: list[dict],
                          undata_series_topics_file: str, vars: Variables):
  with open(nl_desc_file, 'w') as fp:
    csvw = csv.DictWriter(fp,
                          fieldnames=[
                              'dcid', 'Name', 'Description',
                              'Override_Alternatives', 'Curated_Alternatives'
                          ])
    csvw.writeheader()

    series_topics = set()
    for n in nodes:
      dcid = n.get('dcid', [''])[0]
      name = n.get('name', [''])[0]
      if 'dc/topic/' not in dcid or 'dc/topic/UN' in dcid:
        continue
      if '-' in dcid or '_' in dcid:
        # Series topics do not have any of these.
        print(f'WARNING: Found non-series topic {dcid}, dropping')
        continue
      series_topics.add(dcid)
      alt_name, name = alt_nl_name(name)
      csvw.writerow({
          'dcid': dcid,
          'Name': name,
          'Description': '',
          'Override_Alternatives': '',
          'Curated_Alternatives': alt_name
      })

    sv_dcids = set()
    with open(undata_series_topics_file) as fp:
      for row in csv.DictReader(fp):
        if row['NVars'] == '1':
          var = row['Vars']
          if var in vars.dropped_vars:
            logging.error(f'WARNING: skipping dropped var {var} from NL index')
            continue
          sv_dcids.add(var)
        else:
          id = row['SeriesTopic']
          if id not in series_topics:
            logging.error(f'ERROR: Missing topic {id}')

    resp = common.call_api(API_PATH_PROP_OUT, {
        'nodes': sorted(list(sv_dcids)),
        'property': 'name'
    })
    for n in resp.get('data', []):
      sv = n.get('node')
      name = n.get('values', [{}])[0].get('value')
      if name and name != sv:
        alt_name, name = alt_nl_name(name)
        csvw.writerow({
            'dcid': sv,
            'Name': name,
            'Description': '',
            'Override_Alternatives': '',
            'Curated_Alternatives': alt_name,
        })
  print(f"Wrote NL descriptions to: {nl_desc_file}")


def main(_):
  assert FLAGS.dc
  vars = Variables(series2group2vars={},
                   grouped_vars=set(),
                   group_descriptions={},
                   non_country_vars=set(),
                   keep_vars=set(),
                   dropped_vars=set())
  if FLAGS.dc == 'sdg':
    load_variables(vars_file=_SDG_VARIABLES_FILE,
                   vars=vars,
                   var_prefix='sdg/',
                   topic_prefix='dc/topic/sdg',
                   svpg_prefix='dc/svpg/SDG')
    nodes = generate([_SDG_ROOT], vars)
    write_non_country_vars(_SDG_NON_COUNTRY_VARS, vars)
    common.write_topic_mcf(_SDG_MCF_PATH, nodes)
    common.write_topic_json(_SDG_TOPIC_JSON, nodes)
  elif FLAGS.dc == 'undata':
    load_variables(vars_file=_UNDATA_VARIABLES_FILE,
                   vars=vars,
                   var_prefix='',
                   topic_prefix='dc/topic/',
                   svpg_prefix='dc/svpg/WHO')
    write_non_country_vars(_UNDATA_NON_COUNTRY_VARS, vars)
    nodes = generate([_UNDATA_ROOT], vars)
    common.write_topic_mcf(_UNDATA_MCF_PATH, nodes)
    common.write_topic_json(_UNDATA_TOPIC_JSON, nodes)
    write_nl_descriptions(_UNDATA_NL_DESCRIPTIONS_FILE, nodes,
                          _UNDATA_SERIES_TOPICS_FILE, vars)
  elif FLAGS.dc == 'undata_ilo':
    load_variables(vars_file=_UNDATA_ILO_VARIABLES_FILE,
                   vars=vars,
                   var_prefix='',
                   topic_prefix='dc/topic/',
                   svpg_prefix='dc/svpg/ILO')
    write_non_country_vars(_UNDATA_ILO_NON_COUNTRY_VARS, vars)
    # TODO(dwnoble): Remove skip_assert here in a future iteration of the
    # variable groupings (there are currenlty some ILO population types with no
    # associated variables).
    nodes = generate([_UNDATA_ILO_ROOT],
                     vars,
                     REMOVE_SVG_PREFIX,
                     skip_assert=True)
    common.write_topic_mcf(_UNDATA_ILO_MCF_PATH, nodes)
    common.write_topic_json(_UNDATA_ILO_TOPIC_JSON, nodes)
    write_nl_descriptions(_UNDATA_ILO_NL_DESCRIPTIONS_FILE, nodes,
                          _UNDATA_ILO_SERIES_TOPICS_FILE, vars)
  print(f'Found {len(vars.keep_vars)} vars')


if __name__ == "__main__":
  app.run(main)
