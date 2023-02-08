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

from cache import cache
from flask import Blueprint
from flask import request
from lib import util
import services.datacommons as dc

# Define blueprint
bp = Blueprint("series", __name__, url_prefix='/api/observations/series')


# TODO(juliawu): Handle case where dates are not "YYYY-MM"
# TODO(juliawu): We should adjust how we bin based on the data,
#                instead of cutting it off.
def get_binned_series(entities, variables, year):
  """Get observation series for entities and variables, for a given year.
  
  Bins observations from a series for plotting in the histogram tile.
  Currently, binning is done by only returning observations for a given year.
  This is done by assuming the dates of the series are in 'YYYY-MM' format,
  filtering for observations from the given year, and then imputing 0 for
  any months missing, up to the end of the series. 

  Note: This assumes the dates of the series are in 'YYYY-MM' format.

  Args:
    entities (list): DCIDs of entities to query
    variables (list): DCIDs of variables to query
    year (str): year in "YYYY" format to get observations for
  
  Returns:
    JSON response from server, with series containing only observations from 
    the specified year.
  """
  # Get raw series from mixer
  data = util.series_core(entities, variables, False)

  for stat_var in variables:
    for location in data['data'][stat_var].keys():

      # filter series to just observations from the selected year
      series = data['data'][stat_var][location]['series']
      pruned_series = []
      dates_with_data = []
      for obs in series:
        if obs['date'][:4] == year:
          pruned_series.append(obs)
          dates_with_data.append(obs['date'])

      if len(pruned_series) > 0:
        # fill in missing periods with 0s, from January to end of series
        last_month = int(dates_with_data[-1][-2:])
        months_to_fill = [str(mm).zfill(2) for mm in range(1, last_month + 1)]
        for month in months_to_fill:
          date = f"{year}-{month}"
          if date not in dates_with_data:
            pruned_series.append({'date': date, 'value': 0})
        pruned_series.sort(key=lambda x: x['date'])

      data['data'][stat_var][location]['series'] = pruned_series
  return data


@bp.route('', strict_slashes=False)
@cache.cached(timeout=3600 * 24, query_string=True)
def series():
  """Handler to get preferred time series given multiple stat vars and entities."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return util.series_core(entities, variables, False)


@bp.route('/all')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_all():
  """Handler to get all the time series given multiple stat vars and places."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return util.series_core(entities, variables, True)


@bp.route('/within')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_within():
  """Gets the observation for child entities of a certain place
  type contained in a parent entity at a given date.

  Note: the perferred facet is returned.
  """
  parent_entity = request.args.get('parent_entity')
  if not parent_entity:
    return 'error: must provide a `parent_entity` field', 400
  child_type = request.args.get('child_type')
  if not child_type:
    return 'error: must provide a `child_type` field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  return util.series_within_core(parent_entity, child_type, variables, False)


@bp.route('/within/all')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_within_all():
  """Gets the observation for child entities of a certain place
  type contained in a parent entity at a given date.

  Note: all the facets are returned.
  """
  parent_entity = request.args.get('parent_entity')
  if not parent_entity:
    return 'error: must provide a `parent_entity` field', 400
  child_type = request.args.get('child_type')
  if not child_type:
    return 'error: must provide a `child_type` field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  return util.series_within_core(parent_entity, child_type, variables, True)


@bp.route('/binned')
@bp.route('/binned/<path:year>')
def series_binned(year='2022'):
  """Get observations binned by time-period.
  
  Used for pre-binning data for the histogram tile. Currently only "bins" data
  by returning only observations from a specific year.

  Args:
    year: the year to get observations for
  
  Returns:
    JSON response from server, with series containing only observations from 
    the specified year.
  """
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return get_binned_series(entities, variables, year)
