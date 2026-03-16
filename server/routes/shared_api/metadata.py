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
from typing import Any

from flask import Blueprint
from flask import jsonify
from flask import request
from flask import Response

from server.services import datacommons as dc

bp = Blueprint("metadata", __name__, url_prefix='/api/shared/metadata')

MAX_CATEGORY_DEPTH = 50

MEASUREMENT_METHODS_SUPPRESSION_PROVENANCES: set[str] = {"WikipediaStatsData"}


def title_case(string: str) -> str:
  return " ".join([word.capitalize() for word in string.split("_")])


def _get_arc_nodes(data_dict: dict[str, Any], node_id: str,
                   arc_name: str) -> list[dict[str, Any]]:
  """Extracts nodes for a given arc from a v2node response dictionary."""
  return data_dict.get('data', {}).get(node_id,
                                       {}).get('arcs',
                                               {}).get(arc_name,
                                                       {}).get('nodes', [])


def _get_node_name(node_list: list[dict[str, Any]],
                   linked_names_map: dict[str, str]) -> str | None:
  """Helper to resolve a node's display name from either a literal value or linked reference."""
  if not node_list:
    return None
  node = node_list[0]
  if 'value' in node:
    return node['value']
  if 'dcid' in node:
    return linked_names_map.get(node['dcid'])
  return None


def _extract_active_facets(
    sv: str, obs_resp: dict[str, Any],
    stat_var_to_facets: dict[str, list[str]]) -> list[str]:
  """Extracts active facets for a given stat var."""
  active_facets = list(stat_var_to_facets.get(sv, []))
  if not active_facets:
    by_entity = obs_resp.get('byVariable', {}).get(sv, {}).get('byEntity', {})
    for ent_data in by_entity.values():
      for f in ent_data.get('orderedFacets', []):
        active_facets.append(f.get('facetId'))
  return list(set(active_facets))


async def fetch_categories_async(stat_vars: list[str]) -> dict[str, list[str]]:
  """Traverses the category hierarchy tree up to top-level topics."""
  parent_map = collections.defaultdict(list)
  current_nodes = set(stat_vars)
  visited = set()
  depth = 0

  while current_nodes and depth < MAX_CATEGORY_DEPTH:
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

    def traverse(n: str, curr_visited: set[str]) -> None:
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

  category_map: dict[str, list[str]] = {}
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


def _build_metadata_payload(
    stat_vars: list[str], stat_var_names: dict[str, str],
    category_map: dict[str, list[str]], sv_active_facets: dict[str, list[str]],
    facets: dict[str, Any], facet_date_ranges: dict[str, dict[str, str]],
    prov_map: dict[str, dict[str, Any]], linked_names_map: dict[str, str],
    mm_map: dict[str,
                 str], unit_map: dict[str,
                                      str]) -> dict[str, list[dict[str, Any]]]:
  """Constructs the final aggregated metadata dictionary."""
  metadata_map = collections.defaultdict(list)

  for sv in stat_vars:
    active_facets = sv_active_facets.get(sv, [])

    for fid in active_facets:
      finfo = facets.get(fid, {})
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
      license_dcid = pdata['licenseType'][0].get(
          'dcid') if pdata.get('licenseType') and pdata['licenseType'] else None

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


async def _fetch_node_data(dcids: set[str], prop: str) -> dict[str, Any]:
  """Helper to fetch node data only if the list of DCIDs is not empty."""
  if not dcids:
    return {}
  return await asyncio.to_thread(dc.v2node, list(dcids), prop)


@bp.route('', methods=['POST'])
async def get_metadata() -> tuple[Response, int] | Response:
  # Input Validation
  req_data = request.get_json(silent=True)
  if not req_data:
    return jsonify({'error': 'Must provide a valid JSON body'}), 400

  entities: list[str] = req_data.get('entities', [])
  stat_vars: list[str] = req_data.get('statVars', [])
  stat_var_to_facets: dict[str, list[str]] = req_data.get('statVarToFacets', {})
  frontend_facets: list[str] = req_data.get('facets', [])

  if not isinstance(entities, list) or not isinstance(stat_vars, list):
    return jsonify({'error': 'entities and statVars must be lists'}), 400

  if not entities or not stat_vars:
    return jsonify({'metadata': {}, 'statVarList': []})

  # Initial Data Fetching
  v2obs_kwargs = {
      'select': ['entity', 'variable', 'facet'],
      'entity': {
          'dcids': entities
      },
      'variable': {
          'dcids': stat_vars
      }
  }
  if frontend_facets:
    v2obs_kwargs['filter'] = {'facetIds': frontend_facets}

  try:
    name_resp, obs_resp, category_map = await asyncio.gather(
        asyncio.to_thread(dc.v2node, stat_vars, '->name'),
        asyncio.to_thread(dc.v2observation, **v2obs_kwargs),
        fetch_categories_async(stat_vars))
  except Exception:
    logging.exception("Failed to fetch primary metadata from DC")
    return jsonify({'error': 'Failed to communicate with Data Commons service'
                   }), 502

  # Process Stat Var Names into a lookup dictionary
  stat_var_names: dict[str, str] = {}
  stat_var_list: list[dict[str, str]] = []
  if 'data' in name_resp:
    for sv in stat_vars:
      nodes = _get_arc_nodes(name_resp, sv, 'name')
      name = nodes[0].get('value') if nodes else sv
      stat_var_names[sv] = name
      stat_var_list.append({"dcid": sv, "name": name})

  # Collate active facets per stat var
  sv_active_facets: dict[str, list[str]] = {
      sv: _extract_active_facets(sv, obs_resp, stat_var_to_facets)
      for sv in stat_vars
  }

  facets = obs_resp.get('facets', {})

  facet_date_ranges: dict[str, dict[str, str]] = collections.defaultdict(dict)
  provenance_endpoints: set[str] = set()
  measurement_methods: set[str] = set()
  units: set[str] = set()

  for sv in stat_vars:
    for fid in sv_active_facets[sv]:
      # Aggregate measurement methods, units and import names
      finfo = facets.get(fid, {})
      if finfo.get('unit'):
        units.add(finfo['unit'])
      if finfo.get('measurementMethod'):
        measurement_methods.add(finfo['measurementMethod'])
      if finfo.get('importName'):
        provenance_endpoints.add(f"dc/base/{finfo['importName']}")

      # Aggregate Date Ranges
      by_entity = obs_resp.get('byVariable', {}).get(sv, {}).get('byEntity', {})
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
        _fetch_node_data(provenance_endpoints, '->*'),
        _fetch_node_data(measurement_methods, '->description'),
        _fetch_node_data(units, '->name'))
  except Exception:
    logging.exception("Failed to fetch secondary metadata from DC")
    return jsonify({'error': 'Failed to resolve secondary node data'}), 502

  # Process secondary lookups
  prov_map: dict[str, dict[str, Any]] = {}
  linked_prov_dcids: set[str] = set()

  if 'data' in prov_res:
    for dcid in prov_res['data']:
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

  linked_names_map: dict[str, str] = {}
  if linked_prov_dcids:
    try:
      linked_names_resp = await asyncio.to_thread(dc.v2node,
                                                  list(linked_prov_dcids),
                                                  '->name')
      for n_dcid in linked_prov_dcids:
        n_arcs = _get_arc_nodes(linked_names_resp, n_dcid, 'name')
        if n_arcs:
          linked_names_map[n_dcid] = n_arcs[0].get('value')
    except Exception:
      logging.exception("Failed to resolve linked provenance names")

  mm_map: dict[str, str] = {
      mm: _get_arc_nodes(mm_res, mm, 'description')[0].get('value')
      for mm in measurement_methods
      if _get_arc_nodes(mm_res, mm, 'description')
  }
  unit_map: dict[str, str] = {
      u: _get_arc_nodes(unit_res, u, 'name')[0].get('value')
      for u in units
      if _get_arc_nodes(unit_res, u, 'name')
  }

  # Assemble and return the final response
  metadata_map = _build_metadata_payload(stat_vars, stat_var_names,
                                         category_map, sv_active_facets, facets,
                                         facet_date_ranges, prov_map,
                                         linked_names_map, mm_map, unit_map)

  return jsonify({'metadata': metadata_map, 'statVarList': stat_var_list})
