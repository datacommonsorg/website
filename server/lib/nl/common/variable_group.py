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

from typing import Dict, List

from server.lib.nl.common import variable
import server.services.datacommons as dc

# A few limits to make sure we don't blow up.
MAX_SVGS_IN_CALL = 50
MAX_SVG_LEVELS = 5


# Given a list of StatVarGroups, open them up into variables.
def open_svgs(svgs: List[str]) -> Dict[str, variable.SV]:
  result = {}
  processed = set()
  _get_svg_info(sorted(svgs), processed, result, level=0)
  return result


def _get_svg_info(svgs, processed, result, level=0):
  resp = dc.get_variable_group_info(svgs[:MAX_SVGS_IN_CALL], [])
  recurse_nodes = set()
  for data in resp.get('data', []):
    svg_id = data.get('node', '')
    if not svg_id:
      continue

    info = data.get('info', '')
    if not info:
      continue

    if svg_id in processed:
      continue
    processed.add(svg_id)

    for csv in info.get('childStatVars', []):
      if not csv.get('id'):
        continue
      result[csv['id']] = variable.parse_sv(csv['id'],
                                            csv.get('definition', ''))

    for csvg in info.get('childStatVarGroups', []):
      if not csvg.get('id'):
        continue
      recurse_nodes.add(csvg['id'])

  if recurse_nodes and level <= MAX_SVG_LEVELS:
    _get_svg_info(sorted(list(recurse_nodes)), processed, result, level + 1)
