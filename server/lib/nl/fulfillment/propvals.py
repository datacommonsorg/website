# Copyright 2024 Google LLC
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

from server.lib.fetch import property_values
from server.lib.fetch import triples
from server.lib.nl.common.utterance import ChartOriginType
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import EntityPvConfig
from server.lib.nl.fulfillment.types import Place
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.types import Property
from server.lib.nl.fulfillment.types import PropertyValue
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

#
# Handler for Entity propval queries.
#

_SINGLE_ENTITY_SINGLE_PV_MULTI_VAL_TITLE = 'The {property}s for {entity} are:'
_SINGLE_ENTITY_SINGLE_PV_SINGLE_VAL_TITLE = 'The {property} for {entity} is:'


def _get_single_entity_single_pv_title(property_name: str, entity_name: str,
                                       num_vals: int) -> str:
  title_format_str = _SINGLE_ENTITY_SINGLE_PV_MULTI_VAL_TITLE if num_vals > 1 else _SINGLE_ENTITY_SINGLE_PV_SINGLE_VAL_TITLE
  return title_format_str.format(property=property_name, entity=entity_name)


def populate(uttr: nl_uttr.Utterance) -> bool:
  if not uttr.entities:
    uttr.counters.err('propvals_failed_noentities', 1)

  # Only handling a single entity for now.
  entity = uttr.entities[0]
  entity_triples = triples([entity.dcid]).get(entity.dcid, {})
  for sv in uttr.svs:
    if len(entity_triples.get(sv, [])) > 0:
      property_values = [
          PropertyValue(name=val.get('name', ''),
                        dcid=val.get('dcid', ''),
                        value=val.get('value', ''),
                        provenanceId=val.get('provenanceId', ''),
                        types=val.get('types', []))
          for val in entity_triples[sv]
      ]
      title = _get_single_entity_single_pv_title(sv, entity.name or entity.dcid,
                                                 len(property_values))
      uttr.entityPvConfig = EntityPvConfig(
          entities=[entity],
          properties=[Property(dcid=sv, name=sv)],
          propertyValues={entity.dcid: {
              sv: property_values
          }},
          title=title)
      # Only handling a single pv for now, so return once a pv is found.
      return True
  uttr.counters.err('propvals_failed_noprops', 1)
  return False
