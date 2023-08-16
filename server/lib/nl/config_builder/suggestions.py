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
from server.lib import fetch
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.config_builder.base import SV2Thing


class SuggestionBuilder:

  def __init__(self, uttr: Utterance, config: SubjectPageConfig):
    self.orig_query = uttr.detection.original_query
    self.place = uttr.places[0]
    self.uttr = uttr
    self.config = config

  def add_related_places(self):
    if not self.uttr.detection.places_detected:
      return

    items = []
    plname = self.place.name.lower()
    for rel in self.uttr.detection.places_detected.peer_places:
      nq = self.orig_query.replace(plname, rel.name)
      if self.orig_query != nq:
        items.append(Suggestion.Item(display_name=rel.name, nl_query=nq))
    k = Suggestion.Type.Name(Suggestion.Type.NL_RELATED_PLACE)
    self.config.suggestions[k].CopyFrom(Suggestion(items=items))

  # TODO: Perform type check too.
  # TODO: Ensure that the disambiguated query works with recognize-places
  def add_identical_places(self):
    # First get the containedInPlace triples.
    places_detected = self.uttr.detection.places_detected
    if not places_detected:
      return
    if not places_detected.identical_name_as_main_place:
      return

    dcids = [p.dcid for p in places_detected.identical_name_as_main_place]
    res = fetch.raw_property_values(dcids, 'containedInPlace')
    dcid2cip = {}
    for p, cips in res.items():
      for cip in cips:
        if 'dcid' not in cip or 'name' not in cip or 'types' not in cip:
          continue
        dcid2cip[p] = cip['name']
        break

    items = []
    plname = self.place.name.lower()
    for p in places_detected.identical_name_as_main_place:
      id = p.dcid
      if id not in dcid2cip:
        continue
      np = dcid2cip[id]
      # When the disambiguated place's type differs include that type.
      if self.place.place_type != p.place_type:
        dn = p.place_type + ' in ' + np
      else:
        dn = np
      nq = self.orig_query.replace(plname, self.place.name + ' ' + np)
      if self.orig_query != nq:
        items.append(Suggestion.Item(display_name=dn, nl_query=nq))
    k = Suggestion.Type.Name(Suggestion.Type.NL_PLACE_DISAMBIGUATION)
    self.config.suggestions[k].CopyFrom(Suggestion(items=items))

  def add_related_vars(self, sv2thing: SV2Thing):
    items = []
    for sv in self.uttr.extra_success_svs:
      name = sv2thing.name.get(sv)
      if not name:
        continue
      query = name + ' ' + self.place.name
      items.append(Suggestion.Item(display_name=name, nl_query=query))
    k = Suggestion.Type.Name(Suggestion.Type.NL_RELATED_VAR)
    self.config.suggestions[k].CopyFrom(Suggestion(items=items))

  # TODO: Add other types of related query-types
  def add_related_query_types(self):
    if self.uttr.query_type != QueryType.CONTAINED_IN:
      return
    k = Suggestion.Type.Name(Suggestion.Type.NL_RELATED_QUERY_TYPE)
    self.config.suggestions[k].CopyFrom(
        Suggestion(items=[
            Suggestion.Item(display_name='Show highest',
                            nl_query=self.orig_query + ' - show highest'),
            Suggestion.Item(display_name='Show lowest',
                            nl_query=self.orig_query + ' - show lowest')
        ]))


#
# May populate config.suggestions based on uttr.
#
# Refer to the Suggestion proto for the different types of suggestions.
#
def add(uttr: Utterance, sv2thing: SV2Thing, config: SubjectPageConfig):
  if not len(uttr.places) == 1 or not uttr.detection:
    return
  builder = SuggestionBuilder(uttr, config)
  builder.add_related_places()
  builder.add_identical_places()
  builder.add_related_vars(sv2thing)
  builder.add_related_query_types()
