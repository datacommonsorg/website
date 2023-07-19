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

import random
import re
from typing import List

from server.lib.config import is_test_env
import server.lib.fetch as fetch
from server.lib.nl.detection.types import Place

MAX_SIMILAR_PLACES = 10


#
# Given a place get related places.
#
# TODO: change this to return List[Place] after
# https://api.datacommons.org/v1/bulk/property/values/out?property=member&nodes=PlacePagesComparisonCountyCohort
# includes names.
#
def get_similar(pl: Place) -> List[str]:
  cohort = _cohort(pl)
  if not cohort:
    return []

  # Get cohort members.
  res = fetch.raw_property_values([cohort], 'member')
  members = []
  for m in res.get(cohort, []):
    if 'dcid' not in m:
      continue
    members.append(m['dcid'])
  if not members:
    return []

  # Randomize order.
  if is_test_env():
    members.sort()
  else:
    random.shuffle(members)
  return members[:MAX_SIMILAR_PLACES]


def _cohort(pl: Place) -> str:
  if pl.place_type == 'Country':
    return 'PlacePagesComparisonCountriesCohort'
  if re.match(r'^geoId/\d{2}$', pl.dcid):
    return 'PlacePagesComparisonStateCohort'
  if re.match(r'^geoId/\d{5}$', pl.dcid):
    return 'PlacePagesComparisonCountyCohort'
  if re.match(r'^geoId/\d{7}$', pl.dcid):
    return 'PlacePagesComparisonCityCohort'
  if pl.place_type == 'City':
    return 'PlacePagesComparisonWorldCitiesCohort'
  return ''
