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
"""
Defines endpoints for the place page.
"""

import asyncio

from flask import Blueprint
from flask import g
from flask import jsonify
from flask import request

from server.lib.cache import cache
from server.lib.util import error_response
from server.lib.util import log_execution_time
from server.routes import TIMEOUT
from server.routes.dev_place import utils as place_utils
from server.routes.dev_place.types import Place
from server.routes.dev_place.types import PlaceChartsApiResponse
from server.routes.dev_place.types import PlaceOverviewTableApiResponse
from server.routes.dev_place.types import RelatedPlacesApiResponse
from server.routes.dev_place.utils import extract_places_from_dcids

# Define blueprint
bp = Blueprint("dev_place_api", __name__, url_prefix='/api/dev-place')


@bp.route('/charts/<path:place_dcid>')
@log_execution_time
@cache.cached(timeout=TIMEOUT, query_string=True)
async def place_charts(place_dcid: str):
  """
  Returns chart definitions for the specified place based on the availability of
  of data for that place. Results are translated into the user's locale.

  Args:
      place_dcid (str): DCID of the place to fetch data for.

  Returns:
      Response: JSON-encoded PlaceChartsApiResponse object
  
  The response includes:
  - Place details (name, type, etc.)
  - Charts specific to the place
  - Translated category strings for the charts
  """

  async def fetch_place_types(
      place: Place) -> tuple[Place | None, str, str | None]:
    """Asynchronously fetch the parent place override, the child place type to
    highlight, and the current place type to highlight.
    Returns a Tuple with the Place override, the child place type & place type.
    """
    parent_place_override_task = asyncio.to_thread(
        place_utils.get_place_override,
        place_utils.get_parent_places(place_dcid), g.locale)
    child_place_type_to_highlight_task = asyncio.to_thread(
        place_utils.get_child_place_type_to_highlight, place)
    place_type_task = asyncio.to_thread(place_utils.place_type_to_highlight,
                                        place.types)

    # return place, parent_place_override_task, child_place_type_to_highlight_task, place_type_task
    return await asyncio.gather(parent_place_override_task,
                                child_place_type_to_highlight_task,
                                place_type_task)

  # Validate the category parameter.
  place_category = request.args.get("category", place_utils.OVERVIEW_CATEGORY)
  if place_category not in place_utils.ALLOWED_CATEGORIES:
    return error_response(
        f"Argument 'category' {place_category} must be one of: {', '.join(place_utils.ALLOWED_CATEGORIES)}"
    )

  # Retrieve available place page charts
  full_chart_config = place_utils.read_chart_configs()

  # Blocking call to fetch the current place info
  place = await asyncio.to_thread(place_utils.fetch_place, place_dcid, g.locale)

  parent_place_override, child_place_type_to_highlight, place_type = await fetch_place_types(
      place)

  parent_place_dcid = parent_place_override.dcid if parent_place_override else None

  # Filter out place page charts that don't have any data for the current place_dcid
  chart_config_existing_data = await place_utils.memoized_filter_chart_config_for_data_existence(
      chart_config=full_chart_config,
      place_dcid=place_dcid,
      place_type=place_type,
      parent_place_dcid=parent_place_dcid,
      child_place_type=child_place_type_to_highlight)

  # Only keep the chart config for the current category.
  chart_config_for_category = place_utils.filter_chart_config_for_category(
      place_category, chart_config_existing_data)

  # Translate chart config titles
  translated_chart_config = place_utils.translate_chart_config(
      chart_config_for_category, place_type, child_place_type_to_highlight,
      place.name, parent_place_override.name if parent_place_override else None)

  # Extract charts to Chart objects used in PlaceChartsApiResponse object
  blocks = place_utils.chart_config_to_overview_charts(
      translated_chart_config, child_place_type_to_highlight)

  categories_with_more_charts = place_utils.get_categories_metadata(
      place_category, chart_config_existing_data, chart_config_for_category)

  response = PlaceChartsApiResponse(blocks=blocks,
                                    place=place,
                                    categories=categories_with_more_charts)
  return jsonify(response)


@bp.route('/related-places/<path:place_dcid>')
@log_execution_time
@cache.cached(timeout=TIMEOUT, query_string=True)
async def related_places(place_dcid: str):
  """
  Fetches and returns related place data to the specified place.
  Results are translated into the user's locale.

  Args:
      place_dcid (str): DCID of the place to fetch data for.

  Returns:
      Response: JSON-encoded RelatedPlacesApiResponse object
  
  The response includes:
  - Place details (name, type, etc.)
  - Lists of nearby, similar, and child places
  """
  # Fetch the current place.
  place = place_utils.fetch_place(place_dcid, g.locale)

  # Fetch the child place types, find type to highlight.
  ordered_child_place_types = await asyncio.to_thread(
      place_utils.get_child_place_types, place)
  primary_child_place_type = ordered_child_place_types[
      0] if ordered_child_place_types else None

  async def get_related_place_dcids_async(
      place: Place
  ) -> tuple[list[str], list[str], list[Place], list[str], list[list[str]]]:
    """Helper function to execute asynchronously the calls to fetch the DCIDs
     for the child places, nearby places, similar places, parent places and peer places within parent.
     Returns lists of DCIDs or Places for each type of related places."""

    child_tasks = [
        asyncio.to_thread(place_utils.fetch_child_place_dcids, place,
                          child_place_type)
        for child_place_type in ordered_child_place_types
    ]
    nearby_task = asyncio.to_thread(place_utils.fetch_nearby_place_dcids, place,
                                    g.locale)
    similar_task = asyncio.to_thread(place_utils.fetch_similar_place_dcids,
                                     place, g.locale)
    parent_places_task = asyncio.to_thread(place_utils.get_parent_places,
                                           place.dcid)
    peers_within_parent_task = asyncio.to_thread(
        place_utils.fetch_peer_places_within, place.dcid, place.types)

    nearby_place_dcids, similar_place_dcids, parent_places, peers_within_parent, *child_results = await asyncio.gather(
        nearby_task, similar_task, parent_places_task, peers_within_parent_task,
        *child_tasks)
    return nearby_place_dcids, similar_place_dcids, parent_places, peers_within_parent, *child_results

  # Fetches nearby, similar, parent, peers within parent, and child places concurrently.
  nearby_place_dcids, similar_place_dcids, parent_places, peers_within_parent, *child_results = await get_related_place_dcids_async(
      place)

  # Dedupes the child places but preserves ordering.
  child_place_dcids = place_utils.dedupe_preserve_order(child_results)

  # Initiates a dict of all places by DCID. Note that we omit the peers within parent since we do not need the Place object for those.
  all_place_dcids = [
      place_dcid, *nearby_place_dcids, *similar_place_dcids, *child_place_dcids
  ]
  all_places_by_dcid = {
      p.dcid: p for p in place_utils.fetch_places(all_place_dcids, g.locale)
  }

  # Extracts the Place objects from the DCIDs.
  nearby_places = extract_places_from_dcids(all_places_by_dcid,
                                            nearby_place_dcids)
  similar_places = extract_places_from_dcids(all_places_by_dcid,
                                             similar_place_dcids)
  child_places = extract_places_from_dcids(all_places_by_dcid,
                                           child_place_dcids)

  return jsonify(
      RelatedPlacesApiResponse(childPlaceType=primary_child_place_type,
                               childPlaces=child_places,
                               nearbyPlaces=nearby_places,
                               place=place,
                               similarPlaces=similar_places,
                               parentPlaces=parent_places,
                               peersWithinParent=peers_within_parent))


@bp.route('/overview-table/<path:place_dcid>')
@log_execution_time
@cache.cached(timeout=TIMEOUT, query_string=True)
def overview_table(place_dcid: str):
  """
  Fetches and returns overview table data for the specified place.
  """
  data_rows = place_utils.fetch_overview_table_data(place_dcid, locale=g.locale)

  return jsonify(PlaceOverviewTableApiResponse(data=data_rows))
