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

from dataclasses import dataclass
from typing import List

from server.lib.nl.common import constants
from server.lib.nl.common.utterance import FulfillmentResult
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.utils import compute_final_threshold
from server.lib.nl.detection.utils import get_top_prop_score
from server.lib.nl.detection.utils import get_top_sv_score
from server.lib.nl.explore import params
from shared.lib.constants import SV_SCORE_HIGH_CONFIDENCE_THRESHOLD

#
# List of user messages!
#

LOW_CONFIDENCE_SCORE_MESSAGE = \
  'Low confidence in understanding your query. Displaying the closest results.'
# Message when there are missing places when showing comparison charts
COMPARISON_MISSING_PLACE_MSG = 'Data for "{missing_places}" is currently unavailable. See the following statistics on the other places.'


def place_from_context(u: Utterance) -> str:
  return f'See relevant statistics{_ctx("for", u.past_source_context)} based on the previous query.'


def topic_from_context(_) -> str:
  return 'See relevant statistics based on the previous query.'


def entity_from_context(u: Utterance) -> str:
  seen_entities = set()
  entity_names = []
  for e in u.entities:
    if e.name.lower() in seen_entities:
      continue
    seen_entities.add(e.name.lower())
    entity_names.append(e.name)

  return f'See relevant information for {_name_list_as_string(entity_names)} based on the previous query.'


def prop_from_context(_) -> str:
  return 'See relevant information based on the previous query.'


def cmp_places_from_context(_) -> str:
  return 'See comparisons based on places in the previous query.'


def cmp_places_from_answer(_) -> str:
  return 'See comparison based on places in the previous answer.'


def cmp_places_and_topic_from_context(u: Utterance) -> str:
  place_str = _name_list_as_string([p.name for p in u.places])
  if not place_str:
    return ''
  return f'See comparisons with {place_str} based on the previous query.'


def unknown_topic(u: Utterance) -> str:
  if not u.places:
    return ''
  place_str = u.places[0].name

  if params.is_special_dc(u.insight_ctx):
    return 'Could not recognize any topic from the query.'

  return f'Could not recognize any topic from the query. See available topic categories for {place_str}.'


def nodata_topic(u: Utterance) -> str:
  if not u.places:
    return ''
  place_str = u.places[0].name

  if params.is_special_dc(u.insight_ctx):
    return f'Sorry, there were no relevant statistics about the topic for {place_str}.'

  return 'Sorry, there were no relevant statistics about the topic for ' \
          f'{place_str}. See available topic categories with statistics for {place_str}.'


def default_place(u: Utterance) -> str:
  if not u.places:
    return ''
  return f'Could not recognize any place in the query. See relevant statistics for {u.places[0].name}.'


def fallback_place(u: Utterance) -> str:
  if not u.place_fallback:
    return ''
  oldstr = u.place_fallback.origStr
  newstr = u.place_fallback.newStr
  if oldstr == newstr:
    return ''
  return f'Sorry, there were no relevant statistics for {oldstr}. See results for {newstr}.'


@dataclass
class UserMessage:
  msg_list: List[str]
  show_form: bool = False


#
# Return a user-message if this response involve stuff like
# context lookup, default place or fallback.
#
def user_message(uttr: Utterance) -> UserMessage:
  callback = None
  show_form = False

  if uttr.place_fallback:
    callback = fallback_place
  else:
    if uttr.sv_source == FulfillmentResult.UNFULFILLED:
      callback = nodata_topic
      show_form = True
    elif uttr.sv_source == FulfillmentResult.UNRECOGNIZED:
      callback = unknown_topic
      show_form = True
    elif uttr.place_source == FulfillmentResult.PARTIAL_PAST_QUERY:
      if uttr.sv_source == FulfillmentResult.PAST_QUERY:
        callback = cmp_places_and_topic_from_context
      else:
        callback = cmp_places_from_context
    elif uttr.place_source == FulfillmentResult.PAST_ANSWER:
      callback = cmp_places_from_answer
    elif uttr.place_source == FulfillmentResult.PAST_QUERY and uttr.sv_source == FulfillmentResult.CURRENT_QUERY:
      callback = place_from_context
    elif uttr.place_source == FulfillmentResult.CURRENT_QUERY and uttr.sv_source == FulfillmentResult.PAST_QUERY:
      callback = topic_from_context
    elif uttr.place_source == FulfillmentResult.PAST_QUERY and uttr.sv_source == FulfillmentResult.PAST_QUERY:
      callback = place_from_context
    elif uttr.place_source == FulfillmentResult.DEFAULT and uttr.past_source_context != constants.EARTH.name:
      callback = default_place
    elif uttr.entities_source == FulfillmentResult.PAST_QUERY and uttr.properties_source == FulfillmentResult.CURRENT_QUERY:
      callback = entity_from_context
    elif uttr.entities_source == FulfillmentResult.CURRENT_QUERY and uttr.properties_source == FulfillmentResult.PAST_QUERY:
      callback = prop_from_context

  msg_list = []

  # NOTE: Showing multiple messages can be confusing.  So if the SV score is low
  # prefer showing that, since we say our confidence is low...

  # If the score is below this, then we report low confidence
  # (we reuse the threshold we use for determining something
  #  is "high confidence")
  low_confidence_score_report_threshold = compute_final_threshold(
      uttr.detection.svs_detected.model_threshold,
      SV_SCORE_HIGH_CONFIDENCE_THRESHOLD)

  # Get top variable score either from the detected props or svs depending on
  # what is being shown in the first chart
  top_variable_score = None
  if uttr.rankedCharts:
    if uttr.rankedCharts[0].svs and (
        uttr.sv_source == FulfillmentResult.CURRENT_QUERY or
        uttr.sv_source == FulfillmentResult.PARTIAL_PAST_QUERY):
      top_variable_score = get_top_sv_score(uttr.detection,
                                            uttr.rankedCharts[0])
    elif uttr.rankedCharts[
        0].props and uttr.properties_source == FulfillmentResult.CURRENT_QUERY:
      top_variable_score = get_top_prop_score(uttr.detection,
                                              uttr.rankedCharts[0])

  if (top_variable_score and
      (top_variable_score < low_confidence_score_report_threshold)):
    # We're showing charts for SVs in the current user query and the
    # top-score is below the threshold, so report message.
    msg_list.append(LOW_CONFIDENCE_SCORE_MESSAGE)
  elif callback:
    msg_list.append(callback(uttr))

  return UserMessage(msg_list=msg_list, show_form=show_form)


def _ctx(connector: str, ctx: str) -> str:
  if ctx:
    return " " + connector + " " + ctx
  return ""


def _name_list_as_string(names: List[str]) -> str:
  names_str = ''
  for idx, n in enumerate(names):
    conn = ''
    if idx > 0 and idx == len(names) - 1:
      conn = ' and '
    elif idx > 0:
      conn = ', '
    names_str += conn + n

  return names_str
