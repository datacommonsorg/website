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
"""Helper functions for development place page routes"""

import flask
from flask_babel import gettext

import server.routes.shared_api.place as place_api

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
  url = flask.url_for('dev_place.dev_place', place_dcid=place_dcid)
  return f'<a href="{url}">{place_name}</a>'


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
  all_parents = place_api.parent_places([dcid],
                                        include_admin_areas=True).get(dcid, [])

  # Filter parents to only the types desired
  parents_to_include = [
      parent for parent in all_parents
      if parent['type'] in PARENT_PLACE_TYPES_TO_HIGHLIGHT
  ]

  # Fetch the localized names of the parents
  parent_dcids = [parent['dcid'] for parent in parents_to_include]
  localized_names = place_api.get_i18n_name(parent_dcids)
  places_with_names = [
      parent for parent in parents_to_include
      if parent['dcid'] in localized_names.keys()
  ]

  # Generate <a href=place page url> tag for each parent place
  links = [
      get_place_html_link(place_dcid=parent['dcid'],
                          place_name=localized_names.get(parent['dcid']))
      if parent['type'] != 'Continent' else localized_names.get(parent['dcid'])
      for parent in places_with_names
  ]

  if links:
    return gettext('%(placeType)s in %(parentPlaces)s',
                   placeType=place_type_display_name,
                   parentPlaces=', '.join(links))
  return ''
