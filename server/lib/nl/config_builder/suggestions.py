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

from server.config.subject_page_pb2 import SubjectPageConfig
from server.config.subject_page_pb2 import Suggestion
from server.lib.nl.common import utterance

# Type returned by _place_type() to tuple of:
#
#   <default-dcid>, <default-name>, <alternate-name>
#
# Where <alternate-name> is used if default is the
# user-requested place.
_DEFAULT_PLACES = {
    'COUNTRY': ('country/USA', 'USA', 'India'),
    'US_STATE': ('geoId/06', 'California', 'Utah'),
    'US_COUNTY': ('geoId/06085', 'Santa Clara County', 'Placer County'),
    'US_CITY': ('geoId/0667000', 'San Francisco', 'Sunnyvale'),
}


# Get type
def _place_type(id):
  if id.startswith('country/'):
    return 'COUNTRY'
  if id.startswith('geoId/') and len(id) == 8:
    return 'US_STATE'
  if id.startswith('geoId/') and len(id) == 11:
    return 'US_COUNTY'
  if id.startswith('geoId/') and len(id) == 13:
    return 'US_CITY'
  return ''


#
# May populate config.suggestions based on uttr.
#
# TODO: Improve this ... seriously
#
def add(uttr: utterance.Utterance, config: SubjectPageConfig):
  if not len(uttr.places) == 1 or not uttr.detection:
    return
  p = uttr.places[0]

  pt = _place_type(p.dcid)
  if not pt:
    return

  if p.dcid == _DEFAULT_PLACES[pt][0]:
    alt_name = _DEFAULT_PLACES[pt][2]
  else:
    alt_name = _DEFAULT_PLACES[pt][1]

  oq = uttr.detection.original_query
  if not oq:
    return

  nq = oq.replace(p.name.lower(), alt_name.lower())
  if oq != nq:
    k = Suggestion.Type.Name(Suggestion.Type.NL_RELATED_PLACE)
    config.suggestions[k].CopyFrom(
        Suggestion(items=[Suggestion.Item(display_name=alt_name, nl_query=nq)]))

  if uttr.query_type == utterance.QueryType.CONTAINED_IN:
    k = Suggestion.Type.Name(Suggestion.Type.NL_RELATED_QUERY_TYPE)
    config.suggestions[k].CopyFrom(
        Suggestion(items=[
            Suggestion.Item(display_name='Show highest',
                            nl_query=oq + ' - show highest'),
            Suggestion.Item(display_name='Show lowest',
                            nl_query=oq + ' - show lowest')
        ]))
