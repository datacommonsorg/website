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
"""Module for NL page variable"""

from typing import List

import services.datacommons as dc


def extend(svs: List[str]):
  """Extend all svs with siblings svs under the same svg.
  """
  svgs = dc.property_values(svs, "memberOf", True).values()
  svg2children = dc.property_values(svgs, "memberOf", False)
  original = set(svs)
  result = []
  for _, children in svg2children.items():
    for sv in children:
      if sv not in original:
        result.append(sv)
  return result
