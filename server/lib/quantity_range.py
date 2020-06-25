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

"""Library to handle quantity range."""
import attr
import enum

class QuantityType(enum.Enum):
  YEAR = 1
  USDOLLAR = 2
  ROOM = 3


QR_TO_SCHEMA = {
    QuantityType.YEAR: 'Year',
    QuantityType.USDOLLAR: 'USDollar',
    QuantityType.ROOM: 'Room',
}


def human_format(num):
  # .3 sets precision to 3 decimals, g removes insignificant 0s.
  num = float('{:.3g}'.format(num))
  magnitude = 0
  while abs(num) >= 1000:
    magnitude += 1
    num /= 1000.0
  return '{}{}'.format('{:f}'.format(num).rstrip('0').rstrip('.'),
                       ['', 'K', 'M', 'B', 'T'][magnitude])


@attr.s(hash=True, eq=True)
class QuantityRange(object):
  """Class represents a quantity range."""
  low = attr.ib(default=None)
  high = attr.ib(default=None)
  type = attr.ib(default=None)
  name = attr.ib(default=None)

  def __str__(self):
    if self.low is None:
      return '{}Upto{}'.format(QR_TO_SCHEMA[self.type], self.high)
    elif self.high is None:
      return '{}{}Onwards'.format(QR_TO_SCHEMA[self.type], self.low)
    elif self.low == self.high:
      return '{}{}'.format(QR_TO_SCHEMA[self.type], self.low)
    else:
      return '{}{}To{}'.format(QR_TO_SCHEMA[self.type], self.low, self.high)

  def display_text(self):
    """Gets the display text of the quantity range.

    Returns:
      A human readable text for the quantity range.
    """
    if self.low and self.high:
      if self.low == self.high:
        if self.type == QuantityType.USDOLLAR:
          format_str = '{name}{low}'
        else:
          format_str = '{low} {name}'
      else:
        if self.type == QuantityType.USDOLLAR:
          format_str = '{name}{low} - {name}{high}'
        else:
          format_str = '{low:,.0f} - {high:,.0f} {name}'
    elif self.high:
      if self.type == QuantityType.USDOLLAR:
        format_str = 'Less than {name}{high}'
      else:
        format_str = 'Less than {high:,.0f} {name}'
    else:
      if self.type == QuantityType.USDOLLAR:
        format_str = 'More than {name}{low}'
      else:
        format_str = 'More than {low:,.0f} {name}'
    low_str = self.low
    high_str = self.high
    if self.type == QuantityType.USDOLLAR:
      if self.low:
        low_str = human_format(self.low)
      if self.high:
        high_str = human_format(self.high)
    return format_str.format(low=low_str, high=high_str, name=self.name)

  def in_range(self, qr):
    """Check whether a QuantityRange object is within the range of another.

    Args:
      qr: A QuantityRange object.

    Returns:
      A boolean of whether the quantiy range is in range of the compared one.
    """
    if self.type != qr.type:
      return False
    if self.low is None and qr.low is not None:
      return False
    if self.high is None and qr.high is not None:
      return False
    if self.low and qr.low and self.low < qr.low:
      return False
    if self.high and qr.high and self.high > qr.high:
      return False
    return True


def parse(qr_str):
  """Parse a string into a QuantityRange object.

  Args:
    qr_str: A string reprsentation of quantity range.

  Returns:
    A QuantityRange object.
  """
  qr_obj = QuantityRange()
  if qr_str.startswith('Years'):
    qr_obj.type = QuantityType.YEAR
    qr_obj.name = 'Years'
    prefix = 'Years'
  elif qr_str.startswith('Year'):
    qr_obj.type = QuantityType.YEAR
    qr_obj.name = 'Years'
    prefix = 'Year'
  elif qr_str.startswith('Rooms'):
    qr_obj.type = QuantityType.ROOM
    qr_obj.name = 'Rooms'
    prefix = 'Rooms'
  elif qr_str.startswith('Room'):
    qr_obj.type = QuantityType.ROOM
    qr_obj.name = 'Rooms'
    prefix = 'Room'
  elif qr_str.startswith('USDollar'):
    qr_obj.type = QuantityType.USDOLLAR
    qr_obj.name = '$'
    prefix = 'USDollar'
  else:
    raise ValueError('Invalid quantity range string %s' % qr_str)

  range_str = qr_str.replace(prefix, '')
  if len(range_str.split('To')) == 2:
    qr_obj.low, qr_obj.high = range_str.split('To')
  elif range_str.startswith('Upto'):
    qr_obj.high = range_str.replace('Upto', '')
  elif range_str.endswith('Onwards'):
    qr_obj.low = range_str.replace('Onwards', '')
  else:
    qr_obj.low = range_str
    qr_obj.high = range_str
  if qr_obj.low:
    qr_obj.low = int(qr_obj.low)
  if qr_obj.high:
    qr_obj.high = int(qr_obj.high)
  return qr_obj