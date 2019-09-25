# Copyright 2020 Google LLC
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

"""Handlers for data charts."""

import base64
import datetime
import logging
import re
import zlib

import datacommons
import stat_config_pb2

from google.protobuf import text_format

DEFAULT_NUM_BARS = 4
MIN_PLACE_POP = 10000
DEFAULT_CHART_WIDTH = 400
DEFAULT_CHART_HEIGHT = 250
URL_FETCH_DEADLINE = 180  # seconds

# https://standards.google/guidelines/google-material/color/palettes.html#brand-palette
# https://standards.google/guidelines/google-material/color/palettes.html#expanded-palette
# with weight 600, 200, 800, 400
COLORS = [
    '#1A73E8',
    '#D93025',
    '#F9AB00',
    '#1E8E3E',
    '#E8710A',
    '#E52592',
    '#9334E6',
    '#12B5CB',
    '#AECBFA',
    '#F6AEA9',
    '#FDE293',
    '#A8DAB5',
    '#FDC69C',
    '#FBA9D6',
    '#D7AEFB',
    '#AE14F2',
    '#185ABC',
    '#B31412',
    '#EA8600',
    '#137333',
    '#C26401',
    '#B80672',
    '#7627BB',
    '#098591',
    '#669DF6',
    '#EE675C',
    '#FCC934',
    '#5BB974',
    '#FA903E',
    '#FF63B8',
    '#AF5CF7',
    '#4ECDE6',
]
CONTRAST_COLOR = '#8AB4F8'
CHART_MARGIN = 20
CHART_LEGEND_CHAR_WIDTH = 8
CHART_TITLE_HEIGHT = 30
CHART_SUBTITLE_HEIGHT = 25
CHART_X_AXIS_HEIGHT = 20
CHART_Y_AXIS_WIDTH = 45
CHART_BAR_VERT_MARGIN = 3
MAX_POPOBS_TYPES = 100
OBS_PROPS = ['measurementMethod', 'observationPeriod', 'measuredProp']

DEFAULT_LINE_CHART_WIDTH = 600

_DASHES = ['', '5, 5', '10, 5', '5, 10', '1, 5', '5, 1', '0.9', '5, 5, 1, 5']

# TODO(b/155484547) Read this from config.
LATEST_POPULATION_YEAR = 2018

def get_dash(i):
  return _DASHES[i % len(_DASHES)]


def get_color(i):
  return COLORS[i % len(COLORS)]


def get_golden_pop_obs_args():
  """Get pop obs args."""
  result = {}
  pop_obs_args_list = stat_config_pb2.PopObsArgsList()
  with open('pop_obs_args.textproto', 'rb') as f:
    proto_data = f.read()
    text_format.Parse(proto_data, pop_obs_args_list)
  for arg in pop_obs_args_list.arg:
    pop_type = arg.pop_type
    mprop = arg.mprop
    if arg.cpv:
      key = '{},{}'.format(pop_type, mprop)
      if arg.cpv[0].prop != '*':
        for s_pv in sorted(arg.cpv, key=lambda x: x.prop):
          key += ',{}'.format(s_pv.prop)
          if s_pv.val:
            key += ',{}'.format(s_pv.val)
      result[key] = {
          'st': arg.stat_type,
          'op': arg.obs_period,
          'mmethod': arg.mmethod,
          'mdenom': arg.mdenominator,
          'mqual': arg.mqualifier,
          'sfactor': arg.scaling_factor,
      }
  return result


golden_pop_obs_args = get_golden_pop_obs_args()


def parse_pop_obs_args(get_params, suffix=''):
  """Parses common arguments for getting observations.

  Args:
    get_params: Function to get the url parameters.
    suffix: Url parameter suffix.

  Returns:
    dict with the parsed values.
  """
  # Keys in camel case to match the keys returned by the API
  args = {}
  args['popType'] = get_params.get('popt' + suffix)
  args['measuredProp'] = get_params.get('mprop' + suffix, '')
  args['measurementMethod'] = get_params.get('mmethod' + suffix, '')
  args['observationPeriod'] = get_params.get('op' + suffix, '')
  args['measurementDenominator'] = get_params.get('mdenom' + suffix, '')
  args['measurementQualifier'] = get_params.get('mqual' + suffix, '')
  args['scalingFactor'] = get_params.get('sfactor' + suffix, '')
  args['observationDate'] = get_params.get('od' + suffix)
  args['statType'] = get_params.get('st' + suffix)
  args['legend'] = get_params.get('lg' + suffix, '')
  args['domId'] = get_params.get('domid' + suffix, '')

  constraints = {}
  cpv = get_params.getlist('cpv' + suffix)
  if cpv:
    for pv in cpv:
      pvs = pv.split(',')
      assert len(pvs) == 2
      constraints[pvs[0]] = pvs[1]

  args['constraints'] = constraints

  # URL always havs both contraining property and value. However in
  # golden_pop_obs_args, value may not be defined. The section below list all
  # potential keys, with or without value appended.
  key_prefix = '{},{}'.format(args['popType'], args['measuredProp'])
  ps = sorted(constraints, key=lambda constraint: constraint[0])
  potential_keys = [key_prefix]
  for p in ps:
    temp_potential_keys = []
    for k in potential_keys:
      k_with_v = k + ',{},{}'.format(p, constraints[p])
      k_without_v = k + ',{}'.format(p)
      # Append key with constraining value first so that when matching keys,
      # always check the key with constraining value first before downgrade to
      # key with only constraining property.
      temp_potential_keys.append(k_with_v)
      temp_potential_keys.append(k_without_v)
    potential_keys = temp_potential_keys

  # Assign key to popType + measuredProp. However, if any potential key is in
  # golden_pop_obs_args, us it as the key.
  key = key_prefix
  for k in potential_keys:
    if k in golden_pop_obs_args:
      key = k
      break

  if key in golden_pop_obs_args:
    # URL parameters, if set explicitly, trumps golden pop obs args.
    args['measurementMethod'] = (
        args['measurementMethod'] or golden_pop_obs_args[key]['mmethod'])
    args['observationPeriod'] = (
        args['observationPeriod'] or golden_pop_obs_args[key]['op'])
    args['statType'] = (args['statType'] or golden_pop_obs_args[key]['st'])
    args['measurementDenominator'] = (
        args['measurementDenominator'] or golden_pop_obs_args[key]['mdenom'])
    args['measurementQualifier'] = (
        args['measurementQualifier'] or golden_pop_obs_args[key]['mqual'])
    args['scalingFactor'] = (
        args['scalingFactor'] or golden_pop_obs_args[key]['sfactor'])
  return args


def check_obs(obs, po_args, props=OBS_PROPS):
  """Check with an observation matches the query argument."""
  keep = True
  for key in props:
    obs_arg = re.sub(r'(^DataCommonsAggregate$|^dcAggregate/)', '',
                     obs.get(key, ''))
    keep = keep and obs_arg == po_args.get(key, '')

  return keep and po_args['statType'] in obs


def filter_val(obs_list, po_args):
  """Function to filter observation values.

  Args:
    obs_list: is the list of observations fron datacommons.get_place_obs.
    po_args: is the result of parse_pop_obs_args

  Returns:
    the stat from the list of observations based on given pop_obs_args
    (or None if not found).
  """
  for obs in obs_list:
    if check_obs(obs, po_args):
      return obs[po_args['statType']]
  return None


def filter_place_obs_vals(places, place_obs, pop_obs_args):
  """Filter place observation values.

  Args:
    places: is a set of geoId's to filter for
    place_obs: is the result of dc.get_place_obs
    pop_obs_args: is the result of parse_pop_obs_args

  Returns:
    a pair of:
      dict of {geoId: observed value}
      dict of {geoId: name}
    for the list of given places
  """
  data = {}
  names = {}
  for el in place_obs:
    if el['place'] in places:
      data[el['place']] = filter_val(el['observations'], pop_obs_args)
      names[el['place']] = el['name']
  return data, names


def get_and_filter_places_in(dcid, ptype):
  """Get and filter the places in another place.

  Args:
    dcid: dcid of the parent place.
    ptype: place type for the children places.

  Returns:
    a list of places contained in the dcid, constrained by type and
    filtered for outliers
  """
  if not dcid:
    return []
  place_dcids = datacommons.get_places_in([dcid], ptype)[dcid]
  place_pops = datacommons.get_populations(place_dcids, 'Person')
  place_obs = datacommons.get_observations(
      list(place_pops.values()),
      'count',
      'measuredValue',
      '2017',
      measurement_method='CensusACS5yrSurvey')
  pop_place = {v: k for k, v in place_pops.items()}
  return set(
      [pop_place[k] for k, v in place_obs.items() if v > MIN_PLACE_POP])


def get_ancestor_places(dcid):
  """Get all containing or geoOverlaps places of higher place types.

  Args:
    dcid: dcid of the place.

  Returns:
    a list of places containing or overlapping with the dcid, of a larger
    place type.
  """
  if not dcid:
    return []
  else:
    # Hardcoded
    return ['geoId/26', 'country/USA']


# TODO(b/149601841): refactor result to return a dict[dcid][date]
# that approach might be better than the commented out attempt.
def get_place_population(dcids):
  result = {}
  keys = [dcid + '^count^CensusACS5yrSurvey^^measured^^^^Person' for dcid in dcids]
  chart_data = datacommons.get_chart_data(keys)
  for key, data in chart_data.items():
    dcid = key.split('^')[0]
    for date, v in data['obsTimeSeries']['val'].items():
      result[(dcid, date)] = v
  return result

# TODO(b/155485304): Add unit test for this.
def get_plot_data(place_args, pc, gr):
  keys = set()
  key_to_idx = {}
  all_places = set()
  dcid_name = {}

  for idx, (dcids, po_args) in place_args.items():
    all_places |= set(dcids)
    for dcid in dcids:
      key_parts = [
          dcid, po_args['measuredProp'], po_args['measurementMethod'],
          po_args.get('observationPeriod', ''),
          po_args.get('statType', '').replace('Value', ''),
          po_args.get('measurementDenominator', ''),
          po_args.get('measurementQualifier', ''),
          po_args.get('scalingFactor', ''), po_args['popType']
      ]
      ps = sorted(po_args['constraints'].keys())
      for p in ps:
        key_parts.extend([p, po_args['constraints'][p]])
      key = '^'.join(key_parts)
      keys.add(key)
      key_to_idx[key] = idx

  chart_data = datacommons.get_chart_data(list(keys))
  result = []
  for key, data in chart_data.items():
    dcid = key.split('^')[0]
    points = [(date, v) for date, v in data['obsTimeSeries']['val'].items()]
    result.append({
        'idx': key_to_idx[key],
        'dcid': dcid,
        'name': data['obsTimeSeries']['placeName'],
        'points': sorted(points, key=lambda x: x[0]),
        'domid': place_args[key_to_idx[key]][1]['domId']
    })
    dcid_name[dcid] = data['obsTimeSeries']['placeName']
  for dcid in all_places:
    if dcid not in dcid_name:
      dcid_name[dcid] = dcid

  if pc:
    place_population = get_place_population(all_places)
    for d in result:
      pc_data = []
      for point in d['points']:
        try:
          dt = datetime.datetime.strptime(point[0], '%Y')
        except ValueError:
          try:
            dt = datetime.datetime.strptime(point[0], '%Y-%m')
          except ValueError:
            try:
              dt = datetime.datetime.strptime(point[0], '%Y-%m-%d')
            except:
              return []
        point_key = (d['dcid'], str(dt.year))
        if point_key not in place_population:
          point_key = (d['dcid'], str(LATEST_POPULATION_YEAR))
        if place_population[point_key] < 0:
          raise ValueError('Population for %s is %f' %
                            (d['dcid'], place_population[point_key]))
        pc_data.append(
            (point[0], point[1] / float(place_population[point_key])))
      d['points'] = pc_data
  elif gr:
    for d in result:
      gr_data = []
      for i, point in enumerate(d['points']):
        if i > 0:
          grow_rate = ((d['points'][i][1] - d['points'][i - 1][1]) /
                        abs(d['points'][i - 1][1])) * 100
          gr_data.append((d['points'][i][0], grow_rate))
      d['points'] = gr_data
  return result, dcid_name


class ChartHandler(object):
  """Parent handler to handle chart api."""
  def __init__(self, get_params):
    width = get_params.get('w')
    height = get_params.get('h')
    max_total_width = get_params.get('maxw')
    title = get_params.get('title')
    subtitle = get_params.get('subtitle', '')
    self.get_params = get_params
    self.width = int(width) if width else DEFAULT_CHART_WIDTH
    self.height = int(height) if height else DEFAULT_CHART_HEIGHT
    self.max_total_width = int(max_total_width) if max_total_width else 0
    self.title = title if title else ''
    self.subtitle = subtitle if subtitle else ''

  def chart_layout_data(self, plot_data, has_legend=False):
    """Common chart layout calculations based on data passed into the template.

    This is used by scatter plots.

    Args:
      plot_data: The data to be plot.
      has_legend: If the chart has legend.

    Returns:
      A dict with the layout information.
    """
    layout = {}
    layout['height'] = self.height
    layout['title'] = self.title
    layout['margin'] = CHART_MARGIN
    layout['title_height'] = CHART_TITLE_HEIGHT if self.title else 0
    layout['subtitle1_height'] = 0
    layout['subtitle2_height'] = 0
    if self.subtitle:
      lines = self.subtitle.split('\n')
      if len(lines) > 2:
        raise ValueError('Maximum allows subtitle lines=2.')
      layout['subtitle1'] = lines[0]
      layout['subtitle1_height'] = CHART_SUBTITLE_HEIGHT
      if len(lines) == 2:
        layout['subtitle2'] = lines[1]
        layout['subtitle2_height'] = CHART_SUBTITLE_HEIGHT
    layout['x_axis_height'] = CHART_X_AXIS_HEIGHT
    layout['y_axis_width'] = CHART_Y_AXIS_WIDTH
    layout['chart_area_height'] = (
        self.height - layout['x_axis_height'] - layout['title_height'] -
        layout['subtitle1_height'] - layout['subtitle2_height'] -
        2 * CHART_MARGIN)

    # Compute width
    layout['chart_area_width'] = self.width
    if has_legend:
      max_name_len = max([len(x['name']) for x in plot_data['plot_data']])
      layout['legend_width'] = max_name_len * CHART_LEGEND_CHAR_WIDTH
    else:
      layout['legend_width'] = 0

    layout['width'] = (
        layout['chart_area_width'] + layout['y_axis_width'] + 2 * CHART_MARGIN +
        layout['legend_width'])
    if self.max_total_width and layout['width'] > self.max_total_width:
      layout['width'] = self.max_total_width
      layout['legend_width'] = (
          layout['width'] - layout['chart_area_width'] -
          layout['y_axis_width'] - 2 * CHART_MARGIN)

    layout['y_ratio'] = (layout['chart_area_height'] /
                         (plot_data['y_max'] - plot_data['y_min']))
    layout['x_ratio'] = (layout['chart_area_width'] /
                         (plot_data['x_max'] - plot_data['x_min']))

    # TODO(boxu): Add more tick marks to the axes
    x_axis_data = [plot_data['x_min'], plot_data['x_max']]
    layout['x_axis_ticks'] = x_axis_data
    y_axis_data = [plot_data['y_min'], plot_data['y_max']]
    layout['y_axis_ticks'] = y_axis_data
    return layout
