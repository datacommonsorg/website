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
  """Returns a dictionary of the descendant SV node objects keyed by dcid."""
  descendant_stat_vars = {}
  processed = set()
  _get_svg_info(sorted(svgroups), processed, descendant_stat_vars, level=0)
  return descendant_stat_vars


def _get_svg_info(
    groups_to_open: list[str],
    processed_groups: set,
    sv_nodes: dict[str, variable.SV],
    level: int = 0,
):
  """Fetches child stat vars and stat var groups for the first
    MAX_SVGS_IN_CALL groups listed in `groups_to_open`.

    Child groups are added to `recurse_nodes` to be processed in a recursive
    call. Child stat vars are added to `sv_nodes`, keyed by dcid.
    """
  # Don't do anything if the list of groups is empty
  if not groups_to_open:
    return

  # NOTE: This arbitrarily cuts off the explored groups, not every descendant
  # of the inital groups is visited.
  resp = dc.get_variable_group_info(groups_to_open[:MAX_SVGS_IN_CALL], [])

  recurse_nodes = set()
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
      recurse_nodes.add(child_group_dcid)

  if recurse_nodes and level <= MAX_SVG_LEVELS:
    _get_svg_info(sorted(list(recurse_nodes)), processed_groups, sv_nodes,
                  level + 1)
