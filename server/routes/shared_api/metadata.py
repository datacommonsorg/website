# Copyright 2026 Google LLC
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

import asyncio
import collections
import logging

from flask import Blueprint
from flask import jsonify
from flask import request

from server.services import datacommons as dc

bp = Blueprint("metadata", __name__, url_prefix='/api/shared/metadata')

MEASUREMENT_METHODS_SUPPRESSION_PROVENANCES = {"WikipediaStatsData"}


def title_case(string):
  return " ".join([word.capitalize() for word in string.split("_")])


def _get_arc_nodes(data_dict, node_id, arc_name):
  """Extracts nodes for a given arc from a v2node response dictionary."""
  return data_dict.get('data', {}).get(node_id,
                                       {}).get('arcs',
                                               {}).get(arc_name,
                                                       {}).get('nodes', [])


def _get_node_name(node_list, linked_names_map):
  """Helper to resolve a node's display name from either a literal value or linked reference."""
  if not node_list:
    return None
  node = node_list[0]
  if 'value' in node:
    return node['value']
  if 'dcid' in node:
    return linked_names_map.get(node['dcid'])
  return None


def _extract_active_facets(sv, obs_resp, stat_var_to_facets):
  """Extracts active facets for a given stat var."""
  active_facets = stat_var_to_facets.get(sv, [])
  if not active_facets:
    by_entity = obs_resp.get('byVariable', {}).get(sv,
                                                      {}).get('byEntity', {})
    for ent_data in by_entity.values():
      for f in ent_data.get('orderedFacets', []):
        active_facets.append(f.get('facetId'))
  return list(set(active_facets))


async def fetch_categories_async(stat_vars):
  """Traverses the category hierarchy tree up to top-level topics."""
  parent_map = collections.defaultdict(list)
  current_nodes = set(stat_vars)
  visited = set()
  depth = 0

  while current_nodes and depth < 10:
    visited.update(current_nodes)

    member_task = asyncio.to_thread(dc.v2node, list(current_nodes),
                                    '->memberOf')
    spec_task = asyncio.to_thread(dc.v2node, list(current_nodes),
                                  '->specializationOf')
    resp_member, resp_spec = await asyncio.gather(member_task, spec_task)

    next_nodes = set()
    for node in current_nodes:
      parents = set()
      parents.update([
          n.get('dcid')
          for n in _get_arc_nodes(resp_member, node, 'memberOf')
          if n.get('dcid')
      ])
      parents.update([
          n.get('dcid')
          for n in _get_arc_nodes(resp_spec, node, 'specializationOf')
          if n.get('dcid')
      ])

      parent_list = list(parents)
      parent_map[node].extend(parent_list)

      for p in parent_list:
        # Use visited set to prevent graph cycles
        if p != 'dc/g/Root' and p not in visited:
          next_nodes.add(p)

    current_nodes = next_nodes
    depth += 1

  sv_top_levels = collections.defaultdict(list)
  all_top_level_dcids = set()

  for sv in stat_vars:
    tops = set()

    def traverse(n, curr_visited):
      if n in curr_visited:
        return
      curr_visited.add(n)
      parents = parent_map.get(n, [])
      valid_parents = [p for p in parents if p != 'dc/g/Root']

      if not valid_parents:
        if n != sv:
          tops.add(n)
      else:
        for p in valid_parents:
          traverse(p, curr_visited)

    traverse(sv, set())
    sv_top_levels[sv] = list(tops)
    all_top_level_dcids.update(tops)

  category_map = {}
  if all_top_level_dcids:
    parent_name_resp = await asyncio.to_thread(dc.v2node,
                                               list(all_top_level_dcids),
                                               '->name')
    parent_name_map = {}
    for pid in all_top_level_dcids:
      nodes = _get_arc_nodes(parent_name_resp, pid, 'name')
      if nodes:
        parent_name_map[pid] = nodes[0].get('value')

    for sv in stat_vars:
      category_map[sv] = [
          parent_name_map.get(p) or p.split('/')[-1]
          for p in sv_top_levels.get(sv, [])
      ]
  else:
    category_map = {sv: [] for sv in stat_vars}

  return category_map


def _build_metadata_payload(stat_vars, stat_var_names, category_map,
                            sv_active_facets, v2_facets, facet_date_ranges,
                            prov_map, linked_names_map, mm_map, unit_map):
  """Constructs the final aggregated metadata dictionary."""
  metadata_map = collections.defaultdict(list)

  for sv in stat_vars:
    active_facets = sv_active_facets.get(sv, [])

    for fid in active_facets:
      finfo = v2_facets.get(fid, {})
      import_name = finfo.get('importName')
      if not import_name:
        continue

      prov_id = f"dc/base/{import_name}"
      pdata = prov_map.get(prov_id)
      if not pdata:
        continue

      date_ranges = facet_date_ranges.get(fid, {})
      unit = finfo.get('unit')
      mm = finfo.get('measurementMethod')

      source_name = _get_node_name(pdata['source'], linked_names_map)
      prov_name = _get_node_name(pdata['isPartOf'], linked_names_map) or \
                  _get_node_name(pdata['name'], linked_names_map) or import_name

      mm_desc = None
      if mm and prov_name not in MEASUREMENT_METHODS_SUPPRESSION_PROVENANCES:
        mm_desc = mm_map.get(mm) or title_case(mm)

      resolved_unit = (unit_map.get(unit) or
                       unit.replace('_', ' ')) if unit else unit
      license_name = _get_node_name(pdata['licenseType'], linked_names_map)
      license_dcid = pdata['licenseType'][0].get('dcid') if pdata.get(
          'licenseType') else None

      metadata_map[sv].append({
          'statVarId':
              sv,
          'statVarName':
              stat_var_names.get(sv, sv),
          'categories':
              category_map.get(sv, []),
          'sourceName':
              source_name,
          'provenanceUrl':
              pdata.get('url')[0].get('value') if pdata.get('url') else None,
          'provenanceName':
              prov_name,
          'dateRangeStart':
              date_ranges.get('earliestDate'),
          'dateRangeEnd':
              date_ranges.get('latestDate'),
          'unit':
              resolved_unit,
          'observationPeriod':
              finfo.get('observationPeriod'),
          'license':
              license_name,
          'licenseDcid':
              license_dcid,
          'measurementMethod':
              mm,
          'measurementMethodDescription':
              mm_desc
      })

  return metadata_map


@bp.route('', methods=['POST'])
async def get_metadata():
  # Input Validation
  req_data = request.get_json(silent=True)
  if not req_data:
    return jsonify({'error': 'Must provide a valid JSON body'}), 400

  entities = req_data.get('entities', [])
  stat_vars = req_data.get('statVars', [])
  stat_var_to_facets = req_data.get('statVarToFacets', {})
  frontend_facets = req_data.get('facets', {})

  if not isinstance(entities, list) or not isinstance(stat_vars, list):
    return jsonify({'error': 'entities and statVars must be lists'}), 400

  if not entities or not stat_vars:
    return jsonify({'metadata': {}, 'statVarList': []})

  # Initial Data Fetching
  try:
    name_resp, obs_resp, category_map = await asyncio.gather(
        asyncio.to_thread(dc.v2node, stat_vars, '->name'),
        asyncio.to_thread(dc.v2observation,
                          select=['entity', 'variable', 'facet'],
                          entity={'dcids': entities},
                          variable={'dcids': stat_vars}),
        fetch_categories_async(stat_vars))
  except Exception as e:
    logging.error(f"Failed to fetch primary metadata from DC: {e}")
    return jsonify({'error': 'Failed to communicate with Data Commons service'
                   }), 502

  # Process Stat Var Names into a lookup dictionary
  stat_var_names = {}
  stat_var_list = []
  if 'data' in name_resp:
    for sv in stat_vars:
      nodes = _get_arc_nodes(name_resp, sv, 'name')
      name = nodes[0].get('value') if nodes else sv
      stat_var_names[sv] = name
      stat_var_list.append({"dcid": sv, "name": name})

  # Collate active facets per stat var
  sv_active_facets = {
      sv: _extract_active_facets(sv, obs_resp, stat_var_to_facets)
      for sv in stat_vars
  }

  # Process Observations to determine dates and measurement methods/units/import names
  v2_facets = obs_resp.get('facets', {})

  # Merge the frontend's date-accurate facets so importNames are never dropped
  for key, val in frontend_facets.items():
    if isinstance(val, dict) and 'importName' not in val:
      v2_facets.update(val)
    else:
      v2_facets[key] = val

  facet_date_ranges = collections.defaultdict(dict)
  provenance_endpoints, measurement_methods, units = set(), set(), set()

  for sv in stat_vars:
    for fid in sv_active_facets[sv]:
      # Aggregate measurement methods, units and import names
      finfo = v2_facets.get(fid, {})
      if finfo.get('unit'):
        units.add(finfo['unit'])
      if finfo.get('measurementMethod'):
        measurement_methods.add(finfo['measurementMethod'])
      if finfo.get('importName'):
        provenance_endpoints.add(f"dc/base/{finfo['importName']}")

      # Aggregate Date Ranges
      by_entity = obs_resp.get('byVariable', {}).get(sv,
                                                        {}).get('byEntity', {})
      for ent_data in by_entity.values():
        for f in ent_data.get('orderedFacets', []):
          if f.get('facetId') != fid:
            continue

          earliest, latest = f.get('earliestDate'), f.get('latestDate')
          if earliest and (not facet_date_ranges[fid].get('earliestDate') or
                           earliest < facet_date_ranges[fid]['earliestDate']):
            facet_date_ranges[fid]['earliestDate'] = earliest
          if latest and (not facet_date_ranges[fid].get('latestDate') or
                         latest > facet_date_ranges[fid]['latestDate']):
            facet_date_ranges[fid]['latestDate'] = latest

  # Look up names and descriptions of provenances, measurement methods and units
  try:
    prov_res, mm_res, unit_res = await asyncio.gather(
        asyncio.to_thread(dc.v2node, list(provenance_endpoints), '->*')
        if provenance_endpoints else asyncio.sleep(0, result={}),
        asyncio.to_thread(dc.v2node, list(measurement_methods), '->description')
        if measurement_methods else asyncio.sleep(0, result={}),
        asyncio.to_thread(dc.v2node, list(units), '->name')
        if units else asyncio.sleep(0, result={}))
  except Exception as e:
    logging.error(f"Failed to fetch secondary metadata from DC: {e}")
    return jsonify({'error': 'Failed to resolve secondary node data'}), 502

  # Process secondary lookups
  prov_map = {}
  linked_prov_dcids = set()

  if 'data' in prov_res:
    for dcid, node_data in prov_res['data'].items():
      prov_map[dcid] = {
          'source': _get_arc_nodes(prov_res, dcid, 'source'),
          'isPartOf': _get_arc_nodes(prov_res, dcid, 'isPartOf'),
          'name': _get_arc_nodes(prov_res, dcid, 'name'),
          'url': _get_arc_nodes(prov_res, dcid, 'url'),
          'licenseType': _get_arc_nodes(prov_res, dcid, 'licenseType'),
      }
      # Collect DCIDs of linked entities for human-readable resolution
      for n in prov_map[dcid]['source'] + prov_map[dcid]['isPartOf'] + prov_map[
          dcid]['licenseType']:
        if 'dcid' in n:
          linked_prov_dcids.add(n['dcid'])

  linked_names_map = {}
  if linked_prov_dcids:
    try:
      linked_names_resp = await asyncio.to_thread(dc.v2node,
                                                  list(linked_prov_dcids),
                                                  '->name')
      for n_dcid in linked_prov_dcids:
        n_arcs = _get_arc_nodes(linked_names_resp, n_dcid, 'name')
        if n_arcs:
          linked_names_map[n_dcid] = n_arcs[0].get('value')
    except Exception as e:
      logging.error(f"Failed to resolve linked provenance names: {e}")

  mm_map = {
      mm: _get_arc_nodes(mm_res, mm, 'description')[0].get('value')
      for mm in measurement_methods
      if _get_arc_nodes(mm_res, mm, 'description')
  }
  unit_map = {
      u: _get_arc_nodes(unit_res, u, 'name')[0].get('value')
      for u in units
      if _get_arc_nodes(unit_res, u, 'name')
  }

  # Assemble and return the final response
  metadata_map = _build_metadata_payload(stat_vars, stat_var_names,
                                         category_map, sv_active_facets,
                                         v2_facets, facet_date_ranges, prov_map,
                                         linked_names_map, mm_map, unit_map)

  return jsonify({'metadata': metadata_map, 'statVarList': stat_var_list})