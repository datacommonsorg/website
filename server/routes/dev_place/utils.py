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

import re
from typing import Callable, Dict, List, Set

import flask
from flask_babel import gettext

from server.lib import fetch
from server.lib.i18n import DEFAULT_LOCALE
from server.routes.dev_place.types import Chart
from server.routes.dev_place.types import Place
import server.routes.shared_api.place as place_api
from server.services import datacommons as dc

# Parent place types to include in listing of containing places at top of page
PARENT_PLACE_TYPES_TO_HIGHLIGHT = {
    'County',
    'AdministrativeArea2',
    'EurostatNUTS2',
    'State',
    'AdministrativeArea1',
    'EurostatNUTS1',
    'Country',
    'Continent',
}


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
    all_parents.append(
        Place(dcid=parent['dcid'], name=parent['name'], types=parent['type']))

  return all_parents


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

  # Filter parents to only the types desired
  parents_to_include = [
      parent for parent in all_parents
      if parent.types in PARENT_PLACE_TYPES_TO_HIGHLIGHT
  ]

  # Fetch the localized names of the parents
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


def filter_chart_config_by_place_dcid(chart_config: List[Dict],
                                      place_dcid: str,
                                      child_place_type=str):
  """
  Filters the chart configuration to only include charts that have data for a specific place DCID.
  
  Args:
      chart_config (List[Dict]): A list of chart configurations, where each configuration includes statistical variable DCIDs under the key 'statsVars'.
      place_dcid (str): dcid for the place of interest.

  Returns:
      List[Dict]: A filtered list of chart configurations where at least one statistical variable has data for the specified place.
  """
  # Get a flat list of all statistical variable dcids in the chart config
  non_map_stat_var_dcids = []
  map_stat_var_dcids = []
  for config in chart_config:
    if config.get("isChoropleth"):
      map_stat_var_dcids.extend(config["statsVars"])
    else:
      non_map_stat_var_dcids.extend(config["statsVars"])
    denominator = config.get("relatedChart", {}).get("denominator", None)
    if denominator:
      non_map_stat_var_dcids.extend(denominator)

  # Find non-map stat vars that have data for our place dcid
  obs_point_response = dc.obs_point(entities=[place_dcid],
                                    variables=non_map_stat_var_dcids)
  non_map_stat_vars_with_observations = [
      stat_var_dcid for stat_var_dcid in non_map_stat_var_dcids
      if obs_point_response["byVariable"].get(stat_var_dcid, {}).get(
          "byEntity", {}).get(place_dcid, {})
  ]

  # Find map stat vars that have data for our child places
  obs_point_within_response = dc.obs_point_within(place_dcid,
                                                  child_place_type,
                                                  variables=map_stat_var_dcids)
  map_stat_vars_with_observations = [
      stat_var_dcid for stat_var_dcid in map_stat_var_dcids
      if obs_point_within_response["byVariable"].get(stat_var_dcid, {}).get(
          "byEntity", {})
  ]

  # Build set of all stat vars that have data for our place & children places
  stat_vars_with_observations_set = set(non_map_stat_vars_with_observations)
  stat_vars_with_observations_set.update(map_stat_vars_with_observations)

  # Filter out chart config entries that don't have any data
  filtered_chart_config = [
      config for config in chart_config
      # Set intersection to see if this chart has any variables with observations for our place_dcid
      if set(config["statsVars"]) & stat_vars_with_observations_set
  ]
  return filtered_chart_config


def select_string_with_locale(strings_with_locale: List[str],
                              locale=DEFAULT_LOCALE):
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


def chart_config_to_overview_charts(chart_config, child_place_type: str):
  """
  Converts the given chart configuration into a list of Chart objects for API responses.

  Args:
      chart_config (List[Dict]): A list of chart configuration dictionaries, 
                                  each containing metadata like 'category', 'statsVars', 'title', etc.

  Returns:
      List[Chart]: A list of Chart objects created from the chart configuration.
  """
  charts = []
  for page_config_item in chart_config:
    denominator = page_config_item.get("denominator", None)
    is_map_chart = page_config_item.get("isChoropleth", False)
    chart = Chart(
        category=page_config_item.get("category"),
        description=page_config_item.get("description"),
        scaling=page_config_item.get("scaling"),
        statisticalVariableDcids=page_config_item.get("statsVars", []),
        title=page_config_item.get("title"),
        topicDcids=[],
        type="MAP" if is_map_chart else "LINE",
        unit=page_config_item.get("unit"),
    )
    if denominator:
      chart.denominator = denominator
    if is_map_chart:
      chart.childPlaceType = child_place_type
    charts.append(chart)

    if page_config_item.get("relatedChart", {}).get("title"):
      page_config_related_chart = page_config_item.get("relatedChart", {})
      related_chart = Chart(
          category=page_config_item.get("category"),
          description=page_config_related_chart.get("description"),
          scaling=page_config_related_chart.get("scaling"),
          statisticalVariableDcids=page_config_item.get("statsVars", []),
          title=page_config_related_chart.get("title"),
          topicDcids=[],
          type="MAP" if is_map_chart else "LINE",
          unit=page_config_related_chart.get("unit"),
      )
      if page_config_related_chart.get("denominator"):
        # Related charts only specify one denominator, so we repeat it for each stat var
        related_chart.denominator = [
            page_config_related_chart.get("denominator")
        ] * len(chart.statisticalVariableDcids)
      if is_map_chart:
        related_chart.childPlaceType = child_place_type
      charts.append(related_chart)

  return charts


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


def get_child_place_type(place: Place) -> str | None:
  """
  Determines the primary child place type for a given place.

  This function uses custom matching rules and fallback hierarchies to decide
  the most relevant child place type for a given place.

  Args:
      place (Place): The place object to analyze.

  Returns:
      str | None: The primary child place type for the given place, or None if no match is found.
  """
  # Attempt to directly match a child place type using the custom expressions.
  for f in PLACE_MATCH_EXPRESSIONS:
    matched_child_place_type = f(place)
    if matched_child_place_type:
      return matched_child_place_type

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

  # Return the first child place type that matches the ordered list of possible child types.
  for primary_place_type_candidate in ordered_child_place_types:
    if primary_place_type_candidate in child_place_types:
      return primary_place_type_candidate

  # If no matching child place type is found, return None.
  return None


def fetch_child_place_dcids(place: Place,
                            child_place_type: str,
                            locale=DEFAULT_LOCALE) -> List[str]:
  # Get all possible child places
  descendent_places_result = fetch.descendent_places(
      [place.dcid], descendent_type=child_place_type)
  child_place_dcids = descendent_places_result.get(place.dcid, [])
  return child_place_dcids


def translate_chart_config(chart_config: List[Dict]):
  """
  Translates the 'titleId' field in each chart configuration item into a readable 'title'
  using the gettext function.

  Args:
      chart_config (List[Dict]): A list of dictionaries where each dictionary contains 
                                  chart configuration data. Each dictionary may have a 'titleId'
                                  field that needs to be translated into a 'title'.

  Returns:
      List[Dict]: A new list of dictionaries with the 'title' field translated where applicable.
  """
  translated_chart_config = []
  for page_config_item in chart_config:
    translated_item = {**page_config_item}
    if translated_item.get("titleId"):
      translated_item["title"] = gettext(translated_item.get("titleId"))
    translated_chart_config.append(translated_item)
  return translated_chart_config


def get_translated_category_strings(chart_config: List[Dict]) -> Dict[str, str]:
  translated_category_strings: Dict[str, str] = {}

  for page_config_item in chart_config:
    category = page_config_item["category"]
    if category in translated_category_strings:
      continue
    translated_category_strings[category] = gettext(
        f'CHART_TITLE-CHART_CATEGORY-{category}')

  return translated_category_strings


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


def parse_nearby_value(nearby_value: str):
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
