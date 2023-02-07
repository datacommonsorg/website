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

#
# Module to build a textual response to the user's query from an Utterance.
#

import logging
import random
from typing import List

from server.lib.nl import detection
from server.lib.nl import topic
from server.lib.nl import utils
from server.lib.nl.constants import EVENT_TYPE_TO_DISPLAY_NAME
from server.lib.nl.detection import ContainedInClassificationAttributes
from server.lib.nl.detection import EventClassificationAttributes
import server.lib.nl.fulfillment.context as ctx
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import Utterance

INFO_SYNONYMS = ["an overview of", "some information about", "some data about"]


# Remove extraneous parts of the stat var name that does not read well in a sentence.
def _strip_sv_name(sv_name: str) -> str:
  ret = sv_name.replace('Number of', '')
  ret = ret.split(' in the ')[-1]
  ret = ret.split(':')[-1]
  ret = ret.split('Percentage of')[-1]
  ret = ret.split('Population of')[-1]
  ret = ret.split('Population With')[-1]
  return ret.strip()


# Joins a list into a phrase, separated by commas and 'and', e.g. "a, b and c".
def _join_list_phrase(l: List[str]) -> str:
  size = len(l)
  ret = ''
  for i, p in enumerate(l):
    punct = ', ' if i < size - 1 and i > 0 else '' if i == 0 else ' and '
    ret += punct + p
  return ret


# If utterance contains an event, returns the display name of the event. If not,
# empty string.
# TODO: pass info using ChartSpec.attr.
def _get_event_description(uttr: Utterance) -> str:
  event_classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.EVENT)
  if event_classification and isinstance(event_classification[0].attributes,
                                         EventClassificationAttributes):
    event_types = event_classification[0].attributes.event_types
    if event_types and EVENT_TYPE_TO_DISPLAY_NAME[event_types[0]]:
      return EVENT_TYPE_TO_DISPLAY_NAME[event_types[0]].lower()
  return ''


# If utterance contains a contained in classification, returns a phrase ' by
# <contained_place_type>'. If not, empty string.
# TODO: pass info using ChartSpec.attr.
def _get_contained_in(uttr: Utterance) -> str:
  if len(uttr.classifications) and isinstance(
      uttr.classifications[0].attributes, ContainedInClassificationAttributes):
    place_type = uttr.classifications[0].attributes.contained_in_place_type
    return ' by ' + place_type.value.lower()
  return ''


# If there are sv's in the utterance, builds a phrase '<sv>, <sv> and more'
# depending on the number of sv's. If not, empty string.
def _get_svs(uttr: Utterance, sv2name) -> str:
  svs = uttr.rankedCharts[0].svs
  logging.info(svs)

  if len(svs) == 0:
    return ''

  sv0 = sv2name[svs[0]]
  if sv0 == svs[0]:
    # Don't use the dcid / event code.
    return ''

  sv0 = _strip_sv_name(sv0)
  if len(svs) == 1:
    return sv0

  sv1 = _strip_sv_name(sv2name[svs[1]])
  if len(svs) == 2:
    return "{sv0} and {sv1}".format(sv0=sv0, sv1=sv1)
  if len(svs) > 2:
    return "{sv0}, {sv1} and more".format(sv0=sv0, sv1=sv1)
  return sv0


# Returns a string to be used as the category description, aka main text response, to the user's query.
def build_category_description(uttr: Utterance, sv2name) -> str:
  first_chart = uttr.rankedCharts[0]
  main_place = first_chart.places[0]
  if first_chart.chart_type == ChartType.PLACE_OVERVIEW:
    parent_places = utils.parent_place_names(main_place.dcid)
    parent_place = ' in ' + ', '.join(sorted(
        parent_places, reverse=True)) if parent_places else ''
    return "{place_name} is a {place_type}{parent_place}. Here is more information about {place_name}.".format(
        place_name=main_place.name,
        place_type=main_place.place_type.lower(),
        parent_place=parent_place)

  desc = ''
  event_desc = _get_event_description(uttr)
  source_topic = first_chart.attr.get('source_topic', None)
  if event_desc:
    desc = event_desc
  elif source_topic:
    desc = topic.get_topic_name(source_topic).lower()
    if desc == 'economy':
      # TODO: Find a better heuristic for this.
      desc = 'the ' + desc

  by = _get_contained_in(uttr)
  place_names = _join_list_phrase([p.name for p in first_chart.places])
  svs = _get_svs(uttr, sv2name)

  if first_chart.attr.get('chart_type', None):
    chart_type = first_chart.attr['chart_type']
    if len(uttr.rankedCharts) > 1 or first_chart.attr['include_percapita']:
      # TODO: Find a more robust pluralization method.
      chart_type_phrase = "are some {chart_type}s".format(chart_type=chart_type)
    else:
      chart_type_phrase = "is a {chart_type}".format(chart_type=chart_type)
    if desc:
      return "Here {chart_type_phrase} about {desc} in {place_name}{by}.".format(
          chart_type_phrase=chart_type_phrase,
          desc=desc.lower(),
          place_name=place_names,
          by=by)
    return "Here {chart_type_phrase} about {svs} in {place_name}{by}.".format(
        chart_type_phrase=chart_type_phrase,
        svs=svs,
        place_name=place_names,
        by=by)
  elif desc:
    if first_chart.svs:
      sv_name = sv2name[first_chart.svs[0]]
      if sv_name != first_chart.svs[0]:
        sv_name = _strip_sv_name(sv_name)
        return "Here is {info_of} {desc} in {place}, including {sv1} and more{by}.".format(
            info_of=random.choice(INFO_SYNONYMS),
            desc=desc.lower(),
            place=place_names,
            sv1=sv_name,
            by=by)
    return "Here is {info_of} {desc} in {place_name}{by}.".format(
        info_of=random.choice(INFO_SYNONYMS),
        desc=desc.lower(),
        place_name=place_names,
        by=by)
  return "Here is {info_of} {svs} in {place_name}{by}.".format(
      info_of=random.choice(INFO_SYNONYMS),
      place_name=place_names,
      svs=svs,
      by=by)
