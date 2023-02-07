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
"""Common library for functions used by multiple tools"""

import re

import server.services.datacommons as dc


def names(dcids):
  """Returns display names for set of dcids.

  Args:
      dcids: A list of DCIDs.

  Returns:
      A dictionary of display place names, keyed by dcid.
  """
  response = dc.property_values(dcids, 'name')
  result = {}
  for dcid in dcids:
    result[dcid] = ''
    if dcid in response:
      values = response[dcid]
      if values and len(values) > 0:
        result[dcid] = values[0]
  return result


def is_float(query_string):
  """Checks if a string can be converted to a float"""
  try:
    float(query_string)
    return True
  except ValueError:
    return False


def get_stat_vars(configs):
  """Gets all the stat vars and denominators in the given list of chart configs.

  Args:
      configs: list of chart configs

  Returns:
      tuple consisting of
          set of all stat var dcids(if there are multiple stat vars in a config, only return the first one)
          set of all denominator stat var dcids
  """
  stat_vars = set()
  denoms = set()
  for config in configs:
    # only add the first sv
    if len(config.get('statsVars', [])) > 0:
      stat_vars.add(config['statsVars'][0])
    # can be deleted
    if 'relatedChart' in config and config['relatedChart'].get('scale', False):
      denoms.add(config['relatedChart'].get('denominator', 'Count_Person'))
    if len(config.get('denominator', [])) > 0:
      denoms.add(config['denominator'][0])
  return stat_vars, denoms


def get_date_range(dates):
  """ Gets the date range from a set of dates

  Args:
      dates: set of dates (strings)

  Returns:
      date range as a string. Either a single date or
      [earliest date] - [latest date]
  """
  dates = filter(lambda x: x != "", dates)
  sorted_dates_list = sorted(list(dates))
  if not sorted_dates_list:
    return ""
  date_range = sorted_dates_list[0]
  if len(sorted_dates_list) > 1:
    date_range = f'{sorted_dates_list[0]} – {sorted_dates_list[-1]}'
  return date_range


def is_valid_date(date):
  """
  Returns whether or not the date string is valid. Valid date strings are:
      1. empty or
      2. "latest" or
      3. of the form "YYYY" or "YYYY-MM" or "YYYY-MM-DD"
  """
  if not date or date == "latest" or re.match(r"^(\d\d\d\d)(-\d\d)?(-\d\d)?$",
                                              date):
    return True
  return False


def date_greater_equal_min(date, min_date):
  """
  Returns whether or not date is considered greater than or equal to min_date.
  A date is considered greater than or equal to min date if:
      1. there is no min date
      2. date is same granularity as min date and an equal or later date
      3. date is lower granularity and min date is either within date or date
          is later (eg. min date is 2015-01 and date is 2015)
      4. date is higher granularity and date is either within min date or
          later (eg. min date is 2015 and date is 2015-01)

  """
  if not date:
    return False
  return not min_date or date >= min_date or date in min_date


def date_lesser_equal_max(date, max_date):
  """
  Returns whether or not date is considered less than or equal to max_date.
  A date is considered less than or equal to max date if:
      1. there is no max date
      2. date is same granularity as max date and an equal or earlier date
      3. date is lower granularity and max date is either within date or date
          is earlier (eg. max date is 2015-01 and date is 2015)
      4. date is higher granularity and date is either within max date or
          earlier (eg. max date is 2015 and date is 2015-01)

  """
  if not date:
    return False
  return not max_date or date <= max_date or max_date in date
