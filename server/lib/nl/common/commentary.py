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

from server.lib.nl.common import constants
from server.lib.nl.common.utterance import FulfillmentResult
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.utils import get_top_sv_score

#
# List of user messages!
#

# If the score is below this, then we report low confidence.
LOW_CONFIDENCE_SCORE_REPORT_THRESHOLD = 0.7
LOW_CONFIDENCE_SCORE_MESSAGE = \
  'Have low confidence in understanding your query, but displaying the closest results.'


def place_from_context(u: Utterance) -> str:
  return f'See relevant statistics{_ctx("for", u.past_source_context)} based on the previous query.'


def topic_from_context(_) -> str:
  return 'See relevant statistics based on the previous query.'


def cmp_places_from_context(_) -> str:
  return 'See comparisons based on places in the previous query.'


def cmp_places_from_answer(_) -> str:
  return 'See comparison based on places in the previous answer.'


def cmp_places_and_topic_from_context(u: Utterance) -> str:
  place_str = _places(u)
  if not place_str:
    return ''
  return f'See comparisons with {place_str} based on the previous query.'


def unknown_topic(u: Utterance) -> str:
  if not u.places:
    return ''
  place_str = u.places[0].name
  return f'Could not recognize any topic from the query. See available topic categories for {place_str}.'


def nodata_topic(u: Utterance) -> str:
  if not u.places:
    return ''
  place_str = u.places[0].name
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
  msg: str
  show_form: bool = False


#
# Return a user-message if this response invovle stuff like
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
    elif uttr.place_source == FulfillmentResult.DEFAULT and uttr.past_source_context != constants.EARTH_DCID:
      callback = default_place

  msg = ''

  # NOTE: Showing multiple messages can be confusing.  So if the SV score is low
  # prefer showing that, since we say our confidence is low...

  if (uttr.rankedCharts and
      uttr.sv_source == FulfillmentResult.CURRENT_QUERY and
      get_top_sv_score(uttr.detection) < LOW_CONFIDENCE_SCORE_REPORT_THRESHOLD):
    # We're showing charts for SVs in the current user query and the
    # top-score is below the threshold, so report message.
    msg = LOW_CONFIDENCE_SCORE_MESSAGE
  elif callback:
    msg = callback(uttr)

  return UserMessage(msg=msg, show_form=show_form)


def _ctx(connector: str, ctx: str) -> str:
  if ctx:
    return " " + connector + " " + ctx
  return ""


def _places(u: Utterance) -> str:
  place_str = ''
  for idx, p in enumerate(u.places):
    conn = ''
    if idx > 0 and idx == len(u.places) - 1:
      conn = ' and '
    elif idx > 0:
      conn = ', '
    place_str += conn + p.name

  return place_str
