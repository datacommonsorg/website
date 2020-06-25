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

"""Library for computing chart coordinates for data points and labels.

For a given set of data points in the form of (time, value), compute the
corresponding coordinates on the line chart, as well as the
appropriate ticks on X and Y axes.
"""

import datetime
import math
import sys

_LOG_BASE = 2.236
_BUF_LEFT = 15
_BUF_RIGHT = 15
_DEFAULT_X_RANGE = 10
# Float prevents flooring on division.
_DAYS_IN_LEAP = 366.0
_DAYS_IN_NONLEAP = 365.0


def _float_to_datetime(date_float):
  """Helper to convert year-equivalent float to datetime object."""

  yr = int(date_float)  # Floor
  new_yr = datetime.date(yr, 1, 1)
  days = _DAYS_IN_NONLEAP if yr % 4 else _DAYS_IN_LEAP
  return new_yr + datetime.timedelta(int((date_float - yr) * days) - 1)


def _datetime_to_float(dt_obj):
  """Helper to convert datetime object to year-equivalent float."""
  yr = dt_obj.year
  days = _DAYS_IN_NONLEAP if yr % 4 else _DAYS_IN_LEAP
  return yr + dt_obj.timetuple()[7] / days


def _small_compute_x_ticks_helper(x_min, x_max, delta):
  """Helper to compute position and label for x axis spanning at most 1.5 years.

  If the time delta is at most half a year, have at most 7 monthly ticks.
  If the time delta is at most 1 year, have at most 7 bimonthly ticks.
  If the time delta is at most 1.5 years, have at most 7 quarterly ticks.

  Args:
    x_min: float, approximation of smallest date in years. 2020-07-01 ~ 2020.5.
    x_max: float, approximation of largest date in years 2021-01-01 ~ 2021.0.
    delta: float, time difference of x_max - x_min (expressed in years).

  Returns:
    A list of pairs of X ticks (val, text).
  """
  if delta <= 5/12.0:
    # Monthly
    step_size = 1
  elif delta <= 11/12.0:
    # Bimonthly
    step_size = 2
  elif delta <= 17/12.0:
    # Quarterly
    step_size = 3
  result = []
  min_date = _float_to_datetime(x_min)
  max_date = _float_to_datetime(x_max)
  last_month = max_date.month + step_size
  last_year = max_date.year + last_month / 12
  if last_month > 12:
    last_month %= 12
  last_tick = datetime.date(int(last_year), last_month, 1)
  curr_tick = datetime.date(min_date.year, min_date.month, 1)
  while curr_tick <= last_tick:
    result.append((_datetime_to_float(curr_tick), curr_tick.strftime('%b %Y')))
    updated_month = curr_tick.month + step_size
    updated_year = curr_tick.year + updated_month / 12
    if updated_month > 12:
      updated_month %= 12
    curr_tick = datetime.date(int(updated_year), updated_month, 1)
  return result


def _compute_x_ticks(time_values):
  """Compute the x values to be used as x ticks given a series of time values.

  If there are less than 10 years, use a step size of 2 years. Otherwise, the
  ticks should be the multiple of 5 or 10 years like '2005', '2010', and the
  tick step should be multiple of 5, with 4 to 6 ticks in total.

  Args:
    time_values: A collection of float values as time in years.

  Returns:
    A list of pairs of X ticks (val, text).
  """
  x_min = float(min(time_values))
  x_max = float(max(time_values))
  delta = x_max - x_min
  if delta <= 17/12.0:
    result = _small_compute_x_ticks_helper(x_min, x_max, delta)
  elif delta < 10:
    result = [(val, str(val))
              for val in range(int(x_min),
                               int(math.ceil(x_max)) + 2, 2)]
    result[-1] = (int(math.ceil(x_max)), str(int(math.ceil(x_max))))
  else:
    # Use step size in the multiple of 10 years and optimal 5 ticks.
    # This leads to an increment of 40.
    step_unit = round(delta / 40.0)
    if step_unit == 0:
      step_size = 5
    else:
      step_size = 10 * step_unit
    min_ind = int(math.floor(x_min / step_size))
    max_ind = int(math.ceil(x_max / step_size))
    result_vals = [int(step_size * i) for i in range(min_ind, max_ind + 1)]
    result_vals[-1] = int(math.ceil(x_max))
    result = [(val, str(val)) for val in result_vals]

  # If there is only single point, set a default x range.
  if len(result) == 1:

    result_vals = [
        result[0][0] - _DEFAULT_X_RANGE / 2, result[0][0] + _DEFAULT_X_RANGE / 2
    ]
    result = [(val, str(val)) for val in result_vals]
  return result


def _compute_y_ticks(y_min, y_max):
  """Computes the Y axis ticks.

  We would like to to use step size of 0.5, 1, 2 with optimal 5 ticks and worse
  case 4 or 6 ticks. The range coverage would be 2 to 5 steps for given step
  size. This corresponds to range coverage of [1, 2.5], [2, 5], [5, 12.5] when
  the range is scaled between 1 to 10.

  (1, 0) and (5, 2) can fit to function f(x) = loga(x), which results in
  a = sqrt(5) = 2.236. Also as 2 < 2.236 < 2.5, this function fits to our need
  and can be used to convert a scaled range to index of y step.

  Args:
    y_min: A float number that is the minimum y value in all data points.
    y_max: A float number that is the maximum y value in all data points.

  Returns:
    A list of pairs of Y ticks (val, text).

  Raises:
    ValueError: if the input is larger than a Quintillion.
  """
  y_diff = max([abs(y_max), abs(y_min), y_max - y_min])
  if y_diff >= 1e18:
    raise ValueError('Does not handle number larger than Quintillion.')
  suffixes = [(15, 'Q'), (12, 'T'), (9, 'B'), (6, 'M'), (3, 'K'), (0, ''),
              (-3, ''), (-6, 'e-6'), (-9, 'e-9')]
  expn, name = max(x for x in suffixes if y_diff > math.pow(10, x[0]))
  unit = math.pow(10, expn)
  y_diff = y_diff / unit  # Scale y_diff to 1 - 1000
  y_max /= unit
  y_min /= unit
  exp = math.log10(y_diff)
  scale = math.floor(exp)
  idx = math.floor(math.log(math.pow(10, exp - scale), _LOG_BASE))
  step = 0.5 * math.pow(2, idx)

  res = []
  low_tick = 0.0
  while low_tick > y_min:
    low_tick -= step * math.pow(10, scale)
  for i in range(0, 6):
    y_val = low_tick + i * step * math.pow(10, scale)
    if abs(y_val) < 1e-9:
      y_text = '0'
    elif expn == -3:
      y_text = '{}{}'.format(y_val * unit, name)
    elif scale == 0 and idx == 0:  # This is the case for 0.5, 1.0, 1.5, ...
      y_text = '{:.1f}{}'.format(y_val, name)
    else:
      y_text = '{:.0f}{}'.format(y_val, name)
    res.append((y_val * unit, y_text))
    if y_val >= 0.0 and y_val > y_max:
      break
  return res


def round_significant_digits(n, sd):
  """Round the given number by significant digits.

  Args:
    n: The given number, either integer or floating point number.
    sd: Significant digits.

  Returns:
    Rounded number.
  """
  if n == 0:
    return 0
  return round(n, -int(math.floor(math.log10(abs(n))) - (sd - 1)))


def transform(val, origin_val, origin_pos, scale):
  """Transform a data point value to the coordinates under chart scale.

  Args:
    val: A pair of (x, y) value of the data point.
    origin_val: A pair of (x, y) value of the chart origin.
    origin_pos: A pair of (x_pos, y_pos) position of the chart origin.
    scale: A pair of (x_scale, y_scale) value.

  Returns:
    A pair of data point position.
  """
  x_pos = (val[0] - origin_val[0]) * scale[0] + origin_pos[0]
  y_pos = origin_pos[1] - (val[1] - origin_val[1]) * scale[1]
  return (x_pos, round_significant_digits(y_pos, 4))


def compute(data, xbound, ybound):
  """Computes chart coordinates from data points.

  Args:
    data: A list of lists of pairs of (time, value).
    xbound: A pair of the min and max x value of the chart x coordinate.
    ybound: A pair of the min and max y value of the chart y coordinate.

  Returns:
    A tuple of data coordinates, x ticks and y ticks.
  """
  if not data:
    raise ValueError('Data cannot be empty.')

  if (len(xbound) != 2 or xbound[0] < 0 or xbound[1] < 0 or
      xbound[0] > xbound[1]):
    raise ValueError('xbound is invalid: %s' % xbound)

  if (len(ybound) != 2 or ybound[0] < 0 or ybound[1] < 0 or
      ybound[0] > ybound[1]):
    raise ValueError('ybound is invalid: %s' % ybound)

  y_min = sys.maxsize
  y_max = -sys.maxsize
  x_set = set()
  input_list = []
  for data_points in data:
    one_time_series = []
    for time_str, y_val in data_points:
      # Parse X input.
      # Time in '%Y' or '%Y-%m' or '%Y-%m-%d' format.
      try:
        dt = datetime.datetime.strptime(time_str, '%Y')
        x_val = dt.year
      except ValueError:
        try:
          dt = datetime.datetime.strptime(time_str, '%Y-%m')
          x_val = dt.year + dt.month / 12.0
        except ValueError:
          try:
            dt = datetime.datetime.strptime(time_str, '%Y-%m-%d')
            x_val = _datetime_to_float(dt)
          except:
            raise ValueError('Invalid time value: %s.' % time_str)
      x_set.add(x_val)
      # Parse Y input.
      try:
        y_val = float(y_val)
      except ValueError:
        raise ValueError('Data values must be numeric.')
      y_max = max(y_val, y_max)
      y_min = min(y_val, y_min)
      one_time_series.append((x_val, y_val))
    input_list.append(one_time_series)

  x_ticks = _compute_x_ticks(x_set)
  x_ticks_vals = [x[0] for x in x_ticks]

  y_ticks = _compute_y_ticks(y_min, y_max)
  y_ticks_vals = [y[0] for y in y_ticks]

  # Put extra buffer on left and right side.
  origin_val = (min(x_ticks_vals), min(y_ticks_vals))
  origin_pos = (xbound[0] + _BUF_LEFT, ybound[1])
  x_scale = (xbound[1] - xbound[0] - _BUF_LEFT -
             _BUF_RIGHT) / float(max(x_ticks_vals) - min(x_ticks_vals))
  y_scale = (ybound[1] -
             ybound[0]) / float(max(y_ticks_vals) - min(y_ticks_vals))
  scale = (x_scale, y_scale)

  output_list = []
  for one_time_series in input_list:
    # Transform a time series value (time, value) to svg coordinate (x, y) by
    # applying a transformation based on the plot origin point and a scaling
    # factor.
    output_list.append([
        transform(val, origin_val, origin_pos, scale) for val in one_time_series
    ])

  output_xticks = []
  for val, label in x_ticks:
    x, y = transform((val, min(y_ticks_vals)), origin_val, origin_pos, scale)
    output_xticks.append((x, y, label))

  output_yticks = []
  origin_pos = (xbound[0], ybound[1])
  for val, label in y_ticks:
    x, y = transform((min(x_ticks_vals), val), origin_val, origin_pos, scale)
    output_yticks.append((x, y, label))

  return output_list, output_xticks, output_yticks
