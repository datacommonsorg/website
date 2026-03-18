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

from server.lib import fetch
from server.services import datacommons as dc

bp = Blueprint("metadata", __name__, url_prefix='/api/metadata')

# Limits the recursion when traversing parent hierarchies (memberOf/specializationOf)
# to prevent infinite loops or excessive API calls in deep graphs.
MAX_CATEGORY_DEPTH = 50

# A list of specific provenance DCIDs where the 'measurementMethod' attribute
# should be hidden, because it is flawed or not meaningful.
MEASUREMENT_METHODS_SUPPRESSION_PROVENANCES: set[str] = {"WikipediaStatsData"}

# TODO (nick-nlb): merge the below constants with series.py.

# Maximum number of concurrent series the server will fetch in a single chunk
_MAX_BATCH_SIZE = 2000

# Maps enclosed place type -> places with too many of the enclosed type.
# Determines when to pre-resolve expressions into entities for batching.
_BATCHED_CALL_PLACES = {
    "CensusTract": [
        "geoId/06",  # California
        "geoId/12",  # Florida
        "geoId/36",  # New York (State)
        "geoId/48",  # Texas
    ],
    "City": ["country/USA"],
    "County": ["country/USA"]
}


def title_case(string: str) -> str:
  """Replaces underscores with spaces, capitalizes the first letter, and preserves acronyms."""
  return " ".join([
      word[0].upper() + word[1:] if word else "" for word in string.split("_")
  ])


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


async def _fetch_node_data(dcids: set[str], prop: str) -> dict[str, Any]:
  """Helper to fetch node data only if the list of DCIDs is not empty."""
  if not dcids:
    return {}
  return await asyncio.to_thread(dc.v2node, list(dcids), prop)


def _extract_facet_date_ranges(
    obs_resp: dict, stat_vars: list[str]) -> dict[str, dict[str, str]]:
  """Extracts min/max dates for facets."""
  facet_date_ranges = collections.defaultdict(dict)
  by_variable = obs_resp.get('byVariable', {})

  for sv in stat_vars:
    by_entity = by_variable.get(sv, {}).get('byEntity', {})
    for ent_data in by_entity.values():
      # Aggregate Date Ranges
      for f in ent_data.get('orderedFacets', []):
        fid = f.get('facetId')
        if not fid:
          continue

        earliest, latest = f.get('earliestDate'), f.get('latestDate')

        if earliest and (not facet_date_ranges[fid].get('earliestDate') or
                         earliest < facet_date_ranges[fid]['earliestDate']):
          facet_date_ranges[fid]['earliestDate'] = earliest

        if latest and (not facet_date_ranges[fid].get('latestDate') or
                       latest > facet_date_ranges[fid]['latestDate']):
          facet_date_ranges[fid]['latestDate'] = latest

  return facet_date_ranges


async def _fetch_secondary_metadata(
    provenance_endpoints: set[str], measurement_methods: set[str],
    units: set[str]) -> tuple[dict, dict, dict, dict]:
  """Shared helper to resolve human-readable strings from the Knowledge Graph."""
  # Look up names and descriptions of provenances, measurement methods and units
  try:
    prov_res, mm_res, unit_res = await asyncio.gather(
        _fetch_node_data(provenance_endpoints, '->*'),
        _fetch_node_data(measurement_methods, '->description'),
        _fetch_node_data(units, '->name'))
  except Exception:
    logging.exception("Failed to fetch secondary metadata from DC")
    prov_res, mm_res, unit_res = {}, {}, {}

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

  return prov_map, linked_names_map, mm_map, unit_map


def _traverse_to_top_category(node: str, parent_map: dict[str, list[str]],
                              visited: set[str], top_nodes: set[str],
                              original_sv: str) -> None:
  """Recursively traces paths from a node to its top-level ancestors."""
  if node in visited:
    return
  visited.add(node)

  parents = parent_map.get(node, [])
  valid_parents = [p for p in parents if p != 'dc/g/Root']

  if not valid_parents:
    # If the node is not the starting SV, it's a top-level category
    # This is for the case where a stat var does not have a category, where
    # it should not itself be considered a category.
    if node != original_sv:
      top_nodes.add(node)
  else:
    for p in valid_parents:
      _traverse_to_top_category(p, parent_map, visited, top_nodes, original_sv)


async def fetch_categories_async(stat_vars: list[str]) -> dict[str, list[str]]:
  """Traverses the category hierarchy tree up to top-level topics.

  This function identifies the categories (top-level topics) associated with a list 
    of Statistical Variables. It returns a mapping where each key is a stat_var 
    DCID and the value is a list of human-readable names of its top-level parents.

    The implementation uses a two-stage traversal:
    1. Breadth-First Search (BFS): Iteratively climbs the 'memberOf' and 
       'specializationOf' arcs across all input variables simultaneously to 
       map the parent hierarchy.
    2. Depth-First Search (DFS): Performed locally on the resulting parent_map 
       to trace individual paths from each stat_var to its root-level ancestors 
       (excluding the generic 'dc/g/Root').

    Args:
        stat_vars: A list of Statistical Variable DCIDs.

    Returns:
        A dictionary mapping stat_var DCIDs to a list of display names for their 
        top-level categories.
    """
  parent_map = collections.defaultdict(list)
  current_nodes = set(stat_vars)
  visited = set()
  depth = 0

  # Progressively fetch parent nodes level-by-level (BFS).
  # This batches v2node calls by depth to minimize network round-trips.
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

  # Traverse individual paths from each stat_var to its top-level categories.
  # Using the parent_map built above, we resolve which topic-level topics
  # each variable eventually rolls up to.
  for sv in stat_vars:
    tops = set()

    _traverse_to_top_category(sv, parent_map, set(), tops, sv)
    sv_top_levels[sv] = list(tops)
    all_top_level_dcids.update(tops)

  # Resolve human-readable names for the top-level categories.
  # If a name isn't found in the Knowledge Graph, we fall back to a
  # simplified version of the DCID.
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
          # Use the official name if available; otherwise, extract the last
          # chunk of the DCIC (if it contains multiple parts delimited by slashes)
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


# ==============================================================================
# Metadata Endpoint
# ==============================================================================
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

  if len(stat_vars) > _MAX_BATCH_SIZE:
    return jsonify({
        'error':
            f'Too many Statistical Variables requested. Maximum allowed is {_MAX_BATCH_SIZE}'
    }), 400

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

  facet_date_ranges = _extract_facet_date_ranges(obs_resp, stat_vars)

  prov_map, linked_names_map, mm_map, unit_map = await _fetch_secondary_metadata(
      provenance_endpoints, measurement_methods, units)

  # Assemble and return the final response
  metadata_map = _build_metadata_payload(stat_vars, stat_var_names,
                                         category_map, sv_active_facets, facets,
                                         facet_date_ranges, prov_map,
                                         linked_names_map, mm_map, unit_map)

  return jsonify({'metadata': metadata_map, 'statVarList': stat_var_list})


# ==============================================================================
# Facet Metadata Enrichment
# ==============================================================================
@bp.route('/facets', methods=['POST'])
async def enrich_facets() -> tuple[Response, int] | Response:
  """Endpoint to enrich a dictionary of facets with dates and metadata."""
  req_data = request.get_json(silent=True)
  if not req_data:
    return jsonify({'error': 'Must provide a valid JSON body'}), 400

  facets = req_data.get('facets', {})
  stat_vars = req_data.get('statVars', [])
  entities = req_data.get('entities', [])
  parent_place = req_data.get('parentPlace', '')
  enclosed_place_type = req_data.get('enclosedPlaceType', '')

  if len(stat_vars) > _MAX_BATCH_SIZE:
    return jsonify({
        'error':
            f'Too many Statistical Variables requested. Maximum allowed is {_MAX_BATCH_SIZE}'
    }), 400

  if not facets:
    return jsonify({})

  obs_resp = {'byVariable': {}}
  entity_expression = ""

  if stat_vars and (entities or (parent_place and enclosed_place_type)):

    # 1. Resolve large expressions explicitly so we can safely chunk entities
    if parent_place and enclosed_place_type:
      # Default to using an entity expression.
      entity_expression = f"{parent_place}<-containedInPlace+{{typeOf:{enclosed_place_type}}}"
      # If the place is known to have many children, pre-fetch entities for batching.
      if parent_place in _BATCHED_CALL_PLACES.get(enclosed_place_type, []):
        try:
          child_places_resp = await asyncio.to_thread(fetch.descendent_places,
                                                      [parent_place],
                                                      enclosed_place_type)
          entities = child_places_resp.get(parent_place, [])
          # If successful, clear the expression to use the explicit entity list.
          entity_expression = ""
        except Exception:
          logging.exception(
              "Failed to resolve descendent places for batching. Falling back to entity expression."
          )

    # 2. Establish base query kwargs
    base_kwargs = {'select': ['entity', 'variable', 'facet']}

    all_fids = []
    for sv_facets in facets.values():
      all_fids.extend(list(sv_facets.keys()))
    all_fids = list(set(all_fids))
    if all_fids:
      base_kwargs['filter'] = {'facetIds': all_fids}

    tasks = []

    # 3. Create observation tasks based on whether we are batching
    if entity_expression:
      # At this stage, we know this is an entity expression not found in the batch constants
      kwargs = base_kwargs.copy()
      kwargs['entity'] = {'expression': entity_expression}
      kwargs['variable'] = {'dcids': stat_vars}
      tasks.append(asyncio.to_thread(dc.v2observation, **kwargs))

    elif entities:
      # We have explicit entities
      # Chunk them so len(entities) * len(stat_vars) <= _MAX_BATCH_SIZE
      ent_batch_size = max(1, _MAX_BATCH_SIZE // max(1, len(stat_vars)))
      for i in range(0, len(entities), ent_batch_size):
        kwargs = base_kwargs.copy()
        kwargs['entity'] = {'dcids': entities[i:i + ent_batch_size]}
        kwargs['variable'] = {'dcids': stat_vars}
        tasks.append(asyncio.to_thread(dc.v2observation, **kwargs))

    # 4. Run tasks and then merge
    try:
      if tasks:
        chunk_results = await asyncio.gather(*tasks)

        for res in chunk_results:
          if not res or 'byVariable' not in res:
            continue
          for sv, sv_data in res.get('byVariable', {}).items():
            entity_dict = obs_resp['byVariable'].setdefault(sv, {}).setdefault('byEntity', {})
            for ent, ent_data in sv_data.get('byEntity', {}).items():
              entity_dict.setdefault(ent, {'orderedFacets': []})['orderedFacets'].extend(
                  ent_data.get('orderedFacets', [])
              )
    except Exception:
      logging.exception(
          "v2observation failed in enrich_facets. Date ranges may be missing.")
      obs_resp = {}

  facet_date_ranges = _extract_facet_date_ranges(obs_resp, stat_vars)

  provenance_endpoints = set()
  measurement_methods = set()
  units = set()

  for sv, sv_facets in facets.items():
    for fid, finfo in sv_facets.items():
      if finfo.get('importName'):
        provenance_endpoints.add(f"dc/base/{finfo['importName']}")
      if finfo.get('measurementMethod'):
        measurement_methods.add(finfo['measurementMethod'])
      if finfo.get('unit'):
        units.add(finfo['unit'])

  prov_map, linked_names_map, mm_map, unit_map = await _fetch_secondary_metadata(
      provenance_endpoints, measurement_methods, units)

  for sv, sv_facets in facets.items():
    for fid, finfo in sv_facets.items():
      dr = facet_date_ranges.get(fid, {})
      if dr.get('earliestDate'):
        finfo['dateRangeStart'] = dr.get('earliestDate')
      if dr.get('latestDate'):
        finfo['dateRangeEnd'] = dr.get('latestDate')

      import_name = finfo.get('importName')
      if import_name:
        prov_id = f"dc/base/{import_name}"
        pdata = prov_map.get(prov_id)
        if pdata:
          finfo['sourceName'] = _get_node_name(pdata.get('source', []),
                                               linked_names_map)
          finfo['provenanceName'] = _get_node_name(pdata.get('isPartOf', []), linked_names_map) or \
                                    _get_node_name(pdata.get('name', []), linked_names_map) or import_name

      mm = finfo.get('measurementMethod')
      if mm and finfo.get(
          'provenanceName') not in MEASUREMENT_METHODS_SUPPRESSION_PROVENANCES:
        finfo['measurementMethodDescription'] = mm_map.get(mm) or title_case(mm)

      unit = finfo.get('unit')
      if unit:
        finfo['unitDisplayName'] = unit_map.get(unit) or unit.replace('_', ' ')

  return jsonify(facets)
