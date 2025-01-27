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
"""Helper functions for place page routes"""

import copy
import random
import re
from typing import Callable, Dict, List, Set, Tuple

import flask
from flask import current_app
from flask_babel import gettext

from server.lib import fetch
from server.lib.cache import cache
from server.lib.i18n import DEFAULT_LOCALE
from server.routes import TIMEOUT
from server.routes.dev_place.types import BlockConfig
from server.routes.dev_place.types import Category
from server.routes.dev_place.types import Chart
from server.routes.dev_place.types import OverviewTableDataRow
from server.routes.dev_place.types import Place
from server.routes.dev_place.types import ServerBlockMetadata
from server.routes.dev_place.types import ServerChartConfiguration
from server.routes.dev_place.types import ServerChartMetadata
import server.routes.shared_api.place as place_api
from server.services import datacommons as dc

# Parent place types to include in listing of containing places at top of page
PARENT_PLACE_TYPES_TO_HIGHLIGHT = [
    'City',
    'County',
    'AdministrativeArea2',
    'EurostatNUTS2',
    'State',
    'AdministrativeArea1',
    'EurostatNUTS1',
    'Country',
    'Continent',
    'Place',  # World!
]

# Place page categories
ORDERED_TOPICS = [
    "Economics", "Health", "Equity", "Crime", "Education", "Demographics",
    "Housing", "Environment", "Energy"
]
TOPICS = set(ORDERED_TOPICS)
OVERVIEW_CATEGORY = "Overview"
ALLOWED_CATEGORIES = {OVERVIEW_CATEGORY}.union(TOPICS)

PLACE_TYPE_IN_PARENT_PLACES_STR = '%(placeType)s in %(parentPlaces)s'
NEIGHBORING_PLACES_IN_PARENT_PLACE_STR = 'Neighboring %(placeType)s in %(parentPlace)s'

# Variables to include in overview table
PLACE_OVERVIEW_TABLE_VARIABLES: List[Dict[str, str]] = [
    {
        "variable_dcid": "Count_Person",
        "i18n_message_id": "VARIABLE_NAME-Count_Person"
    },
    {
        "variable_dcid": "Median_Income_Person",
        "i18n_message_id": "VARIABLE_NAME-Median_Income_Person"
    },
    {
        "variable_dcid": "Median_Age_Person",
        "i18n_message_id": "VARIABLE_NAME-Median_Age_Person"
    },
    {
        "variable_dcid": "UnemploymentRate_Person",
        "i18n_message_id": "VARIABLE_NAME-UnemploymentRate_Person",
        "unit": "Percent"
    },
]


def get_place_html_link(place_dcid: str, place_name: str) -> str:
  """Get <a href-place page url> tag linking to the place page for a place
  
  Args:
    place_dcid: dcid of the place to get the url for
    place_name: name of the place to use as the link's text
  
  Returns:
    An html anchor tag linking to a place page.
  """
  url = flask.url_for('place.place', place_dcid=place_dcid)
  return f'<a href="{url}">{place_name}</a>'


def get_parent_places(dcid: str) -> List[Place]:
  """Gets the parent places for a given DCID
  
  Args:
    dcid: dcid of the place to get parents for
    
  Returns:
    A list of places that are all the parents of the given DCID.
  """
  parents_resp = place_api.parent_places([dcid], include_admin_areas=True).get(
      dcid, [])
  all_parents = []
  for parent in parents_resp:
    if 'type' in parent and 'name' in parent and 'type' in parent:
      all_parents.append(
          Place(dcid=parent['dcid'],
                name=parent['name'],
                types=[parent['type']]))

  return all_parents


# def get_ordered_parents_to_highlight(all_parents: List[Place]) -> List[Place]:
def get_ordered_by_place_type_to_highlight(places: List[Place]) -> List[Place]:
  """Returns the ordered list of parents to highlight.
  We only consider the types to highlight we favor types that mean more to users (such as State, Country) over entities such as UNGeoRegions, ContinentalUnions etc.
  """
  # Filter places to only the place types to keep
  places_to_include = [
      place for place in places
      if any(place_type in PARENT_PLACE_TYPES_TO_HIGHLIGHT
             for place_type in place.types)
  ]

  # Create a dictionary mapping the place types to their order in the highlight list
  type_order = {
      place_type: i
      for i, place_type in enumerate(PARENT_PLACE_TYPES_TO_HIGHLIGHT)
  }

  # Sort the places_to_include list using the type_order dictionary
  places_to_include.sort(
      key=lambda place: min(type_order.get(t) for t in place.types))

  return places_to_include


def get_place_override(places: List[Place],
                       locale: str = DEFAULT_LOCALE) -> Place | None:
  """Returns the place with the lowest indexed type to highlight"""
  possible_places = get_ordered_by_place_type_to_highlight(places)
  if possible_places:
    # Repeat fetch here in order to get the interationalized name.
    return fetch_place(possible_places[0].dcid, locale=locale)
  return None


def get_place_type_with_parent_places_links(dcid: str) -> str:
  """Get '<place type> in <parent places>' with html links for a given DCID
  
  Args:
    dcid: dcid of the place to get links for
  
  Returns:
    A descriptor of the given place which includes the place's type and links
    to the place pages of its containing places.
  """
  # Get place type in localized, human-readable format
  place_type = place_api.api_place_type(dcid)
  place_type_display_name = place_api.get_place_type_i18n_name(place_type)

  # Get parent places
  all_parents = get_parent_places(dcid)

  # Get parent places
  parents_to_include = get_ordered_by_place_type_to_highlight(all_parents)
  parent_dcids = [parent.dcid for parent in parents_to_include]

  localized_names = place_api.get_i18n_name(parent_dcids)
  places_with_names = [
      parent for parent in parents_to_include
      if parent.dcid in localized_names.keys()
  ]

  # Generate <a href=place page url> tag for each parent place
  links = [
      get_place_html_link(place_dcid=parent.dcid,
                          place_name=localized_names.get(parent.dcid))
      if parent.types != 'Continent' else localized_names.get(parent.dcid)
      for parent in places_with_names
  ]

  if links:
    return gettext('%(placeType)s in %(parentPlaces)s',
                   placeType=place_type_display_name,
                   parentPlaces=', '.join(links))
  return ''


def place_type_to_highlight(place_types: List[str]) -> str | None:
  """Returns the first place type in PARENT_PLACE_TYPES_TO_HIGHLIGHT that is also in place_types.

  Args:
    place_types: A list of place types.

  Returns:
    The first place type in PARENT_PLACE_TYPES_TO_HIGHLIGHT that is also in place_types, or None if no such place type exists.
  """
  if not place_types:
    return None

  for place_type in PARENT_PLACE_TYPES_TO_HIGHLIGHT:
    if place_type in place_types:
      return place_type
  return None


def filter_chart_configs_for_category(
    place_category: str, chart_config: List[ServerChartConfiguration]
) -> List[ServerChartConfiguration]:
  """
  Only returns the appropriate charts for the current category. Note that we do not
  respect the is_overview filter for continents since we do not have continent level data.
  If there is no data in the charts selected for the overview, we will fallback to the complete chart_config.
  """
  if place_category != "Overview":
    return [c for c in chart_config if c.category == place_category]

  original_chart_config = copy.deepcopy(chart_config)
  # Only keep the blocks marked is_overview.
  filtered_chart_config = []
  for server_chart_config in chart_config:
    server_chart_config.blocks = [
        block for block in server_chart_config.blocks if block.is_overview
    ]
    if server_chart_config.blocks:
      filtered_chart_config.append(copy.deepcopy(server_chart_config))

  if not filtered_chart_config:
    # Fallback to entire chart config if there is no data for overview page.
    return original_chart_config

  return filtered_chart_config


@cache.memoize(timeout=TIMEOUT)
def filter_chart_config_by_place_dcid(
    chart_config: List[ServerChartConfiguration],
    place_dcid: str,
    place_type: str,
    child_place_type=str,
    parent_place_dcid=str) -> List[ServerChartConfiguration]:
  """
  Filters the chart configuration to only include charts that have data for a specific place DCID.
  
  Args:
      chart_config (List[Dict]): A list of chart configurations, where each configuration includes statistical variable DCIDs under the key 'variables'.
      place_dcid (str): dcid for the place of interest.

  Returns:
      List[Dict]: A filtered list of chart configurations where at least one statistical variable has data for the specified place.
  """
  # Get a flat list of all statistical variable dcids in the chart config
  current_place_stat_var_dcids = []
  child_places_stat_var_dcids = []
  peer_places_stat_var_dcids = []
  # Look for maps in child place & peer places within parent blocks to perform geo data existence checks.
  found_child_place_map = False
  found_peer_places_map = False
  for config in chart_config:
    needs_child_data = False
    needs_current_place_data = False
    needs_peer_places_data = False

    for block in config.blocks:
      needs_current_place_data |= block.place_scope == "PLACE"
      needs_child_data |= block.place_scope == "CHILD_PLACES"
      needs_peer_places_data |= block.place_scope == "PEER_PLACES_WITHIN_PARENT"
      found_child_place_map |= block.place_scope == "CHILD_PLACES" and any(
          chart.type == "MAP" for chart in block.charts)
      found_peer_places_map |= block.place_scope == "PEER_PLACES_WITHIN_PARENT" and any(
          chart.type == "MAP" for chart in block.charts)

    variables = copy.deepcopy(config.variables)
    if not config.non_dividable:
      if not config.denominator:
        config.denominator = ["Count_Person"]
      variables.extend(config.denominator)

    if needs_child_data:
      child_places_stat_var_dcids.extend(variables)
    if needs_current_place_data:
      current_place_stat_var_dcids.extend(variables)
    if needs_peer_places_data:
      peer_places_stat_var_dcids.extend(variables)

  # Find stat vars that have data for our place dcid
  current_place_obs_point_response = dc.obs_point(
      entities=[place_dcid], variables=current_place_stat_var_dcids)
  current_place_stat_vars_with_observations = set([
      stat_var_dcid for stat_var_dcid in current_place_stat_var_dcids
      if current_place_obs_point_response["byVariable"].get(
          stat_var_dcid, {}).get("byEntity", {}).get(place_dcid, {})
  ])

  # Find stat vars that have data for our child places
  child_places_obs_point_response = dc.obs_point_within(
      place_dcid, child_place_type, variables=child_places_stat_var_dcids)
  child_places_stat_vars_with_observations = set([
      stat_var_dcid for stat_var_dcid in child_places_stat_var_dcids
      if child_places_obs_point_response["byVariable"].get(
          stat_var_dcid, {}).get("byEntity", {})
  ])

  # find stat vars that have data for our peer places. We only want to keep
  # these stat vars if there is data for more than one place.
  peer_places_within = fetch_peer_places_within(place_dcid, [place_type])[:15]
  peer_places_obs_point_response = dc.obs_point_within(
      parent_place_dcid, place_type, variables=peer_places_stat_var_dcids)
  peer_places_stat_vars_with_observations = set()

  # Check if child place & peer places have geo data available.
  child_places_have_geo_data = check_geo_data_exists(
      place_dcid, child_place_type) if found_child_place_map else False
  # (Ensure parent_place_dcid is set to account for "Earth" not having a parent place)
  peer_places_have_geo_data = check_geo_data_exists(
      parent_place_dcid,
      place_type) if found_peer_places_map and parent_place_dcid else False

  for stat_var_dcid in peer_places_stat_var_dcids:
    peers_with_data = 0
    for peer_place_dcid in peer_places_obs_point_response["byVariable"].get(
        stat_var_dcid, {}).get("byEntity", {}):
      if peer_place_dcid in peer_places_within:
        peers_with_data += 1

        if peers_with_data == 2:
          peer_places_stat_vars_with_observations.add(stat_var_dcid)
          break  # Move to the next stat_var_dcid once a peer place with data is found

  # Build set of all stat vars that have data for our place & children places
  stat_vars_with_observations_set = set(
      current_place_stat_vars_with_observations)
  stat_vars_with_observations_set.update(
      child_places_stat_vars_with_observations)
  stat_vars_with_observations_set.update(
      peer_places_stat_vars_with_observations)

  # Filter out chart config entries that don't have any data
  filtered_chart_config = [
      config for config in chart_config
      # Set intersection to see if this chart has any variables with observations for our place_dcid
      if set(config.variables) & stat_vars_with_observations_set
  ]

  valid_chart_configs = []
  for config in filtered_chart_config:
    updated_blocks = []
    for block in config.blocks:
      has_child_data = False
      has_place_data = False
      has_peer_data = False
      has_denom_data = False

      if block.place_scope == "CHILD_PLACES":
        has_child_data = any(var in child_places_stat_vars_with_observations
                             for var in config.variables)
        has_denom_data = all(var in child_places_stat_vars_with_observations
                             for var in config.denominator)
      elif block.place_scope == "PLACE":
        has_place_data = any(var in current_place_stat_vars_with_observations
                             for var in config.variables)
        has_denom_data = all(var in current_place_stat_vars_with_observations
                             for var in config.denominator)
      elif block.place_scope == "PEER_PLACES_WITHIN_PARENT":
        has_place_data = any(var in current_place_stat_vars_with_observations
                             for var in config.variables)
        # Only add peers when we also have data for current place.
        has_peer_data = has_place_data and any(
            var in peer_places_stat_vars_with_observations
            for var in config.variables)
        has_denom_data = all(var in peer_places_stat_vars_with_observations
                             for var in config.denominator)

      # Override non_dividable as False if we dont have denominator data.
      block.non_dividable = config.non_dividable or not has_denom_data

      # Remove maps if we dont have child or peer places geo data.
      filtered_block = copy.deepcopy(block)
      if (not child_places_have_geo_data and block.place_scope == "CHILD_PLACES"
         ) or (not peer_places_have_geo_data and
               block.place_scope == "PEER_PLACES_WITHIN_PARENT"):
        filtered_block.charts = [
            chart for chart in filtered_block.charts if chart.type != "MAP"
        ]

      if filtered_block.charts and (has_child_data or has_place_data or
                                    has_peer_data):
        updated_blocks.append(filtered_block)

    config.blocks = updated_blocks

    # Only keep configs that have blocks.
    if config.blocks:
      valid_chart_configs.append(config)

  return valid_chart_configs


def check_geo_data_exists(place_dcid: str, child_place_type: str) -> bool:
  """
  Check if geo data exists for a given place and child place type.

  Args:
    place_dcid: dcid of the place to check
    child_place_type: type of the child place to check

  Returns:
    True if geo data exists for the given place and child place type, False otherwise
  """
  child_places = fetch.descendent_places([place_dcid],
                                         child_place_type).get(place_dcid, [])

  # Check if geo data exists, starting from the least detailed level (geoJsonCoordinatesDP3) to the more detailed level (geoJsonCoordinatesDP2).
  # Performs checks sequentially to avoid expensive property value fetches for higher detail levels.
  ordered_geo_properties = ["geoJsonCoordinatesDP3", "geoJsonCoordinatesDP2"]
  for geo_property in ordered_geo_properties:
    child_place_geojson_data = fetch.property_values(child_places, geo_property)
    filtered_child_place_geojson_data = {
        child_place_dcid: values
        for child_place_dcid, values in child_place_geojson_data.items()
        if values
    }
    if bool(filtered_child_place_geojson_data):
      return True
  return False


def select_string_with_locale(strings_with_locale: List[str],
                              locale=DEFAULT_LOCALE) -> str:
  """
  Selects a string with a locale from a list of strings with locale tags.
  Each string is assumed to have a locale suffix in the format '@<locale>', such as 'hello@en'.
  If a string with the desired locale is found, it is returned without the locale tag.
  If no string with the desired locale is found, it returns the string with the default locale (set as 'en').

  Args:
      strings_with_locale (List[str]): List of strings with locale suffixes (e.g., 'hello@en').
      locale (str): Desired locale (default: 'en').

  Returns:
      str: String without the locale tag.
  """
  default_i18n_string = ""
  for string_with_locale in strings_with_locale:
    # Check if this string has the desired locale by checking if it ends with '@<locale>'
    if string_with_locale.endswith(f"@{locale}"):
      # If found, return the string without the locale tag
      return string_with_locale.rsplit("@", 1)[0]

    # If not found, check if the string matches the default locale (e.g., '@en')
    if string_with_locale.endswith(f"@{DEFAULT_LOCALE}"):
      # If a default locale string is found, store it to return later if needed
      default_i18n_string = string_with_locale.rsplit("@", 1)[0]

  # Return the string with the default locale if no match was found for the desired locale
  return default_i18n_string


def fetch_place(place_dcid: str, locale: str = DEFAULT_LOCALE) -> Place:
  """
  Fetches a single Place object for the given place DCID and locale.

  Args:
      place_dcid (str): The unique identifier (DCID) for the place.
      locale (str): The desired locale for the place name (default: 'en').

  Returns:
      Place: A Place object with the requested locale's name and other details.
  """
  places = fetch_places([place_dcid], locale)
  return places[0]


def fetch_places(place_dcids: List[str], locale=DEFAULT_LOCALE) -> List[Place]:
  """
  Fetches a list of Place objects for the given list of place DCIDs and locale.

  Args:
      place_dcids (List[str]): A list of unique identifiers (DCIDs) for places.
      locale (str): The desired locale for the place names (default: 'en').

  Returns:
      List[Place]: A list of Place objects with names in the specified locale.
  """
  props = ['typeOf', 'name', 'dissolutionDate']
  # Only fetch names with locale-specific tags if the desired locale is non-english
  if locale != DEFAULT_LOCALE:
    props.append('nameWithLanguage')
  multi_places_props = fetch.multiple_property_values(place_dcids, props)

  places = []
  for place_dcid in place_dcids:
    place_props = multi_places_props.get(place_dcid, {})
    place_name_with_languages_strs = place_props.get('nameWithLanguage', [])
    name_with_locale = select_string_with_locale(place_name_with_languages_strs,
                                                 locale=locale)

    place_names = place_props.get('name', [])
    default_name = place_names[0] if place_names else place_dcid
    dissolved = bool(place_props.get('dissolutionDate'))

    place_types = place_props.get('typeOf', [])
    # Use the name with locale if available, otherwise fall back to the default ('en') name
    name = name_with_locale or default_name
    places.append(
        Place(dcid=place_dcid,
              name=name,
              types=place_types,
              dissolved=dissolved))
  return places


def chart_config_to_overview_charts(
    chart_config: List[ServerChartConfiguration],
    child_place_type: str) -> List[BlockConfig]:
  """
  Converts the given chart configuration into a list of Chart objects for API responses.

  Args:
      chart_config (List[Dict]): A list of chart configuration dictionaries, 
                                  each containing metadata like 'category', 'variables', 'title', etc.

  Returns:
      List[BlockConfig]: A list of Chart objects created from the chart configuration.
  """
  blocks = []
  for page_config_item in chart_config:
    denominator = page_config_item.denominator
    for block in page_config_item.blocks:
      charts = []
      for chart in block.charts:
        this_chart = Chart(type=chart.type, maxPlaces=chart.max_places)
        charts.append(this_chart)

      this_block = BlockConfig(
          charts=charts,
          category=page_config_item.category,
          description=page_config_item.description,
          scaling=page_config_item.scaling,
          statisticalVariableDcids=page_config_item.variables,
          title=block.title,
          placeScope=block.place_scope,
          topicDcids=[],
          denominator=denominator if not block.non_dividable else None,
          unit=page_config_item.unit)

      this_block.childPlaceType = child_place_type
      blocks.append(this_block)
  return blocks


# Maps each parent place type to a list of valid child place types.
# This hierarchy defines how places are related in terms of containment.
PLACE_TYPES_TO_CHILD_PLACE_TYPES = {
    "Continent": ["Country"],
    "GeoRegion": ["Country", "City"],
    "Country": [
        "State", "EurostatNUTS1", "EurostatNUTS2", "AdministrativeArea1"
    ],
    "State": ["County", "AdministrativeArea2"],
    "AdministrativeArea1": ["County", "AdministrativeArea2"],
    "County": [
        "City", "Town", "Village", "Borough", "AdministrativeArea3",
        "CensusZipCodeTabulationArea"
    ],
    "AdministrativeArea2": [
        "City", "Town", "Village", "Borough", "AdministrativeArea3",
        "CensusZipCodeTabulationArea"
    ],
    "City": ["CensusZipCodeTabulationArea"],
}

# List of callable expressions for matching specific parent places to their primary child place type.
# These are used for overriding or customizing the default hierarchy in certain cases.
PLACE_MATCH_EXPRESSIONS: Callable[[Place], str | None] = [
    # Matches "Earth" (type "Place") and returns "Continent"
    lambda place: "Continent" if "Place" in place.types else None,
    # Use "State" instead of AdministrativeArea1 for country/USA
    lambda place: "State" if place.dcid == "country/USA" else None,
    # Use "Country" for all  "UNGeoRegion"
    lambda place: "Country" if "UNGeoRegion" in place.types else None,
    # Use "County" instead of AdministrativeArea2 for US states
    lambda place: "County" if re.match(r"geoId/\d\d$", place.dcid) else None
]

# Default set of valid child place types. These are used when specific mappings or matches are unavailable.
DEFAULT_CHILD_PLACE_TYPES = set([
    "Country", "State", "County", "City", "Town", "Village", "Borough",
    "CensusZipCodeTabulationArea", "EurostatNUTS1", "EurostatNUTS2",
    "EurostatNUTS3", "AdministrativeArea1", "AdministrativeArea2",
    "AdministrativeArea3", "AdministrativeArea4", "AdministrativeArea5"
])


def get_child_place_types(place: Place) -> list[str]:
  """
  Determines the child place types for a given place.

  This function uses custom matching rules and fallback hierarchies to decide
  the ordered child place types for a given place.

  Args:
      place (Place): The place object to analyze.

  Returns:
      list[str]: The child place types for the given place, or empty list if no match is found.
  """
  # Attempt to directly match a child place type using the custom expressions.
  for f in PLACE_MATCH_EXPRESSIONS:
    matched_child_place_type = f(place)
    if matched_child_place_type:
      return [matched_child_place_type]

  # Fetch all possible child places for the given place using its containment property.
  raw_property_values_response = fetch.raw_property_values(
      nodes=[place.dcid], prop="containedInPlace", out=False)

  # Determine the order of child place types based on the parent type.
  ordered_child_place_types = DEFAULT_CHILD_PLACE_TYPES
  for place_type in place.types:
    if place_type in PLACE_TYPES_TO_CHILD_PLACE_TYPES:
      ordered_child_place_types = PLACE_TYPES_TO_CHILD_PLACE_TYPES[place_type]
      break

  # Collect all types of child places found in the property values response.
  child_place_types = set()
  for raw_property_value in raw_property_values_response.get(place.dcid, []):
    child_place_types.update(raw_property_value.get("types", []))

  child_place_type_candidates = []
  # Return the first child place type that matches the ordered list of possible child types.
  for place_type_candidate in ordered_child_place_types:
    if place_type_candidate in child_place_types:
      child_place_type_candidates.append(place_type_candidate)

  if child_place_type_candidates:
    return child_place_type_candidates

  # If no matching child place type is found, return empty.
  return []


def get_child_place_type_to_highlight(place: Place) -> str:
  """Returns the child place type to highlight"""
  ordered_child_place_types = get_child_place_types(place)
  child_place_type = ordered_child_place_types[
      0] if ordered_child_place_types else None
  if child_place_type == 'Continent':
    # We should downgrade the child_place_type from continent to country since
    # we do not have continent level data. Ex. this applies to dcid=Earth.
    child_place_type = 'Country'
  return child_place_type


def read_chart_configs() -> List[ServerChartConfiguration]:
  """Reads the raw chart configs from app settings and parses them into the appropriate dataclasses."""
  raw_chart_configs = copy.deepcopy(current_app.config['CHART_CONFIG'])

  server_chart_configs = []
  for raw_config in raw_chart_configs:
    if 'variables' not in raw_config:
      # Legacy charts should get filtered out.
      continue

    server_block_configs = []
    for raw_block in raw_config.get('blocks', []):
      server_block_config = ServerBlockMetadata(**raw_block)
      server_block_config.charts = [
          ServerChartMetadata(**raw_chart)
          for raw_chart in raw_block.get('charts', [])
      ]
      server_block_configs.append(server_block_config)

    server_chart_config = ServerChartConfiguration(**raw_config)

    server_chart_config.blocks = server_block_configs
    server_chart_configs.append(server_chart_config)
  return server_chart_configs


@cache.memoize(timeout=TIMEOUT)
def fetch_child_place_dcids(place: Place, child_place_type: str) -> List[str]:
  # Get all possible child places
  descendent_places_result = fetch.descendent_places(
      [place.dcid], descendent_type=child_place_type)
  child_place_dcids = descendent_places_result.get(place.dcid, [])
  return child_place_dcids


def translate_chart_config(
    chart_config: List[ServerChartConfiguration], place_type: str,
    child_place_type: str, place_name: str,
    parent_place_name: str | None) -> List[ServerChartConfiguration]:
  """
  Translates the 'titleId' field in each chart configuration item into a readable 'title'
  using the gettext function.

  Args:
      chart_config (List[Dict]): A list of dictionaries where each dictionary contains 
                                  chart configuration data. Each dictionary may have a 'titleId'
                                  field that needs to be translated into a 'title'.
      place_type: Type of the current place
      child_place_type: Type of the child place
      place_name: Name of the current place, already internationalized
      parent_place_name: Name of the parent place, already internationalized

  Returns:
      List[Dict]: A new list of dictionaries with the 'title' field translated where applicable.
  """
  # We do not properly identify Administrative Areas, so will exclude those from the chart title and fallback to "Places"
  if place_type and place_type.startswith('AdministrativeArea'):
    place_type = 'Place'
  if child_place_type and child_place_type.startswith('AdministrativeArea'):
    child_place_type = 'Place'

  translated_place_type = place_api.get_place_type_i18n_name(
      place_type, plural=True) if place_type else None
  translated_child_place_type = place_api.get_place_type_i18n_name(
      child_place_type, plural=True) if child_place_type else None

  translated_chart_config = []
  for page_config_item in chart_config:
    translated_item = copy.deepcopy(page_config_item)
    for translated_block in translated_item.blocks:
      title_sections = []

      if translated_block.place_scope == "PEER_PLACES_WITHIN_PARENT":
        title_sections.append(
            gettext(NEIGHBORING_PLACES_IN_PARENT_PLACE_STR,
                    placeType=translated_place_type,
                    parentPlace=parent_place_name))
      elif translated_block.place_scope == "CHILD_PLACES":
        title_sections.append(
            gettext(PLACE_TYPE_IN_PARENT_PLACES_STR,
                    placeType=translated_child_place_type,
                    parentPlaces=place_name))

      if translated_item.title_id:
        title_sections.append(gettext(translated_item.title_id))
      translated_block.title = ': '.join(title_sections)

    translated_chart_config.append(translated_item)
  return translated_chart_config


def get_categories_with_translations(
    chart_config: List[ServerChartConfiguration]) -> Dict[str, str]:
  """
  Returns a list of categories with their translated names from the chart config.

  Args:
      chart_config (List[ServerChartConfiguration]): The chart configuration to use for determining categories.

  Returns:
      List[Category]: A list of categories with their translated names.
  """
  categories: List[Category] = []

  categories_set: Set[str] = set()
  for page_config_item in chart_config:
    category = page_config_item.category
    if category in categories_set:
      continue
    categories_set.add(category)

  for category in ORDERED_TOPICS:
    if not category in categories_set:
      continue
    category = Category(name=category,
                        translatedName=get_translated_category_string(category))
    categories.append(category)

  return categories


def get_translated_category_string(category: str) -> str:
  return gettext(f'CHART_TITLE-CHART_CATEGORY-{category}')


def get_place_cohort(place: Place) -> str:
  """
  Returns the place CohortSet DCID for the given place type

  Args:
      place (Place): Place object to retrieve the place cohort for

  Returns:
      str: Place CohortSet DCID

  Example:
      >> country_place = Place(dcid="country/USA", types=["Country"])
      >> get_place_cohort(country_place)
      "PlacePagesComparisonCountriesCohort"

  """
  # Country
  if "Country" in place.types:
    return "PlacePagesComparisonCountriesCohort"

  # World city
  if "City" in place.types:
    return "PlacePagesComparisonWorldCitiesCohort"

  # US State
  if re.match(r'^geoId/\d{2}$', place.dcid):
    return "PlacePagesComparisonStateCohort"

  # US County
  if re.match(r'^geoId/\d{5}$', place.dcid):
    return "PlacePagesComparisonCountyCohort"

  # US City
  if re.match(r'^geoId/\d{7}$', place.dcid):
    return "PlacePagesComparisonCityCohort"

  return ""


def parse_nearby_value(nearby_value: str) -> Tuple[str, str | None, str | None]:
  """
  Parses a nearby value string to extract the place DCID, distance, and an optional unit.

  The input string is expected to be in the format "place_dcid@distance", where 
  `place_dcid` is a string identifier, and `distance` contains a numerical value followed 
  by an optional unit. The unit can be any string, but it is uncertain what format it will take.

  Args:
      nearby_value (str): A string containing the place DCID and distance, separated by 
                          an "@" symbol (e.g., "place123@1000m" or "place456@10").

  Returns:
      tuple: A tuple containing:
          - place_dcid (str): The place identifier extracted from the input string.
          - value (float or None): The numerical distance value if found, otherwise None.
          - unit (str or None): The unit of the distance if present, otherwise None. 
                                The unit is any string following the number, and it may be optional.
  """
  # Split the input string into place_dcid and distance part
  place_dcid, distance_str = nearby_value.split("@")

  # Regex to match the number and the unit
  pattern = r"([0-9]+(?:\.[0-9]+)?)\s*(\w+)?"

  # Search for the pattern in the input string
  match = re.match(pattern, distance_str)

  if match:
    # Extract the number and unit
    value = float(match.group(1))
    unit = match.group(2)
    return place_dcid, value, unit
  else:
    return place_dcid, None, None


def fetch_nearby_place_dcids(place: Place, locale=DEFAULT_LOCALE) -> List[str]:
  """
  Fetches nearby places for a given place, sorted by distance.

  Args:
      place (Place): The place object for which nearby places should be fetched.
      locale (str, optional): Locale to optionally translate result into. Defaults to DEFAULT_LOCALE.

  Returns:
      List[str]: A list of nearby place DCIDs, sorted by distance from the input place.
  """
  nearby_places_response = fetch.raw_property_values(nodes=[place.dcid],
                                                     prop="nearbyPlaces",
                                                     out=True)
  nearby_places_response.get(place.dcid, [])

  place_distances = []
  for item in nearby_places_response.get(place.dcid):
    place_dcid, distance, unit = parse_nearby_value(item.get("value", ""))
    place_distances.append((place_dcid, distance))

  sorted_place_distances = sorted(place_distances, key=lambda x: x[1])
  nearby_place_dcids = [item[0] for item in sorted_place_distances]
  return nearby_place_dcids


@cache.memoize(timeout=TIMEOUT)
def fetch_peer_places_within(place_dcid: str,
                             place_types: list[str]) -> List[str]:
  """Returns the list of peer places within the first parent that should be higlighted."""
  parent_places = get_parent_places(place_dcid)

  # Only consider peers within the first parent of a type to highlight.
  # For example, from country/FRA, we want to show the peers within the Continent Europe.
  # as opposed to peers within the UNGeoRegion WesternEurope, or within the UNData region OECD.
  parent_to_use = get_place_override(parent_places)

  peers_within_parent = []
  if parent_to_use:
    peers_within_parent = fetch_child_place_dcids(
        parent_to_use, place_type_to_highlight(place_types))
    random.shuffle(peers_within_parent)

  # Remove place_dcid from the list
  if place_dcid in peers_within_parent:
    peers_within_parent.remove(place_dcid)

  return peers_within_parent


def fetch_similar_place_dcids(place: Place, locale=DEFAULT_LOCALE) -> List[str]:
  """
  Fetches similar places to the given place, based on its cohort type.

  Args:
      place (Place): The place for which to find similar places.
      locale (str, optional): Locale to optionally translate result into. Defaults to DEFAULT_LOCALE.

  Returns:
      List[Place]: A list of place DCIDs that are similar to the input place, based on the cohort type.
                    If no cohort is found for the place, returns an empty list.
  """
  # Determine the cohort type for the given place based on its type and DCID
  place_cohort = get_place_cohort(place)

  # If no valid cohort is determined, return an empty list (no similar places found)
  if not place_cohort:
    return []

  # Fetch the cohort member places
  place_cohort_members_response = fetch.raw_property_values(
      nodes=[place_cohort], prop="member", out=True)

  # Get the DCIDs of the cohort members
  place_cohort_member_dcids = [
      item.get("dcid", "")
      for item in place_cohort_members_response.get(place_cohort, [])
  ]

  # Return the list of similar place dcids
  return place_cohort_member_dcids


def fetch_overview_table_data(place_dcid: str,
                              locale=DEFAULT_LOCALE
                             ) -> List[OverviewTableDataRow]:
  """
  Fetches overview table data for the specified place.
  """
  data_rows = []
  variables = [v["variable_dcid"] for v in PLACE_OVERVIEW_TABLE_VARIABLES]

  # Fetch the most recent observation for each variable
  resp = dc.obs_point([place_dcid], variables)
  facets = resp.get("facets", {})

  # Iterate over each variable and extract the most recent observation
  for item in PLACE_OVERVIEW_TABLE_VARIABLES:
    variable_dcid = item["variable_dcid"]
    name = gettext(item["i18n_message_id"])
    ordered_facet_observations = resp.get("byVariable", {}).get(
        variable_dcid, {}).get("byEntity", {}).get(place_dcid,
                                                   {}).get("orderedFacets", [])
    most_recent_facet = ordered_facet_observations[
        0] if ordered_facet_observations else None
    if not most_recent_facet:
      continue

    observations = most_recent_facet.get("observations", [])
    most_recent_observation = observations[0] if observations else None
    if not most_recent_observation:
      continue

    facet_id = most_recent_facet.get("facetId", "")
    date = most_recent_observation.get("date", "")
    value = most_recent_observation.get("value", "")
    provenance_url = facets.get(facet_id, {}).get("provenanceUrl", "")
    # Use the unit from the facet if available, otherwise use the unit from the variable definition
    unit = facets.get(facet_id, {}).get("unit", None) or item.get("unit", None)

    data_rows.append(
        OverviewTableDataRow(
            date=date,
            name=name,
            provenanceUrl=provenance_url,
            unit=unit,
            value=value,
            variableDcid=variable_dcid,
        ))

  return data_rows
