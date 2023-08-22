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
"""Various heuristic classifiers corresponding to `ClassificationType`.

Each function in this file takes a query and returns an NLClassifier object
if it was able to classify the query with that classification type.
"""

from collections import OrderedDict
import re
from typing import Union

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection import quantity as qty
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ComparisonClassificationAttributes
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import CorrelationClassificationAttributes
from server.lib.nl.detection.types import EventClassificationAttributes
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import GeneralClassificationAttributes
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import RankingClassificationAttributes
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import SizeType
from server.lib.nl.detection.types import SizeTypeClassificationAttributes
from server.lib.nl.detection.types import TimeDeltaClassificationAttributes
from server.lib.nl.detection.types import TimeDeltaType
import shared.lib.constants as constants


# TODO (juliawu): This function shares a lot of structure with the ranking
#                 and time_delta classifiers. Need to refactor for DRYness.
def event(query) -> Union[NLClassifier, None]:
  """Determine if query is a event type.

  Determine if query is referring to fires, floods, droughts, storms, or other
  event type nodes/SVs. Uses heuristics instead of ML-based classification.

  Args:
    query (str): the user's input

  Returns:
    NLClassifier with EventClassificationAttributes
  """
  # make query lowercase for string matching
  query = query.lower()

  # heuristics
  subtype_map = {
      "ExtremeCold": EventType.COLD,
      "Cyclone": EventType.CYCLONE,
      "Earthquake": EventType.EARTHQUAKE,
      "Drought": EventType.DROUGHT,
      "Fire": EventType.FIRE,
      "Flood": EventType.FLOOD,
      "ExtremeHeat": EventType.HEAT,
      "WetBulb": EventType.WETBULB,
  }
  event_heuristics = constants.QUERY_CLASSIFICATION_HEURISTICS["Event"]
  event_subtypes = event_heuristics.keys()

  event_types = []
  all_trigger_words = []

  for subtype in event_subtypes:
    subtype_trigger_words = []

    for keyword in event_heuristics[subtype]:
      # look for keyword surrounded by spaces or start/end delimiters
      regex = r"(^|\W)" + keyword + r"($|\W)"
      subtype_trigger_words += [w.group() for w in re.finditer(regex, query)]

    if len(subtype_trigger_words) > 0:
      event_types.append(subtype_map[subtype])
    all_trigger_words += subtype_trigger_words

  # If no matches, this query is not an event query
  if len(all_trigger_words) == 0:
    return None

  attributes = EventClassificationAttributes(
      event_types=event_types, event_trigger_words=all_trigger_words)
  return NLClassifier(type=ClassificationType.EVENT, attributes=attributes)


def ranking(query) -> Union[NLClassifier, None]:
  """Determine if query is a ranking type.

  Uses heuristics instead of ML-based classification.

  Args:
    query - the user's input as a string

  Returns:
    NLClassifier with RankingClassificationAttributes
  """
  subtype_map = {
      "High": RankingType.HIGH,
      "Low": RankingType.LOW,
      "Best": RankingType.BEST,
      "Worst": RankingType.WORST,
      "Extreme": RankingType.EXTREME,
  }

  # make query lowercase for string matching
  query = query.lower()

  ranking_types = []
  all_trigger_words = []

  for subtype in constants.QUERY_CLASSIFICATION_HEURISTICS["Ranking"].keys():
    type_trigger_words = []

    for keyword in constants.QUERY_CLASSIFICATION_HEURISTICS["Ranking"][
        subtype]:
      regex = r"(^|\W)" + keyword + r"($|\W)"
      type_trigger_words += [w.group() for w in re.finditer(regex, query)]

    if len(type_trigger_words) > 0:
      ranking_types.append(subtype_map[subtype])
    all_trigger_words += type_trigger_words

  # If no matches, this query is not a ranking query
  if len(all_trigger_words) == 0:
    return None

  attributes = RankingClassificationAttributes(
      ranking_type=ranking_types, ranking_trigger_words=all_trigger_words)
  return NLClassifier(type=ClassificationType.RANKING, attributes=attributes)


# TODO(juliawu): This code is similar to the ranking classifier. Extract out
#                helper functions to make more DRY.
def time_delta(query: str) -> Union[NLClassifier, None]:
  """Determine if query is a 'Time-Delta' type.

  Uses heuristics instead of ML-based classification.

  Args:
    query (str): the user's input

  Returns:
    NLClassifier with TimeDeltaClassificationAttributes
  """
  subtype_map = {
      "Increase": TimeDeltaType.INCREASE,
      "Decrease": TimeDeltaType.DECREASE,
  }
  time_delta_heuristics = constants.QUERY_CLASSIFICATION_HEURISTICS["TimeDelta"]
  time_delta_subtypes = time_delta_heuristics.keys()
  query = query.lower()
  subtypes_matched = []
  trigger_words = []
  for subtype in time_delta_subtypes:
    type_trigger_words = []

    for keyword in time_delta_heuristics[subtype]:
      # look for keyword surrounded by spaces or start/end delimiters
      regex = r"(^|\W)" + keyword + r"($|\W)"
      type_trigger_words += [w.group() for w in re.finditer(regex, query)]

    if len(type_trigger_words) > 0:
      subtypes_matched.append(subtype_map[subtype])
    trigger_words += type_trigger_words

  # If no matches, this query is not a time-delta query
  if len(trigger_words) == 0:
    return None

  attributes = TimeDeltaClassificationAttributes(
      time_delta_types=subtypes_matched, time_delta_trigger_words=trigger_words)
  return NLClassifier(type=ClassificationType.TIME_DELTA, attributes=attributes)


# TODO: This code is similar to the ranking and time_delta classifiers.
# Ideally, refactor.
def size_type(query: str) -> Union[NLClassifier, None]:
  """Determine if query is a 'Size-Type' type.

  Uses heuristics instead of ML-based classification.

  Args:
    query (str): the user's input

  Returns:
    NLClassifier with SizeTypeClassificationAttributes
  """
  subtype_map = {
      "Big": SizeType.BIG,
      "Small": SizeType.SMALL,
  }
  size_type_heuristics = constants.QUERY_CLASSIFICATION_HEURISTICS["SizeType"]
  size_type_subtypes = size_type_heuristics.keys()
  query = query.lower()
  subtypes_matched = []
  trigger_words = []
  for subtype in size_type_subtypes:
    type_trigger_words = []

    for keyword in size_type_heuristics[subtype]:
      # look for keyword surrounded by spaces or start/end delimiters
      regex = r"(^|\W)" + keyword + r"($|\W)"
      type_trigger_words += [w.group() for w in re.finditer(regex, query)]

    if len(type_trigger_words) > 0:
      subtypes_matched.append(subtype_map[subtype])
    trigger_words += type_trigger_words

  # If no matches, this query is not a size-type query
  if len(trigger_words) == 0:
    return None

  attributes = SizeTypeClassificationAttributes(
      size_types=subtypes_matched, size_types_trigger_words=trigger_words)
  return NLClassifier(type=ClassificationType.SIZE_TYPE, attributes=attributes)


def comparison(query) -> Union[NLClassifier, None]:
  # make query lowercase for string matching
  query = query.lower()
  comparison_heuristics = constants.QUERY_CLASSIFICATION_HEURISTICS[
      "Comparison"]
  trigger_words = []
  for keyword in comparison_heuristics:
    # look for keyword surrounded by spaces or start/end delimiters
    regex = r"(^|\W)" + keyword + r"($|\W)"
    trigger_words += [w.group() for w in re.finditer(regex, query)]

  # If no matches, this query is not a comparison query
  if not trigger_words:
    return None

  attributes = ComparisonClassificationAttributes(
      comparison_trigger_words=trigger_words)
  return NLClassifier(type=ClassificationType.COMPARISON, attributes=attributes)


def general(query: str, subtype: ClassificationType,
            subtype_name: str) -> Union[NLClassifier, None]:
  """Heuristic-based classifier for general pattern to type."""
  # make query lowercase for string matching
  query = query.lower()
  heuristics = constants.QUERY_CLASSIFICATION_HEURISTICS[subtype_name]
  trigger_words = []
  for keyword in heuristics:
    # look for keyword surrounded by spaces or start/end delimiters
    regex = r"(^|\W)" + keyword + r"($|\W)"
    trigger_words += [w.group() for w in re.finditer(regex, query)]

  # If no matches, this query is not an overview query
  if not trigger_words:
    return None

  attributes = GeneralClassificationAttributes(trigger_words=trigger_words)
  return NLClassifier(type=subtype, attributes=attributes)


def containedin(query: str) -> Union[NLClassifier, None]:

  contained_in_place_type = ContainedInPlaceType.PLACE
  # place_type_to_enum is an OrderedDict.
  place_type_to_enum = OrderedDict({
      "county": ContainedInPlaceType.COUNTY,
      "continent": ContainedInPlaceType.CONTINENT,
      "state": ContainedInPlaceType.STATE,
      "country": ContainedInPlaceType.COUNTRY,
      "city": ContainedInPlaceType.CITY,
      "district": ContainedInPlaceType.DISTRICT,
      "province": ContainedInPlaceType.PROVINCE,
      "department": ContainedInPlaceType.DEPARTMENT,
      "division": ContainedInPlaceType.DIVISION,
      "municipality": ContainedInPlaceType.MUNICIPALITY,
      "parish": ContainedInPlaceType.PARISH,
      "town": ContainedInPlaceType.CITY,
      "zip": ContainedInPlaceType.ZIP,
      "zip code": ContainedInPlaceType.ZIP,
      "tract": ContainedInPlaceType.CENSUS_TRACT,
      "census tract": ContainedInPlaceType.CENSUS_TRACT,
      # Schools.
      "high school": ContainedInPlaceType.HIGH_SCHOOL,
      "middle school": ContainedInPlaceType.MIDDLE_SCHOOL,
      "elementary school": ContainedInPlaceType.ELEMENTARY_SCHOOL,
      "primary school": ContainedInPlaceType.PRIMARY_SCHOOL,
      "public school": ContainedInPlaceType.PUBLIC_SCHOOL,
      "private school": ContainedInPlaceType.PRIVATE_SCHOOL,
      "school": ContainedInPlaceType.SCHOOL,
      # Pick the best type
      "place": ContainedInPlaceType.DEFAULT_TYPE,
      "region": ContainedInPlaceType.DEFAULT_TYPE,
  })

  query = query.lower()
  # Note again that place_type_to_enum is an OrderedDict.
  for place_type, place_enum in place_type_to_enum.items():
    # Match as a word so city won't match electricity.
    if re.search(rf"\b{place_type}\b", query):
      # if place_type in query:
      contained_in_place_type = place_enum
      break

    nospace_place_type = place_type.replace(' ', '')
    plural = constants.PLACE_TYPE_TO_PLURALS.get(nospace_place_type)
    if plural and re.search(rf"\b{plural}\b", query):
      contained_in_place_type = place_enum
      break

  # If place_type is just PLACE, that means no actual type was detected.
  if contained_in_place_type == ContainedInPlaceType.PLACE:
    # Additional keywords to decide whether we should GUESS sub-type
    if "across" in query or "where" in query or "within" in query:
      contained_in_place_type = ContainedInPlaceType.DEFAULT_TYPE
    else:
      return None

  # TODO: need to detect the type of place for this contained in.
  attributes = ContainedInClassificationAttributes(
      contained_in_place_type=contained_in_place_type)
  return NLClassifier(type=ClassificationType.CONTAINED_IN,
                      attributes=attributes)


# TODO (juliawu): add unit testing
def correlation(query: str) -> Union[NLClassifier, None]:
  """Determine if query is asking for a correlation.

  Uses heuristics instead of ML-model for classification.

  Args:
    query: user's input, given as a string

  Returns:
    NLClassifier with CorrelationClassificationAttributes
  """
  query = query.lower()
  matches = []
  for keyword in constants.QUERY_CLASSIFICATION_HEURISTICS["Correlation"]:
    regex = r"(?:^|\W)" + keyword + r"(?:$|\W)"
    matches += [w.group() for w in re.finditer(regex, query)]
  if len(matches) == 0:
    return None
  attributes = CorrelationClassificationAttributes(
      correlation_trigger_words=matches)
  return NLClassifier(type=ClassificationType.CORRELATION,
                      attributes=attributes)


def quantity(query_orig: str, ctr: Counters) -> Union[NLClassifier, None]:
  attributes = qty.parse_quantity(query_orig, ctr)
  if attributes:
    return NLClassifier(type=ClassificationType.QUANTITY, attributes=attributes)
  return None
