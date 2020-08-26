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

"""Format UI text."""

import re
import constants

PREFIX = ['BLS_', 'USC_', 'CDC_', 'FBI_', 'UCR_']
DEFAULT_RANK = 100

RANGE_TEXT = {
    'Years': 'Years',
    'USDollar': '$',
    'Rooms': 'Rooms',
    'Year': 'Years',
    'Room': 'Rooms',
}


def format_title(title):
  """Format a raw title text to displayed text in UI."""
  if title in constants.ICD10:
    return constants.ICD10[title]
  if title in constants.NAICS:
    return constants.NAICS[title]
  if title in constants.DEA_DRUGS:
    return constants.DEA_DRUGS[title]
  if title in constants.EQ_MAGNITUDES:
    return constants.EQ_MAGNITUDES[title]
  if title in constants.NACE:
    return constants.NACE[title]
  for key in RANGE_TEXT:
    if title.startswith(key):
      return format_range(title, key)
  if title == 'PropertyCrime':
    return 'Property'
  if title == 'ViolentCrime':
    return 'Violent'
  if title == 'Nonveteran':
    return 'Non Veteran'
  if title == 'UCFENoStateUnemploymentInsurance':
    return 'Unemployment Compensation for Federal Employees'
  if title == 'UCXOnly':
    return 'Unemployment Compensation for Ex-servicemembers'

  for word in PREFIX:
    title = title.replace(word, '')

  if title == "HispanicOrLatinoRace":
    title = title.replace('Race','')

  if title.startswith('EnrolledIn') and title != 'EnrolledInSchool':
    title = title.replace('EnrolledIn', '').replace('Grade', 'Grade ')

  # The enum is in camelCase, this separates the words with space.
  title = re.sub('([a-z|0-9])([A-Z])', r'\g<1> \g<2>', title)

  # Assume US is always a single word in population property and value.
  title = re.sub(r'(\S)US', r'\g<1> US', title)
  title = re.sub(r'US(\S)', r'US \g<1>', title)
  chars = list(title)
  chars[0] = chars[0].upper()
  return ''.join(chars)


def format_range(range_enum, prefix):
  """Format a range enum to its text representation."""
  unit = RANGE_TEXT[prefix]
  content = range_enum.replace(prefix, '')
  if len(content.split('To')) == 2:
    low, high = content.split('To')
    return '{:,.0f} - {:,.0f} {}'.format(float(low), float(high), unit)
  if content.startswith('Upto'):
    return 'Less than {:,.0f} {}'.format(
        float(content.replace('Upto', '')), unit)
  if content.endswith('Onwards'):
    return 'More than {:,.0f} {}'.format(
        float(content.replace('Onwards', '')), unit)
  return '{} {}'.format(content, unit)


def rangeLow(o):
  """Function to sort for range enums."""
  enum = o['e']
  for key in RANGE_TEXT:
    enum = enum.replace(key, '')
  if len(enum.split('To')) == 2:
    low = int(enum.split('To')[0])
  elif enum.startswith('Upto'):
    low = 0
  elif enum.endswith('Onwards'):
    low = int(enum.replace('Onwards', ''))
  else:
    try:
      low = int(enum)
    except ValueError:
      low = -1
  return low


def sort_func(prop):
  """Return a sort function for children nodes."""
  # Range enums
  if prop in [
      'age', 'householderAge', 'income', 'numberOfRooms', 'grossRent',
      'homeValue'
  ]:
    return rangeLow
  elif prop == 'educationalAttainment':
    return lambda o: constants.EDUCATIONS.get(o['l'], DEFAULT_RANK)
  elif prop == 'naics':
    order = {}
    for idx, name in enumerate(list(constants.NAICS.values())):
      order[name] = idx
    return lambda o: order.get(o['l'], DEFAULT_RANK)
  elif prop == 'detailedLevelOfSchool':
    return lambda o: constants.GRADE.get(o['l'], DEFAULT_RANK)
  else:
    return lambda o: o['l']


def filter_and_sort(prop, children, show_all):
  """Filter enum nodes by ordering rules or alphabetically."""
  target_titles = None
  if not show_all:
    if prop == 'age' or prop == 'householderAge':
      if children and children[0]['populationType'] == 'MortalityEvent':
        target_titles = constants.IDC10_AGES
      else:
        target_titles = constants.AGES
    if prop == 'race':
      target_titles = constants.RACES
    if prop == 'educationalAttainment':
      target_titles = set(list(constants.EDUCATIONS.keys()))
    if prop == 'causeOfDeath':
      target_titles = set(list(constants.ICD10.values()))
    if prop == 'naics':
      target_titles = set(list(constants.NAICS.values()))
    if prop == 'detailedLevelOfSchool':
      target_titles = set(list(constants.GRADE.keys()))
    if prop == 'drugPrescribed':
      target_titles = set(list(constants.DEA_DRUGS.values()))

  if target_titles:
    used_children = [c for c in children if c['l'] in target_titles]
  else:
    used_children = children
  used_children.sort(key=sort_func(prop))
  return used_children
