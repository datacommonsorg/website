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
"""Logic for V2 Stat Var Search."""

import server.services.datacommons as dc


def stat_var_v2_search(query: str, entities: list[str]) -> list[dict[str, str]]:
  """Performs V2 stat var search by resolving candidates and filtering them."""
  candidates = _resolve_candidates(query)
  valid_statvars = _filter_by_observation(candidates, entities)
  statvars = _filter_by_type(valid_statvars)
  filtered_statvars = _fetch_names(statvars)
  return filtered_statvars


def _resolve_candidates(query: str) -> list[dict[str, str]]:
  """Resolves a natural language query to a list of candidate DCIDs."""
  url = dc.get_service_url("/v2/resolve")
  resolve_resp = dc.post(url, {
      "nodes": [query],
      "property": "<-description->dcid",
      "resolver": "indicator"
  })

  candidates = []
  for ent in resolve_resp.get("entities", []):
    for candidate in ent.get("candidates", []):
      if candidate.get("dcid"):
        candidates.append({"dcid": candidate.get("dcid")})
  return candidates


def _filter_by_observation(candidates: list[dict[str, str]],
                           entities: list[str]) -> list[dict[str, str]]:
  """Filters candidates by checking if they have observation data for entities."""
  if not candidates or not entities:
    return candidates

  url = dc.get_service_url("/v2/observation")
  obs_resp = dc.post(
      url, {
          "variable": {
              "dcids": [c["dcid"] for c in candidates if c.get("dcid")]
          },
          "entity": {
              "dcids": entities
          },
          "select": ["variable", "entity"]
      })

  by_var = obs_resp.get("byVariable", {})
  valid_candidates = []
  for c in candidates:
    if c["dcid"] in by_var and by_var[c["dcid"]].get("byEntity"):
      valid_candidates.append(c)
  return valid_candidates


def _filter_by_type(candidates: list[dict[str, str]]) -> list[dict[str, str]]:
  """Filters out StatVarGroups and Topics from candidates."""
  if not candidates:
    return []

  node_resp = dc.post(
      dc.get_service_url("/v2/node"), {
          "nodes": [c["dcid"] for c in candidates if c.get("dcid")],
          "property": "->typeOf"
      })

  typed_statvars = []
  for c in candidates:
    node_arcs = node_resp.get("data", {}).get(c["dcid"], {}).get("arcs", {})
    types = [
        n.get("dcid") for n in node_arcs.get("typeOf", {}).get("nodes", [])
    ]
    if "StatVarGroup" not in types and "Topic" not in types:
      typed_statvars.append(c)
  return typed_statvars


def _fetch_names(candidates: list[dict[str, str]]) -> list[dict[str, str]]:
  """Fetches names for the candidate DCIDs."""
  if not candidates:
    return []

  dcids = [c["dcid"] for c in candidates if c.get("dcid")]
  names_map = {}
  if dcids:
    names_resp = dc.v2node(dcids, "->name")
    for dcid, node_data in names_resp.get("data", {}).items():
      name_nodes = node_data.get("arcs", {}).get("name", {}).get("nodes", [])
      if name_nodes:
        names_map[dcid] = name_nodes[0].get("value")

  for c in candidates:
    c["name"] = names_map.get(c["dcid"], "")
  return candidates
