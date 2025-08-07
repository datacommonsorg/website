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

from server.lib.nl.common import variable
import server.services.datacommons as dc

# A few limits to make sure we don't blow up.
MAX_SVGS_IN_CALL = 50
MAX_SVG_LEVELS = 5


# Given a list of StatVarGroups, open them up into variables.
def open_svgs(svgroups: list[str]) -> dict[str, variable.SV]:
  """Returns a dictionary of the descendant SV nodes keyed by dcid."""
  return _get_descendant_sv_nodes(sorted(svgroups),
                                  processed_groups=set(),
                                  level=0)


def _get_descendant_sv_nodes(
    groups_to_open: list[str],
    processed_groups: set,
    level: int = 0,
) -> dict[str, variable.SV]:
  """Fetches child stat vars and stat var groups for the first
    MAX_SVGS_IN_CALL SVGroups in `groups_to_open`.

    Child groups are added to `recurse_groups` to be processed in a recursive
    call.

    Returns a dict of descendant stat var (SV) nodes, keyed by dcid.
    """

  # Don't do anything if the list of groups is empty
  if not groups_to_open:
    return {}

  # NOTE: This arbitrarily cuts off the explored groups, not every descendant
  # of the inital groups is visited.
  resp = dc.get_variable_group_info(groups_to_open[:MAX_SVGS_IN_CALL], [])

  sv_nodes = {}
  recurse_groups = set()
  for data in resp.get("data", []):
    if not (group_dcid := data.get("node")) or group_dcid in processed_groups:
      continue
    processed_groups.add(group_dcid)

    if not (info := data.get("info")):
      continue

    for child_sv in info.get("childStatVars", []):
      if not (child_sv_dcid := child_sv.get("id")):
        continue
      sv_nodes[child_sv_dcid] = variable.parse_sv(
          child_sv_dcid, child_sv.get("definition", ""))

    for child_group in info.get("childStatVarGroups", []):
      if (not (child_group_dcid := child_group.get("id")) or
          child_group_dcid in processed_groups):
        continue
      recurse_groups.add(child_group_dcid)

  if recurse_groups and level <= MAX_SVG_LEVELS:
    sv_nodes.update(
        _get_descendant_sv_nodes(sorted(list(recurse_groups)), processed_groups,
                                 level + 1))
  return sv_nodes
