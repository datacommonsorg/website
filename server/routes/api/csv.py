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
"""Flask endpoint to handle csv download request
"""

import csv
import io

from flask import Blueprint
from flask import make_response
from flask import request

from server.routes.api.shared import date_greater_equal_min
from server.routes.api.shared import date_lesser_equal_max
from server.routes.api.shared import is_valid_date
from server.routes.api.shared import names
import server.services.datacommons as dc

# Define blueprint
bp = Blueprint("csv", __name__, url_prefix='/api/csv')


def get_point_within_csv_rows(parent_place,
                              child_type,
                              sv_list,
                              facet_map,
                              date,
                              row_limit=None):
  """Gets the csv rows for a set of statistical variables data for child places
    of a certain place type contained in a parent place.

  Args:
      parent_place: the parent place of the places to get data for
      child_type: the type of places to get data for
      sv_list: list of variables in the order that they should appear from
          left to right in each csv row.
      date: the date to get the data for
      row_limit (optional): number of csv rows to return

  Returns:
      An array where each item in the array is a csv row. These csv rows are
      represented as an array where each item is the value of a cell in the
      row.
  """
  points_response = dc.obs_point_within(parent_place, child_type, sv_list, date)

  # dict of place dcid to dict of sv dcid to chosen data point.
  data_by_place = {}
  # go through the data in points_response_all and add to data_by_place
  for sv, sv_data in points_response.get("byVariable", {}).items():
    target_facet = facet_map.get(sv, "")
    for place, place_data in sv_data.get("byEntity", {}).items():
      if not place in data_by_place:
        data_by_place[place] = {}
      points_by_facet = place_data.get("orderedFacets", [])
      latest = None
      for point in points_by_facet:
        # if no facet selected for this variable, choose the first
        # point in the list because orderedFacets is sorted by best
        # facet first
        if target_facet == "":
          if not latest or point['observations'][0]['date'] > latest[
              'observations'][0]['date']:
            latest = point
        elif point.get("facetId") == target_facet:
          data_by_place[place][sv] = point
          break
      if latest:
        data_by_place[place][sv] = latest

  facet_info = points_response.get("facets", {})
  place_list = sorted(list(data_by_place.keys()))
  place_names = names(place_list)
  result = []
  for place, place_name in place_names.items():
    if row_limit and len(result) >= row_limit:
      break
    place_row = [place, place_name]
    for sv in sv_list:
      data = data_by_place.get(place, {}).get(sv, {})
      if data:
        date = data['observations'][0].get("date", "")
        value = data['observations'][0].get("value", "")
        facetId = data.get("facetId", "")
        url = facet_info.get(facetId, {}).get("provenanceUrl", "")
        place_row.extend([date, value, url])
      else:
        place_row.extend(['', '', ''])
    result.append(place_row)
  return result


def get_series_csv_rows(series_response,
                        sv_list,
                        facet_map,
                        min_date,
                        max_date,
                        row_limit=None):
  """Gets the csv rows for a set of statistical variable series for a certain
    date range.

  Args:
      series_response: the response from a dc.obs_series_within call
      sv_list: list of variables in the order that they should appear from
          left to right in each csv row.
      min_date (optional): the earliest date as a string to get data for. If
          not set get all dates up to max_date (if max_date is set).
      max_date (optional): the latest date as a string to get data for. If not
          set, get all dates starting at min_date (if min_date is set).
      row_limit (optional): number of csv rows to return

  Returns:
      An array where each item in the array is a csv row. These csv rows are
      represented as an array where each item is the value of a cell in the
      row.
  """
  facets = series_response.get("facets", {})
  obs_by_sv = series_response.get("observationsByVariable", [])
  # dict of place dcid to dict of sv dcid to chosen series.
  data_by_place = {}
  for sv_data in obs_by_sv:
    sv = sv_data.get("variable")
    target_facet = facet_map.get(sv, "")
    for place_data in sv_data.get("observationsByEntity", []):
      place = place_data.get("entity")
      series_by_facet = place_data.get("seriesByFacet", [])
      if not place in data_by_place:
        data_by_place[place] = {}
      for series in series_by_facet:
        # if no facet selected for this variable, choose the first
        # series in the list because seriesByFacet is sorted by best
        # facet first
        if target_facet == "":
          data_by_place[place][sv] = series
          break
        if str(series.get("facet")) == target_facet:
          data_by_place[place][sv] = series
          break
  place_list = sorted(list(data_by_place.keys()))
  place_names = names(place_list)
  result = []
  for place, place_name in place_names.items():
    # dict of sv to sorted list of data points available for the sv and is within
    # the date range
    sv_data_points = {}
    # dict of sv to its source
    sv_source = {}
    # dict of sv to the idx of the next date for that sv to add to the result
    sv_curr_index = {}
    # whether or not there is still data to add to the result
    have_data = False
    for sv in sv_list:
      sv_series = data_by_place.get(place, {}).get(sv, {})
      want_data_points = []
      # Go through the series and keep data points that are within the
      # date range
      for data_point in sv_series.get("series", []):
        date = data_point.get("date")
        is_greater_than_min = date_greater_equal_min(date, min_date)
        is_less_than_max = date_lesser_equal_max(date, max_date)
        if is_greater_than_min and is_less_than_max:
          want_data_points.append(data_point)
      want_data_points.sort(key=lambda x: x["date"])
      sv_data_points[sv] = want_data_points
      facetId = sv_series.get("facet", "")
      sv_source[sv] = facets.get(facetId, {}).get("provenanceUrl", "")
      sv_curr_index[sv] = 0
      have_data = have_data or len(want_data_points) > 0
    while have_data:
      if row_limit and len(result) >= row_limit:
        break
      curr_date = ""
      # look through all the next dates to add data for and choose the
      # earliest date and the one with highest granularity
      # eg. between 2015 and 2015-01 we want 2015-01
      #     between 2015 and 2016 we want 2015
      for sv, idx in sv_curr_index.items():
        if idx >= len(sv_data_points[sv]):
          continue
        curr_sv_date = sv_data_points[sv][idx]["date"]
        if not curr_date:
          curr_date = curr_sv_date
        elif curr_sv_date < curr_date or curr_sv_date.startswith(curr_date):
          curr_date = curr_sv_date
      have_data = False
      place_date_row = [place, place_name]
      for sv, idx in sv_curr_index.items():
        # if a sv doesn't have any more data left, just append empty cells
        if idx >= len(sv_data_points[sv]):
          place_date_row.extend(["", "", ""])
          continue
        curr_sv_date = sv_data_points[sv][idx]["date"]
        # Add data for an sv if the current date to add for that sv is
        # equal to or encompassing the chosen date. Eg. if the chosen
        # date is 2015-01-02, then we can add data from 2015, 2015-01 or
        # 2015-01-02.
        if curr_date.startswith(curr_sv_date):
          value = sv_data_points[sv][idx]["value"]
          place_date_row.extend([curr_sv_date, value, sv_source.get(sv, "")])
          sv_curr_index[sv] += 1
        else:
          place_date_row.extend(["", "", ""])
        have_data = have_data or sv_curr_index[sv] < len(sv_data_points[sv])
      result.append(place_date_row)
  return result


@bp.route('/within', methods=['POST'])
def get_stats_within_place_csv():
  """Gets the statistical variable data as a csv for child places of a
    certain place type contained in a parent place. If no date range specified,
    gets data for all dates of a series. If minDate and maxDate are "latest",
    the latest date data will be returned.

  Request body:
      parentPlace: the parent place of the places to get data for
      childType: type of places to get data for
      statVars: list of statistical variables to get data for
      minDate (optional): earliest date to get data for
      maxDate (optional): latest date to get data for
      facetMap (optional): map of statistical variable dcid to the id of the
          facet to get data from
      rowLimit (optional): number of csv rows to return
  """
  parent_place = request.json.get("parentPlace")
  if not parent_place:
    return "error: must provide a parentPlace field", 400
  child_type = request.json.get("childType")
  if not child_type:
    return "error: must provide a childType field", 400
  sv_list = request.json.get("statVars")
  if not sv_list:
    return "error: must provide a statVars field", 400
  min_date = request.json.get("minDate")
  if not is_valid_date(min_date):
    return "error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD", 400
  max_date = request.json.get("maxDate")
  if not is_valid_date(max_date):
    return "error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD", 400
  facet_map = request.json.get("facetMap", {})
  row_limit = request.json.get("rowLimit")
  if row_limit:
    row_limit = int(row_limit)
  result_csv = []
  header_row = ["placeDcid", "placeName"]
  for sv in sv_list:
    header_row.extend(["Date:" + sv, "Value:" + sv, "Source:" + sv])
  result_csv.append(header_row)
  # when min_date and max_date are the same and non empty, we will get the
  # data for that one date
  if min_date and max_date and min_date == max_date:
    date = min_date
    if min_date == "latest":
      date = "LATEST"
    result_csv.extend(
        get_point_within_csv_rows(parent_place, child_type, sv_list, facet_map,
                                  date, row_limit))
  else:
    series_response = dc.obs_series_within(parent_place, child_type, sv_list,
                                           True)
    result_csv.extend(
        get_series_csv_rows(series_response, sv_list, facet_map, min_date,
                            max_date, row_limit))
  si = io.StringIO()
  csv_writer = csv.writer(si)
  csv_writer.writerows(result_csv)
  response = make_response(si.getvalue())
  response.headers["Content-type"] = "text/csv"
  response.headers[
      "Content-Disposition"] = "attachment; filename={}_{}.csv".format(
          parent_place, child_type)
  response.status_code = 200
  return response
