# Copyright 2022 Google LLC
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

import collections
import json
import logging
import urllib.parse

from flask import Blueprint
from flask import current_app
from flask import escape
from flask import g
from flask import request
from flask import Response
from flask import url_for
from flask_babel import gettext

from server.cache import cache
import server.lib.i18n as i18n
from server.routes.api.shared import names
import server.routes.api.shared as shared_api
from server.services.datacommons import fetch_data
import server.services.datacommons as dc

CHILD_PLACE_LIMIT = 50

# Place types to keep for list of child places, keyed by parent place type.
WANTED_PLACE_TYPES = {
    'Place': ["Continent"],
    'Country': [
        "State", "EurostatNUTS1", "EurostatNUTS2", "AdministrativeArea1"
    ],
    'State': ["County", "AdministrativeArea2"],
    'County': ["City", "Town", "Village", "Borough"],
}
ALL_WANTED_PLACE_TYPES = [
    "Continent", "Country", "State", "County", "City", "Town", "Village",
    "Borough", "CensusZipCodeTabulationArea", "EurostatNUTS1", "EurostatNUTS2",
    "EurostatNUTS3", "AdministrativeArea1", "AdministrativeArea2",
    "AdministrativeArea3", "AdministrativeArea4", "AdministrativeArea5"
]

# These place types are equivalent: prefer the key.
EQUIVALENT_PLACE_TYPES = {
    "Country": "AdministrativeArea1",
    "State": "AdministrativeArea1",
    "County": "AdministrativeArea2",
    "City": "AdministrativeArea3",
    "Town": "City",
    "Borough": "City",
    "Village": "City",
}

# Some India cities have limited data, override to show the corresponding district page.
PLACE_OVERRIDE = {
    "wikidataId/Q1156": "wikidataId/Q2341660",
    "wikidataId/Q987": "wikidataId/Q1353",
    "wikidataId/Q1355": "wikidataId/Q806463",
    "wikidataId/Q1361": "wikidataId/Q15340",
    "wikidataId/Q1070": "wikidataId/Q401686",
    "wikidataId/Q1352": "wikidataId/Q15116",
    "wikidataId/Q1348": "wikidataId/Q2088496",
    "wikidataId/Q4629": "wikidataId/Q1797317",
    "wikidataId/Q1538": "wikidataId/Q1797336",
    "wikidataId/Q66485": "wikidataId/Q1134781",
    "wikidataId/Q47916": "wikidataId/Q1773416",
    "wikidataId/Q66568": "wikidataId/Q2089152",
    "wikidataId/Q1513": "wikidataId/Q1797367",
    "wikidataId/Q66616": "wikidataId/Q742938",
    "wikidataId/Q207749": "wikidataId/Q943099",
    "wikidataId/Q80989": "wikidataId/Q1797245",
    "wikidataId/Q200016": "wikidataId/Q15394",
    "wikidataId/Q80484": "wikidataId/Q100077",
    "wikidataId/Q11909": "wikidataId/Q578285",
    "wikidataId/Q207098": "wikidataId/Q1773444",
    "wikidataId/Q200123": "wikidataId/Q172482",
    "wikidataId/Q42941": "wikidataId/Q606343",
    "wikidataId/Q200235": "wikidataId/Q1797269",
    "wikidataId/Q174461": "wikidataId/Q1947380",
    "wikidataId/Q200663": "wikidataId/Q2086173",
    "wikidataId/Q200237": "wikidataId/Q1764627",
    "wikidataId/Q11854": "wikidataId/Q1815245",
    "wikidataId/Q79980": "wikidataId/Q1321140",
    "wikidataId/Q170115": "wikidataId/Q1506029",
    "wikidataId/Q200713": "wikidataId/Q592942",
    "wikidataId/Q244159": "wikidataId/Q2240791",
    "wikidataId/Q48403": "wikidataId/Q202822",
    "wikidataId/Q162442": "wikidataId/Q1773426",
    "wikidataId/Q205697": "wikidataId/Q1478937",
    "wikidataId/Q158467": "wikidataId/Q2085310",
    "wikidataId/Q200878": "wikidataId/Q632093",
    "wikidataId/Q9885": "wikidataId/Q15136",
    "wikidataId/Q200019": "wikidataId/Q1434965",
    "wikidataId/Q228405": "wikidataId/Q15184",
    "wikidataId/Q372773": "wikidataId/Q2295914",
    "wikidataId/Q207754": "wikidataId/Q15201",
    "wikidataId/Q41496": "wikidataId/Q15194",
    "wikidataId/Q281796": "wikidataId/Q2981389",
}

STATE_EQUIVALENTS = {"State", "AdministrativeArea1"}
US_ISO_CODE_PREFIX = 'US'
ENGLISH_LANG = 'en'
EARTH_DCID = "Earth"
PERSON_COUNT_LIMIT = 1000
POPULATION_DCID = "Count_Person"

# Define blueprint
bp = Blueprint("api_place", __name__, url_prefix='/api/place')


def get_place_types(place_dcids):
  place_types = dc.property_values(place_dcids, 'typeOf')
  ret = {}
  for dcid in place_dcids:
    # We prefer to use specific type like "State", "County" over
    # "AdministrativeArea"
    chosen_type = ''
    for place_type in place_types[dcid]:
      if not chosen_type or chosen_type.startswith('AdministrativeArea') \
              or chosen_type == 'Place':
        chosen_type = place_type
    ret[escape(dcid)] = chosen_type
  return ret


@bp.route('/type/<path:place_dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_place_type(place_dcid):
  return get_place_types([place_dcid])[place_dcid]


@bp.route('/name', methods=['GET', 'POST'])
def api_name():
  """Get place names."""
  dcids = request.args.getlist('dcids')
  if not dcids:
    dcids = request.json['dcids']
  dcids = list(filter(lambda d: d != '', dcids))
  try:
    return names(dcids)
  except Exception as e:
    logging.error(e)
    return 'error fetching names for the given places', 400


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def cached_i18n_name(dcids, locale, should_resolve_all):
  """Returns localization names for set of dcids.

  Args:
      dcids: ^ separated string of dcids. It must be a single string for the cache.
      locale: the desired localization language code.
      should_resolve_all: True if every dcid should be returned with a
                          name, False if only i18n names should be filled

  Returns:
      A dictionary of place names, keyed by dcid (potentially sparse if should_resolve_all=False)
  """
  if not dcids:
    return {}
  dcids = dcids.split('^')
  response = fetch_data('/node/property-values', {
      'dcids': dcids,
      'property': 'nameWithLanguage',
      'direction': 'out'
  },
                        compress=False,
                        post=True)
  result = {}
  dcids_default_name = []
  locales = i18n.locale_choices(locale)
  for dcid in dcids:
    values = response[dcid].get('out')
    # If there is no nameWithLanguage for this dcid, fall back to name.
    if not values:
      dcids_default_name.append(dcid)
      continue
    result[dcid] = ''
    for locale in locales:
      for entry in values:
        if has_locale_name(entry, locale):
          result[dcid] = extract_locale_name(entry, locale)
          break
      if result[dcid]:
        break
  if dcids_default_name:
    if should_resolve_all:
      default_names = names(dcids_default_name)
    else:
      default_names = {}
    for dcid in dcids_default_name:
      result[dcid] = default_names.get(dcid, '')
  return result


def has_locale_name(entry, locale):
  return entry['value'].endswith('@' + locale.lower())


def extract_locale_name(entry, locale):
  if entry['value'].endswith('@' + locale.lower()):
    locale_index = len(entry['value']) - len(locale) - 1
    return entry['value'][:locale_index]
  else:
    return ''


def get_i18n_name(dcids, should_resolve_all=True):
  """Returns localization names for set of dcids.

  Args:
      dcids: A list of place dcids.
      should_resolve_all: True if every dcid should be returned with a
                          name, False if only i18n names should be filled

  Returns:
      A dictionary of place names, keyed by dcid (potentially sparse if should_resolve_all=False)
  """
  return cached_i18n_name('^'.join((sorted(dcids))), g.locale,
                          should_resolve_all)


@bp.route('/name/i18n')
def api_i18n_name():
  """Get place i18n names."""
  dcids = request.args.getlist('dcid')
  result = get_i18n_name(dcids)
  return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/named_typed')
def get_named_typed_place():
  """Returns data for NamedTypedPlace, a dictionary of key -> NamedTypedPlace."""
  dcids = request.args.getlist('dcids')
  place_types = get_place_types(dcids)
  place_names = names(dcids)
  ret = {}
  for dcid in dcids:
    dcid = escape(dcid)
    ret[dcid] = {
        'dcid': escape(dcid),
        'name': place_names[dcid],
        'types': place_types[dcid]
    }
  return Response(json.dumps(ret), 200, mimetype='application/json')


@bp.route('/statsvars/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def statsvars_route(dcid):
  """Get all the statistical variables that exist for a give place.
  Args:
    dcid: Place dcid.
  Returns:
    A list of statistical variable dcids.
  """
  return Response(json.dumps(dc.get_variables(dcid)),
                  200,
                  mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_stat_vars_union(places, stat_vars):
  """Get all the statistical variable dcids for some places.

  Args:
      places: Place DCIDs separated by "^" as a single string.
      stat_vars: list of stat var dcids.

  Returns:
      List of unique statistical variable dcids each as a string.
  """
  places = places.split("^")
  # The two indexings are due to how protobuf fields are converted to json
  return fetch_data('/v1/place/stat-vars/union', {
      'dcids': places,
      'statVars': stat_vars,
  },
                    compress=False,
                    post=True,
                    has_payload=False).get('statVars', [])


@bp.route('/stat-vars/union', methods=['POST'])
def get_stat_vars_union_route():
  """Get all the statistical variables that exist for some places.

  Returns:
      List of unique statistical variable dcids each as a string.
  """
  dcids = sorted(request.json.get('dcids', []))
  stat_vars = (request.json.get('statVars', []))

  return Response(json.dumps(get_stat_vars_union("^".join(dcids), stat_vars)),
                  200,
                  mimetype='application/json')


@bp.route('/child/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def child(dcid):
  """Get top child places for a place."""
  child_places = child_fetch(dcid)
  for place_type in child_places:
    child_places[place_type].sort(key=lambda x: x['pop'], reverse=True)
    child_places[place_type] = child_places[place_type][:CHILD_PLACE_LIMIT]
  return Response(json.dumps(child_places), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def child_fetch(parent_dcid):
  # Get contained places
  contained_response = dc.property_values([parent_dcid], 'containedInPlace',
                                          False)
  place_dcids = contained_response.get(parent_dcid, [])

  overlaps_response = dc.property_values([parent_dcid], 'geoOverlaps', False)
  place_dcids = place_dcids + overlaps_response.get(parent_dcid, [])

  # Filter by wanted place types
  place_type = get_place_type(parent_dcid)
  wanted_types = WANTED_PLACE_TYPES.get(place_type, ALL_WANTED_PLACE_TYPES)

  place_types = dc.property_values(place_dcids, 'typeOf', True)
  wanted_dcids = set()
  for dcid, types in place_types.items():
    for t in types:
      if t in wanted_types:
        wanted_dcids.add(dcid)
        continue
  wanted_dcids = list(wanted_dcids)

  # Fetch population of child places
  pop = {}
  obs = dc.obs_point(wanted_dcids, [POPULATION_DCID])
  obs = obs.get('observationsByVariable', [])
  if obs and obs[0]['variable'] == POPULATION_DCID:
    obs = obs[0].get('observationsByEntity', [])
    for p in obs:
      v = p.get('pointsByFacet', [])
      if v:
        pop[p['entity']] = v[0]['value']

  # Build return object
  place_names = dc.property_values(wanted_dcids, 'name', True)
  result = collections.defaultdict(list)
  for place_dcid in wanted_dcids:
    for place_type in place_types[place_dcid]:
      place_pop = pop.get(place_dcid, 0)
      if place_pop > 0 or parent_dcid == 'Earth':  # Continents do not have population
        place_name = place_names.get(place_dcid, place_dcid)
        result[place_type].append({
            'name': place_name[0] if len(place_name) > 0 else place_name,
            'dcid': place_dcid,
            'pop': place_pop,
        })

  # Filter equivalent place types - if a child place occurs in multiple groups, keep it in the preferred group type.
  for (preferred, equivalent) in EQUIVALENT_PLACE_TYPES.items():
    if preferred in result and equivalent in result:
      for preferred_place in result[preferred]:
        for i, equivalent_place in enumerate(result[equivalent]):
          if preferred_place['dcid'] == equivalent_place['dcid']:
            del result[equivalent][i]
            break

  # Drop empty categories
  result = dict(filter(lambda x: len(x[1]) > 0, result.items()))
  return result


@bp.route('/parent/<path:dcid>')
def api_parent_places(dcid):
  result = parent_places(dcid)[dcid]
  return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def parent_places(dcids):
  """ Get the parent place chain for a list of places.

  Args:
      dcids: ^ separated string of dcids. It must be a single string for the cache.

  Returns:
      A dictionary of lists of parent places, keyed by dcid.
  """
  # In DataCommons knowledge graph, places has multiple containedInPlace
  # relation with parent places, but it might not be comprehensive. For
  # example, "Mountain View" is containedInPlace for "Santa Clara County" and
  # "California" but not "United States":
  # https://datacommons.org/browser/geoId/0649670
  # Here calling get_parent_place twice to get to the top parents.
  if not dcids:
    return {}

  result = {}
  parents1 = get_parent_place(dcids)
  dcids = dcids.split('^')
  dcid_parents1_mapping = {}
  for dcid in dcids:
    first_parents = parents1[dcid]
    result[dcid] = first_parents
    if first_parents:
      dcid_parents1_mapping[dcid] = first_parents[-1]['dcid']
  if not dcid_parents1_mapping:
    return result

  parents2 = get_parent_place('^'.join(dcid_parents1_mapping.values()))
  dcid_parents2_mapping = {}
  for dcid in dcid_parents1_mapping.keys():
    second_parents = parents2[dcid_parents1_mapping[dcid]]
    result[dcid].extend(second_parents)
    if second_parents:
      dcid_parents2_mapping[dcid] = second_parents[-1]['dcid']
  if not dcid_parents2_mapping:
    return result

  parents3 = get_parent_place('^'.join(dcid_parents2_mapping.values()))
  for dcid in dcid_parents2_mapping.keys():
    result[dcid].extend(parents3[dcid_parents2_mapping[dcid]])
    result[dcid] = [x for x in result[dcid] if x['dcid'] != 'Earth']
  return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_parent_place(dcids):
  """ Get containedInPlace for each place in a list of places

  Args:
      dcids: ^ separated string of dcids. It must be a single string for the cache.

  Returns:
      A dictionary of lists of containedInPlace, keyed by dcid.
  """
  if dcids:
    dcids = dcids.split('^')
  else:
    dcids = []
  response = fetch_data('/node/property-values', {
      'dcids': dcids,
      'property': 'containedInPlace',
      'direction': 'out'
  },
                        compress=False,
                        post=True)
  result = {}
  for dcid in dcids:
    parents = response[dcid].get('out', [])
    parents.sort(key=lambda x: x['dcid'], reverse=True)
    for i in range(len(parents)):
      if len(parents[i]['types']) > 1:
        parents[i]['types'] = [
            x for x in parents[i]['types']
            if not x.startswith('AdministrativeArea')
        ]
    result[dcid] = parents
  return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/mapinfo/<path:dcid>')
def api_mapinfo(dcid):
  """
  TODO(wsws/boxu): This function only works for the US, which doesn't have
  the issue of crossing +-180 longitude and +-90 latitude. If using this
  function for places with those complicated situations, need to adjust this
  function accordingly.
  """
  left = 180
  right = -180
  up = -90
  down = 90
  coordinate_sequence_set = []
  kmlCoordinates = dc.property_values([dcid], 'kmlCoordinates')[dcid]
  if not kmlCoordinates:
    return {}

  coordinate_groups = kmlCoordinates[0].split('</coordinates><coordinates>')
  for coordinate_group in coordinate_groups:
    coordinates = coordinate_group.replace('<coordinates>',
                                           '').replace('</coordinates>',
                                                       '').split(' ')
    coordinate_sequence = []
    for coordinate in coordinates:
      v = coordinate.split(',')
      x = float(v[0])
      y = float(v[1])
      left = min(left, x)
      right = max(right, x)
      down = min(down, y)
      up = max(up, y)
      coordinate_sequence.append({'lat': y, 'lng': x})
    coordinate_sequence_set.append(coordinate_sequence)

  x_spread = right - left
  y_spread = up - down
  margin = 0.02

  result = {
      'left': left - margin * x_spread,
      'right': right + margin * x_spread,
      'up': up + margin * y_spread,
      'down': down - margin * y_spread,
      'coordinateSequenceSet': coordinate_sequence_set
  }
  return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_related_place(dcid,
                      stat_vars_string,
                      within_place=None,
                      is_per_capita=None):
  stat_vars = stat_vars_string.split('^')
  return dc.get_related_place(dcid,
                              stat_vars,
                              within_place=within_place,
                              is_per_capita=is_per_capita)


def get_ranking_url(containing_dcid,
                    place_type,
                    stat_var,
                    highlight_dcid,
                    is_per_capita=False):
  url = url_for(
      'ranking.ranking',
      stat_var=stat_var,
      place_type=place_type,
      place_dcid=containing_dcid,
      h=highlight_dcid,
  )
  if is_per_capita:
    url = url + "&pc"
  return url


@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
@bp.route('/ranking/<path:dcid>')
def api_ranking(dcid):
  """Get the ranking information for a given place."""
  current_place_type = get_place_type(dcid)
  parents = parent_places(dcid)[dcid]
  parents_str = '^'.join(sorted(map(lambda x: x['dcid'], parents)))
  parent_i18n_names = cached_i18n_name(parents_str, g.locale, False)

  selected_parents = []
  parent_names = {}
  for parent in parents:
    parent_dcid = parent['dcid']
    parent_type = parent['types'][0]
    if parent_type not in WANTED_PLACE_TYPES:
      continue
    if parent_dcid.startswith('zip'):
      continue
    selected_parents.append(parent_dcid)
    i18n_name = parent_i18n_names[parent_dcid]
    parent_names[parent_dcid] = i18n_name if i18n_name else parent.get(
        'name', "")
    if len(selected_parents) == 3:
      break
  result = collections.defaultdict(list)

  # Contains statistical variable and the display name used for place rankings.
  ranking_stats = {
      # TRANSLATORS: Label for rankings of places by size of population (sorted from highest to lowest).
      'Count_Person': gettext('Largest Population'),
      # TRANSLATORS: Label for rankings of median individual income (sorted from highest to lowest).
      'Median_Income_Person': gettext('Highest Median Income'),
      # TRANSLATORS: Label for rankings of places by the median age of it's population (sorted from highest to lowest).
      'Median_Age_Person': gettext('Highest Median Age'),
      # TRANSLATORS: Label for rankings of places by the unemployment rate of it's population (sorted from highest to lowest).
      'UnemploymentRate_Person': gettext('Highest Unemployment Rate'),
  }
  # Crime stats var is separted from RANKING_STATS as it uses perCapita
  # option.
  # TOOD(shifucun): merge this once https://github.com/datacommonsorg/mixer/issues/262 is fixed.
  crime_statsvar = {
      # TRANSLATORS: Label for rankings of places by the number of combined criminal activities, per capita (sorted from highest to lowest).
      'Count_CriminalActivities_CombinedCrime':
          gettext('Highest Crime Per Capita')
  }
  for parent_dcid in selected_parents:
    stat_vars_string = '^'.join(ranking_stats.keys())
    response = get_related_place(dcid,
                                 stat_vars_string,
                                 within_place=parent_dcid)
    for stat_var, data in response.get('data', {}).items():
      result[ranking_stats[stat_var]].append({
          'name':
              parent_names[parent_dcid],
          'data':
              data,
          'rankingUrl':
              get_ranking_url(parent_dcid, current_place_type, stat_var, dcid)
      })
    response = get_related_place(dcid,
                                 '^'.join(crime_statsvar.keys()),
                                 within_place=parent_dcid,
                                 is_per_capita=True)
    for stat_var, data in response.get('data', {}).items():
      result[crime_statsvar[stat_var]].append({
          'name':
              parent_names[parent_dcid],
          'data':
              data,
          'rankingUrl':
              get_ranking_url(parent_dcid,
                              current_place_type,
                              stat_var,
                              dcid,
                              is_per_capita=True)
      })

  all_labels = list(ranking_stats.values()) + \
      list(crime_statsvar.values())
  for label in all_labels:
    if label in result:
      result[label] = [x for x in result[label] if 'data' in x]
  result['label'] = [x for x in all_labels if x in result]
  return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_state_code(dcids):
  """Get state codes for a list of places that are state equivalents

  Args:
      dcids: ^ separated string of dcids of places that are state equivalents

  Returns:
      A dictionary of state codes, keyed by dcid
  """
  result = {}
  if not dcids:
    return result
  dcids = dcids.split('^')
  iso_codes = dc.property_values(dcids, 'isoCode')

  for dcid in dcids:
    state_code = None
    iso_code = iso_codes[dcid]
    if iso_code:
      split_iso_code = iso_code[0].split("-")
      if len(split_iso_code) > 1 and split_iso_code[0] == US_ISO_CODE_PREFIX:
        state_code = split_iso_code[1]
    result[dcid] = state_code

  return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_display_name(dcids, locale="en"):
  """ Get display names for a list of places.

  Display name is place name with state code if it has a parent place that is a state.

  Args:
      dcids: ^ separated string of dcids. It must be a single string for the cache.
      locale: the desired localization language code.

  Returns:
      A dictionary of display names, keyed by dcid.
  """
  place_names = cached_i18n_name(dcids, locale, True)
  parents = parent_places(dcids)
  dcids = dcids.split('^')
  result = {}
  dcid_state_mapping = {}
  for dcid in dcids:
    if not dcid:
      continue
    for parent_place in parents[dcid]:
      parent_dcid = parent_place['dcid']
      place_types = parent_place['types']
      for place_type in place_types:
        if place_type in STATE_EQUIVALENTS:
          dcid_state_mapping[dcid] = parent_dcid
          break
    result[dcid] = place_names[dcid]

  states_lookup = '^'.join(sorted(set(dcid_state_mapping.values())))
  if locale == "en":
    state_codes = get_state_code(states_lookup)
  else:
    state_codes = cached_i18n_name(states_lookup, locale, True)
  for dcid in dcid_state_mapping.keys():
    state_code = state_codes[dcid_state_mapping[dcid]]
    if state_code:
      result[dcid] = result[dcid] + ', ' + state_code
  return result


@bp.route('/displayname', methods=['GET', 'POST'])
def api_display_name():
  """Get display names for a list of places."""
  dcids = request.args.getlist('dcids')
  if not dcids:
    dcids = request.json.get('dcids', [])
  result = get_display_name('^'.join((sorted(dcids))), g.locale)
  return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/places-in')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_places_in():
  """Gets DCIDs of places of a certain type contained in some places.

  Sends the request to the Data Commons "/node/places-in" API.
  See https://docs.datacommons.org/api/rest/place_in.html.

  Returns:
      Dict keyed by parent DCIDs with lists of child place DCIDs as values.
  """
  dcids = request.args.getlist("dcid")
  place_type = request.args.get("placeType")
  return Response(json.dumps(dc.get_places_in(dcids, place_type)),
                  200,
                  mimetype='application/json')


@bp.route('/places-in-names')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_places_in_names():
  """Gets names of places of a certain type contained in a place.

  Returns:
      Dicts keyed by child place DCIDs with their names as values.
  """
  dcid = request.args.get("dcid")
  place_type = request.args.get("placeType")
  child_places = dc.get_places_in([dcid], place_type)[dcid]
  return Response(json.dumps(get_display_name('^'.join(child_places))),
                  200,
                  mimetype='application/json')


@bp.route('/placeid2dcid')
def placeid2dcid():
  """API endpoint to get dcid based on place id.

  This is to use together with the Google Maps Autocomplete API:
  https://developers.google.com/places/web-service/autocomplete.
  """
  place_ids = request.args.getlist("placeIds")
  resp = dc.resolve_id(place_ids, "placeId", "dcid")
  entities = resp.get('entities', [])
  result = {}
  for entity in entities:
    inId = entity.get('inId', "")
    outIds = entity.get('outIds', [])
    if outIds and inId:
      dcid = outIds[0]
      if dcid in PLACE_OVERRIDE:
        dcid = PLACE_OVERRIDE[dcid]
      result[inId] = dcid
  return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/coords2places')
def coords2places():
  """API endpoint to get place name and dcid based on latitude/longitude
      coordinates and the place type to retrieve.

    Assume that the latitude/longitude at the same list index is a coordinate.

    Returns a list of { latitude: number, longitude: number, placeDcid: str, placeName: str } objects.
  """
  latitudes = request.args.getlist("latitudes")
  longitudes = request.args.getlist("longitudes")
  place_type = request.args.get("placeType", "")
  # Get resolved place coordinate information for each coordinate of interest
  coordinates = []
  for idx in range(0, min(len(latitudes), len(longitudes))):
    coordinates.append({
        'latitude': latitudes[idx],
        'longitude': longitudes[idx]
    })
  place_coordinates = dc.resolve_coordinates(coordinates).get(
      "placeCoordinates", [])
  # Get the place types for each place dcid in the resolved place coordinates
  dcids_to_get_type = set()
  for place_coord in place_coordinates:
    dcids_to_get_type.update(place_coord.get('placeDcids', []))
  place_types = dc.property_values(list(dcids_to_get_type), 'typeOf')
  # Get the place names for the places that are of the requested place type
  dcids_to_get_name = filter(
      lambda place: place_type in place_types.get(place, []),
      list(dcids_to_get_type))
  place_names = names(list(dcids_to_get_name))
  # Populate results. For each resolved place coordinate, if there is an
  # attached place of the requested place type, add it to the result.
  result = []
  for place_coord in place_coordinates:
    for place in place_coord.get("placeDcids", []):
      if place in place_names:
        place_name = place_names[place]
        if not place_name:
          place_name = place
        result.append({
            'longitude': place_coord.get("longitude"),
            'latitude': place_coord.get("latitude"),
            'placeDcid': place,
            'placeName': place_name
        })
        break
  return Response(json.dumps(result), 200, mimetype='application/json')


@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
@bp.route('/ranking_chart/<path:dcid>')
def api_ranking_chart(dcid):
  """Gets the ranking data (including ranks, placename, value, date, and source) for a given place.

  Return value example:
  {
      "statvar":{
          "date":"2022-03",
          "data":[
              {
                  "rank":1,
                  "value":0.1,
                  "placeDcid":"geoId/06",
                  "placename":"California"
              }
          ],
          "numDataPoints":1,
          "exploreUrl":"/ranking/UnemploymentRate_Person_Rural/State/country/USA?h=geoId/06&unit=%",
          "sources":[
              "https://www.bls.gov/lau/"
          ]
      }
  }
  """
  result = {}
  # Get the parent place.
  if dcid == EARTH_DCID:
    parent_place_dcid = EARTH_DCID
    place_type = "Country"
  else:
    place_type = get_place_type(dcid)
    parent_place_list = parent_places(dcid).get(dcid, [])
    for parent in parent_place_list:
      parent_type_list = parent.get("types", [])
      parent_place_dcid = parent.get("dcid", "")
      if parent_type_list:
        parent_type = parent_type_list[0]
        # All wanted place types plus continent except CensusZipCodeTabulationArea.
        if parent_type == "Continent" or (
            parent_type in ALL_WANTED_PLACE_TYPES and
            parent_type != "CensusZipCodeTabulationArea"):
          break
    # If break is not encountered, return empty result.
    else:
      return Response(json.dumps(result), 200, mimetype='application/json')
  # Read configs and build a dict to map stat vars to dicts of unit and scaling.
  # Consider the configs with single sv but ignore denominators.
  configs = get_ranking_chart_configs()
  config_sv_to_info = {}
  for config in configs:
    stat_vars = config.get("statsVars")
    if not stat_vars:
      continue
    sv = stat_vars[0]
    info = {"scaling": config.get("scaling"), "unit": config.get("unit")}
    config_sv_to_info[sv] = info
  # Get the first stat var of each config.
  stat_vars, _ = shared_api.get_stat_vars(configs)
  # Make sure POPULATION_DCID is included in stat vars.
  if POPULATION_DCID not in stat_vars:
    stat_vars.add(POPULATION_DCID)
  points_response_best = dc.obs_point_within(parent_place_dcid, place_type,
                                             list(stat_vars), "", False)
  sv_data = points_response_best.get("observationsByVariable")
  sv_facets = points_response_best.get("facets")
  if not points_response_best or not sv_data:
    return Response(json.dumps(result), 200, mimetype='application/json')
  # POPULATION_DCID is used to filter out the places with the population less than PERSON_COUNT_LIMIT.
  places_to_rank = set()
  for sv_data_points in sv_data:
    if sv_data_points.get("variable") != POPULATION_DCID:
      continue
    for place_data in sv_data_points.get("observationsByEntity", []):
      place_dcid = place_data.get("entity")
      place_data_points = place_data.get("pointsByFacet")
      if place_data_points:
        value = place_data_points[0].get("value", 0)
        if value > PERSON_COUNT_LIMIT:
          places_to_rank.add(place_dcid)
  # Get all the place names
  place_names = get_i18n_name(list(places_to_rank))
  # Loop through sv_data to build the result data.
  for sv_data_points in sv_data:
    sv = sv_data_points.get("variable")
    if sv not in config_sv_to_info:
      continue
    sources = set()
    dates = set()
    data_points = []
    for place_data in sv_data_points.get("observationsByEntity", []):
      place_dcid = place_data.get("entity")
      if place_dcid not in places_to_rank:
        continue
      # Example of place_data_points: [{"date": "2022", "value": 123, "facet": 123456}].
      place_data_points = place_data.get("pointsByFacet")
      value, date, facet = None, None, None
      if place_data_points:
        place_data_point = place_data_points[0]
        value = place_data_point.get("value")
        date = place_data_point.get("date")
        facet = place_data_point.get("facet")
      # Value is required for the calculation of ranking.
      if value is None:
        continue
      place_name = place_names.get(place_dcid, "")
      data_point = {
          "placeDcid": place_dcid,
          "value": value,
          "placeName": place_name
      }
      data_points.append(data_point)
      if date:
        dates.add(date)
      if facet:
        provenanceUrl = sv_facets.get(str(facet), {}).get("provenanceUrl")
        if provenanceUrl:
          sources.add(provenanceUrl)
    # Build URL for "explore more".
    scaling = config_sv_to_info.get(sv, {}).get("scaling")
    unit = config_sv_to_info.get(sv, {}).get("unit")
    if dcid == EARTH_DCID:
      parent_place_dcid = None
    explore_url = urllib.parse.unquote(
        url_for('ranking.ranking',
                stat_var=sv,
                place_type=place_type,
                place_dcid=parent_place_dcid,
                h=dcid,
                scaling=scaling,
                unit=unit))
    # Calculate the ranking.
    sorted_data_points = sorted(data_points,
                                key=lambda x: x['value'],
                                reverse=True)
    for i, data_point in enumerate(sorted_data_points):
      data_point['rank'] = i + 1
    date_range = shared_api.get_date_range(dates)
    sv_result = {
        "date": date_range,
        "data": sorted_data_points,
        'numDataPoints': len(data_points),
        'exploreUrl': explore_url,
        'sources': sorted(list(sources))
    }
    result[sv] = sv_result
  return Response(json.dumps(result), 200, mimetype='application/json')


def get_ranking_chart_configs():
  """ Gets all the chart configs that have ranking charts.

  Returns:
      List of chart configs that are ranking chart configs.
  """
  chart_config = current_app.config['CHART_CONFIG']
  chart_configs = []
  for config in chart_config:
    if config.get('isRankingChart', False):
      chart_configs.append(config)
  return chart_configs
