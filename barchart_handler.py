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

"""Library to build bar charts."""

import collections
import logging

import jinja2

import datacommons
import datachart_handler as ch
import quantity_range as qr

UNIT = ('Years', 'USDollar', 'Rooms', 'Room', 'Year')

CHAR_WIDTH = 7.3

MAX_BAR_HEIGHT = 40

# These are manually curated  buckets. The raw value quantity ranges
# are grouped and aggregated into these buckets.
AGGREGATED_BUCKET = {
    'homeValue': [
        'USDollarUpto99999', 'USDollar100000To199999', 'USDollar200000To499999',
        'USDollar500000To999999', 'USDollar1000000To1999999',
        'USDollar2000000Onwards'
    ],
    'grossRent': [
        'USDollarUpto499', 'USDollar500To999', 'USDollar1000To1999',
        'USDollar2000To2999', 'USDollar3000Onwards'
    ],
    'numberOfRooms': ['Room1', 'Room2', 'Room3', 'Room4To6', 'Room7Onwards']
}

AGGREGATED_QUANT_RANGE = {
    p: [qr.parse(qs) for qs in v] for p, v in AGGREGATED_BUCKET.items()
}


def filter_and_sort(values):
  if not values[0]['prop'].startswith(UNIT):
    return values
  temp = [(qr.parse(value['prop']), value) for value in values]
  temp.sort(key=lambda x: x[0].low)
  return [t[1] for t in temp]


def per_capita(place_vals, place_pop, factor=1):
  """Calculate per capital stats for each place.

  Args:
    place_vals: a dictionary mapping each place to an observed value.
    place_pop: a dictionary mapping each place to its population for some year.
    factor: number of people in the per capita denominator. Default 1.

  Returns:
    dictionary of place to observed value per <factor> people.
  """
  if factor:
    assert factor >= 1, 'Per capita factor must be greater than or equal to 1.'
  for dcid, val in place_pop.items():
    if val < 0:
      raise ValueError('Population is for %s is %s' % (dcid, val))
  place_vals = {
      dcid: factor * place_vals[dcid] / place_pop[dcid]
      for dcid in place_vals
  }
  return place_vals


def top_values(place_vals,
               num_to_include,
               is_top=True,
               is_comp=True):
  """Get the top values from place data.

  Args:
    place_vals: place values from chartdata_handlers.filter_place_obs_vals
    num_to_include: number of bars to include.
    is_top: is top stats to plot.
    is_comp: is the comparison stats to pick.

  Returns:
    sorted list of (place id, val) tuples
  """
  top_vals = []
  sorted_obs = sorted(place_vals.items(), key=lambda x: x[1], reverse=is_top)
  for i, (dcid, val) in enumerate(sorted_obs):
    if i < num_to_include or (is_comp and i == len(sorted_obs) - 1):
      top_vals.append((dcid, val))
  return top_vals


def filter_pops_obs(pops, po_args):
  """Filter all pops returned by get_pop_obs and return the desired pop."""
  cpv = {}
  cp = None
  if 'constraints' in po_args:
    for p, v in po_args['constraints'].items():
      if v == '_':
        cp = p
      else:
        cpv[p] = v
  kept_pop = []
  for pop_id, pop in pops.items():
    if pop['popType'] != po_args['popType']:
      continue
    if not po_args['constraints']:
      if 'propertyValues' not in pop:
        kept_pop.append(pop_id)
    else:
      if 'propertyValues' not in pop:
        # constraints is not null, but pop doesn't have any PVs
        continue
      if (len(pop['propertyValues']) == len(po_args['constraints']) and
          cpv.viewitems() <= pop['propertyValues'].viewitems() and
          cp in pop['propertyValues']):
        kept_pop.append(pop_id)
  return kept_pop, cp


def filter_obs(pop, po_args):
  """Filter the observation of a property.

  Args:
    pop: the returned value of datacommons.get_pop_obs
    po_args: the url parameter arguments.

  Returns:
    the desired observation.
  """
  for obs in pop['observations']:
    if ch.check_obs(obs, po_args, ch.OBS_PROPS + ['observationDate']):
      return obs
  return None


class BarChartHandler(ch.ChartHandler):
  """Handler for /datachart/bar.

  See go/datcom-img-api for full list of params.
  """

  def __init__(self, get_params):
    super(BarChartHandler, self).__init__(get_params)

  def group_range(self, values, cp):
    if cp not in AGGREGATED_QUANT_RANGE:
      return values
    qr_group = AGGREGATED_QUANT_RANGE[cp]
    temp = collections.Counter()
    for value in values:
      qr_curr = qr.parse(value['prop'])
      for qr_item in qr_group:
        if qr_curr.in_range(qr_item):
          temp[qr_item] += value['val']
    return [{'prop': str(key), 'val': val} for key, val in temp.items()]

  def add_name(self, values):
    for i in range(len(values)):
      try:
        values[i]['name'] = qr.parse(values[i]['prop']).display_text()
      except ValueError:
        values[i]['name'] = values[i]['prop'].replace(
            'HousingUnit', '').replace('Occupied', ' Occupied')
    return values

  def bar_layout_data(self, plot_data):

    label_width = max([len(d['name']) for d in plot_data['data']]) * CHAR_WIDTH

    layout = {}
    layout['width'] = self.width
    layout['height'] = self.height
    layout['title'] = self.title
    layout['subtitle1_height'] = 0
    layout['subtitle2_height'] = 0
    if self.subtitle:
      lines = self.subtitle.split('\n')
      if len(lines) > 2:
        raise ValueError('Maximum allows subtitle lines=2.')
      layout['subtitle1'] = lines[0]
      layout['subtitle1_height'] = ch.CHART_SUBTITLE_HEIGHT
      if len(lines) == 2:
        layout['subtitle2'] = lines[1]
        layout['subtitle2_height'] = ch.CHART_SUBTITLE_HEIGHT
    layout['margin'] = ch.CHART_MARGIN
    layout['title_height'] = ch.CHART_TITLE_HEIGHT if self.title else 0
    layout['label_width'] = label_width
    layout['bar_vert_margin'] = ch.CHART_BAR_VERT_MARGIN

    num_rows = len(plot_data['data'])
    chart_area_height = (
        self.height - layout['title_height'] - layout['subtitle1_height'] -
        layout['subtitle2_height'] - 2 * ch.CHART_MARGIN)
    layout['bar_height'] = min(
        MAX_BAR_HEIGHT, chart_area_height / num_rows - ch.CHART_BAR_VERT_MARGIN)
    layout['bar_area_width'] = self.width - label_width - ch.CHART_MARGIN
    return layout

  def render_chart_op(self, place_vals, place_names, num_to_include, is_comp):
    data = {}
    colors = [ch.COLORS[0]] * num_to_include
    if is_comp:
      colors.append(ch.CONTRAST_COLOR)
    data['colors'] = colors

    values = []
    val_max = 0
    for k, v in place_vals:
      d = {}
      d['name'] = place_names[k]
      d['val'] = v
      val_max = max(val_max, v)
      values.append(d)
    data['data'] = values  # Find a better upper bound
    data['values_max'] = val_max  # Find a better upper bound
    data.update(self.bar_layout_data(data))
    return data

  def render_chart_mp(self, places_data, place_names, dcids, od):
    data = {}
    colors = [ch.COLORS[0]] * len(places_data)
    data['colors'] = colors
    values = []
    val_max = 0
    for dcid in dcids:
      for place in places_data:
        if dcid == place['dcid']:
          d = {}
          dcid = place['dcid']
          d['name'] = place_names[dcid]
          d['val'] = 0
          for point in place['points']:
            if point[0] == od:
              d['val'] = point[1]
              break
          val_max = max(val_max, d['val'])
          values.append(d)
    data['data'] = values  # Find a better upper bound
    data['values_max'] = val_max  # Find a better upper bound
    data.update(self.bar_layout_data(data))
    return data

  def render_chart_rp(self, ordered_place_data):
    # TODO(tjann): use place_ranks parameter to construct a subtitle after
    # implementing subtitle feature.
    data = {}
    colors = [ch.COLORS[0]] * len(ordered_place_data)
    data['colors'] = colors

    values = []
    val_max = 0
    for _, pl_data in ordered_place_data.items():
      d = {}
      d['name'] = pl_data['name']
      d['val'] = pl_data['val']
      if d['val'] < 0 and d['name'] in ['Michigan', 'United States']:
        d['val'] = 1.23456789
      val_max = max(val_max, d['val'])
      values.append(d)
    data['data'] = values  # Find a better upper bound
    data['values_max'] = val_max  # Find a better upper bound
    data.update(self.bar_layout_data(data))
    # data['subtitle'] = 'Insert Rank Information'
    return data

  # TODO(tjann): use per_capita before passing into this func.
  def render_chart_av(self, obs_dict, num_to_include, stat_type, cp, scale):
    data = {}
    colors = [ch.COLORS[0]] * num_to_include
    data['colors'] = colors

    values = []
    for prop_name, obs in obs_dict.items():
      d = {'prop': prop_name}
      d['val'] = round(obs[stat_type] / scale, 3)
      values.append(d)

    if self.request.GET.get('group') == '1':
      values = self.group_range(values, cp)
    values = self.add_name(values)
    if values:
      if values[0]['prop'].startswith(UNIT):
        values = filter_and_sort(values)
      else:
        values.sort(key=lambda x: x['val'])
    values = values[:num_to_include]
    data['data'] = values  # Find a better upper bound
    data['values_max'] = max([x['val'] for x in values])
    data.update(self.bar_layout_data(data))
    return data

  def get_data(self):
    gr = self.get_params.get('gr') is not None  # Growth Rate
    dcids = self.get_params.getlist('mid')
    place_args = {'': (dcids, ch.parse_pop_obs_args(self.get_params, ''))}
    place_dcid = dcids[0]
    pc = self.get_params.get('pc')
    num_to_include = self.get_params.get('n')
    num_to_include = int(
        num_to_include if num_to_include else ch.DEFAULT_NUM_BARS)
    po_args = ch.parse_pop_obs_args(self.get_params)

    chart_type = self.get_params.get('t')
    logging.info('chart type %s', chart_type)
    if chart_type == 'mp':
      plot_data, dcid_name = self.get_plot_data(place_args, pc, gr)
      return self.render_chart_mp(plot_data, dcid_name, dcids,
                           po_args['observationDate'])

    elif chart_type == 'op':
      place_type = self.get_params.get('placet')
      order = self.get_params.get('order')
      is_top = (order if order else '').lower() == 'highest'
      is_comp = self.get_params.get('comp') is not None

      if po_args['popType'] == 'AcademicAssessmentEvent':
        if po_args['constraints']['schoolSubject'] == 'Mathematics':
          place_vals = [(u'nces/260110307481', 1503.7),
                        (u'nces/260023201202', 1500.1),
                        (u'nces/260110307754', 1497.0),
                        ('nces/260027801484', 1495.2)]
          place_names = {
              'nces/260110307481': 'Bates Academy',
              'nces/260023201202': 'Detroit Edison Public School Academy',
              'nces/260110307754': 'Clippert Academy',
              'nces/260027801484': 'Detroit Merit Charter Academy'
          }
        else:
          place_vals = [(u'nces/260110307481', 1496.6),
                        (u'nces/260110304675', 1490.1),
                        (u'nces/260023201202', 1486.9),
                        ('nces/260013908078', 1484.7)]
          place_names = {
              'nces/260110307481': 'Bates Academy',
              'nces/260110304675': 'Chrysler Elementary School',
              'nces/260023201202': 'Detroit Edison Public School Academy',
              'nces/260013908078': 'Cesar Chavez Academy Intermediate'
          }

      else:
        # Handle errors better
        places = ch.get_and_filter_places_in(place_dcid, place_type)
        place_obs = datacommons.get_place_obs(place_type,
                                              po_args['observationDate'],
                                              po_args['popType'],
                                              po_args['constraints'])
        place_vals, place_names = ch.filter_place_obs_vals(
            places, place_obs, po_args)
        place_pop = None
        if pc:
          dcids = place_vals
          place_population = ch.get_place_population(dcids)
          od = po_args['observationDate']
          place_pop = {
              dcid: place_population[(dcid, od)] for dcid in place_vals
          }
          place_vals = per_capita(place_vals, place_pop)
        place_vals = top_values(place_vals, num_to_include, is_top, is_comp)
      return self.render_chart_op(place_vals, place_names, num_to_include, is_comp)
    elif chart_type == 'rp':
      if pc:
        try:
          pc = int(pc)
          assert pc >= 1
        except:
          raise ValueError('pc option must be a positive integer: %r' % pc)
      place_ranks = {
          'geoId/2603000': (999, 'USA Cities'),  # Ann Arbor, among all cities
          'geoId/0649670': (999, 'USA Cities'),  # MTV, among all cities
          'geoId/26': (999, 'USA States'),  # Michigan, among all States
          'geoId/2622000': (999, 'USA Cities')  # Detroit
      }
      DETROIT_5G_MATH_CPV = {
          'assessmentType': 'MichiganStudentTestOfEducationalProgress',
          'schoolGradeLevel': 'SchoolGrade5',
          'schoolSubject': 'Mathematics'
      }
      DETROIT_5G_ELA_CPV = {
          'assessmentType': 'MichiganStudentTestOfEducationalProgress',
          'schoolGradeLevel': 'SchoolGrade5',
          'schoolSubject': 'EnglishLanguageArts'
      }

      if (place_dcid == 'geoId/2622000' and
          po_args['popType'] == 'AcademicAssessmentEvent' and
          po_args['measuredProp'] == 'scaledScore' and
          po_args['statType'] == 'meanValue' and
          po_args['observationDate'] == "2019"
         ):  # make sure our hardcoding doesn't overtrigger
        places = ['geoId/2622000', 'geoId/26163', 'geoId/26']

        if po_args['constraints'] == DETROIT_5G_MATH_CPV:
          place_vals = {
              'geoId/2622000': 1463.2,
              'geoId/26163': 1480.1,
              'geoId/26': 1487.6
          }
        elif po_args['constraints'] == DETROIT_5G_ELA_CPV:
          place_vals = {
              'geoId/2622000': 1471.9,
              'geoId/26163': 1488.9,
              'geoId/26': 1496.0
          }
      else:
        places = [place_dcid] + ch.get_ancestor_places(place_dcid)

        # pl_dcid: pop_dcid
        place_pops = datacommons.get_populations(places, po_args['popType'],
                                                 po_args['constraints'])
        # pop_dcid: obs_val
        pop_obs = datacommons.get_observations(place_pops.values(),
                                               po_args['measuredProp'],
                                               po_args['statType'],
                                               po_args['observationDate'],
                                               po_args['observationPeriod'],
                                               po_args['measurementMethod'])
        # pl_dcid: obs_val
        place_vals = {
            pl_dcid: pop_obs[pop_dcid]
            for pl_dcid, pop_dcid in place_pops.items()
        }
        # Hardcoding, but ultimately changed again in render_chart_rp due to pc
        place_vals['geoId/26'] = -999
        place_vals['country/USA'] = -999

      place_names = {
          k: v[0]
          for k, v in datacommons.get_property_values(places, 'name').items()
      }

      if pc:
        place_population = ch.get_place_population(places)
        population_od = po_args['observationDate'][:4]
        # TODO(b/149601841): URGENT--replace this with reading latest_obs_date
        if population_od > '2018':
          population_od = '2018'

        place_pop = {
            dcid:
            place_population[(dcid, population_od)]
            for dcid in places
        }
        place_vals = per_capita(place_vals, place_pop, factor=pc)
      # Order by place type
      ordered_place_data = collections.OrderedDict()
      for p in places:
        ordered_place_data[p] = {'val': place_vals.get(p),
                                 'rank': place_ranks.get(p),
                                 'name': place_names.get(p)}
      return self.render_chart_rp(ordered_place_data)
    elif chart_type == 'av':
      pop_obs = datacommons.get_pop_obs(place_dcid)
      pops = pop_obs['populations']
      kept_pop_ids, cp = filter_pops_obs(pops, po_args)
      kept_obs = {}
      for pop_id in kept_pop_ids:
        obs = filter_obs(pops[pop_id], po_args)
        if obs:
          v = pops[pop_id]['propertyValues'][cp]
          kept_obs[v] = obs
      if pc:
        place_population = ch.get_place_population([place_dcid])
        od = po_args['observationDate']
        scale = place_population[(place_dcid, od)]
      else:
        scale = 1
      return self.render_chart_av(kept_obs, num_to_include, po_args['statType'], cp,
                           scale)