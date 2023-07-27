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

# Chart structure for the var correlation page.

import logging
from typing import Dict

from server.lib.insights.page_type.builder import Builder
from server.lib.nl.config_builder import scatter
import server.lib.nl.fulfillment.types as ftypes


def add_chart(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
              builder: Builder) -> Dict:
  logging.info(chart_vars)
  if not state.place_type or len(chart_vars.svs) != 2:
    logging.info(f'{state.place_type}')
    return {}

  place = state.uttr.places[0]

  # Child existence check for both SVs.
  place_key = place.dcid + state.place_type.value
  has_child_places = all(
      [place_key in state.exist_checks.get(v, {}) for v in chart_vars.svs])
  if not has_child_places:
    logging.info(f'{state.exist_checks}')
    return {}

  attr = {'include_percapita': False, 'child_type': state.place_type.value}
  return scatter.scatter_chart_block(builder.new_column(), place,
                                     chart_vars.svs, builder.sv2thing, attr,
                                     builder.nopc())
