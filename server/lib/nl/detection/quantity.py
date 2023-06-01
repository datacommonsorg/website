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
"""Helper for parsing quantity"""

# This library supports parsing numeric values and ranges from a query.
# It requires numbers plus an optional multipler in words, like
# 1M, 10 million, 2 trillion, 30K.

# TODO: support non-digits too, like "one thousand".
# TODO: maybe support units

import re

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection.types import QCmpType
from server.lib.nl.detection.types import Quantity
from server.lib.nl.detection.types import QuantityClassificationAttributes
from server.lib.nl.detection.types import QuantityRange

# Match a number followed by an optional decimal part.
NUMBER_RE = r'\d+(?:\.\d+)?'

# Match a bunch of words indicating multipliers to be applied to a number.
NUMBER_FACTOR_RE = r'k|m|b|t|hundred|thousand|million|billion|trillion'

SPACE_RE = r'(?: +)?'

NUMBER_FACTOR_MAP = {
    'hundred': 100,
    'k': 1000,
    'thousand': 1000,
    'm': 1000000,
    'million': 1000000,
    'b': 1000000000,
    'billion': 1000000000,
    't': 1000000000000,
    'trillion': 1000000000000,
}


# Match x at word boundary.
def _matchable(x):
  return r'(?:^|\W)' + x + r'(?:$|\W)'


# Allow a bunch of stuff between X and number. Followed by an optional space and an optional factor.
def _digits(x):
  # Capture number space and factor all together as a single block.
  return x + r'\s*?(' + NUMBER_RE + SPACE_RE + r'(?:' + NUMBER_FACTOR_RE + r')?)'


# The order here matters. The ones earlier in the list may include
# sub-strings that appear later.
QUANTITY_RE = [
    (QCmpType.GE,
     _digits(r'(?:>=|greater than or equal to|greater than or equals|from)')),
    (QCmpType.LE,
     _digits(
         r'(?:<=|less than or equal to|less than or equals|lesser than or equal to|lesser than or equals|upto|up to)'
     )),
    (QCmpType.GT,
     _digits(
         r'(?:>|over|above|exceed|exceeds|more than|greater than|higher than|upwards of)'
     )),
    (QCmpType.LT,
     _digits(r'(?:<|under|below|less than|lesser than|lower than)')),
    (QCmpType.EQ, _digits(r'(?:==?|is|equal to|equals|has|have|as much as)'))
]

# These are combined patterns for a range.
SPECIAL_QUANTITY_RANGE_RE = [
    _digits(r'between') + r'[ ]*' + _digits(r'and'),
    _digits(r'from') + r'[ ]*' + _digits(r'to'),
]


def _to_number(val: str, ctr: Counters) -> int:
  try:
    num = float(val)
  except ValueError:
    # Capture number and factor separately.
    regex = _matchable(r'(' + NUMBER_RE + r')' + SPACE_RE + r'(' +
                       NUMBER_FACTOR_RE + r')')
    match = re.fullmatch(regex, val)
    if (not match or len(match.groups()) != 2 or
        match.group(2) not in NUMBER_FACTOR_MAP):
      ctr.err('quantity_match_number_parsing_failed', val)
      return None
    num = float(match.group(1).strip())
    factor = NUMBER_FACTOR_MAP[match.group(2).strip()]
    return int(num * factor)
  return round(num, 2)


def _make_quantity_range(lcmp: QCmpType, lval: str, ucmp: QCmpType, uval: str,
                         idx: int,
                         ctr: Counters) -> QuantityClassificationAttributes:
  lnum = _to_number(lval, ctr)
  unum = _to_number(uval, ctr)
  if lnum == None or unum == None:
    return None
  if lnum > unum:
    ctr.err('quantity_match_incorrect_range', (lnum, unum))
    return None
  return QuantityClassificationAttributes(
      qval=None,
      qrange=QuantityRange(lower=Quantity(cmp=lcmp, val=lnum),
                           upper=Quantity(cmp=ucmp, val=unum)),
      idx=idx)


def parse_quantity(query_orig: str,
                   ctr: Counters) -> QuantityClassificationAttributes:
  query = query_orig.lower()

  # Check special quantity range regex first, since quantity regex is
  # a subset of it.
  incl_range = None
  for regex in SPECIAL_QUANTITY_RANGE_RE:
    for w in re.finditer(_matchable(regex), query):
      if incl_range:
        ctr.err('quantity_match_multiple_ranges', 1)
        return None
      incl_range = (w.start(), w.group(1).strip(), w.group(2).strip())
  if incl_range:
    return _make_quantity_range(lcmp=QCmpType.GE,
                                lval=incl_range[1],
                                ucmp=QCmpType.LE,
                                uval=incl_range[2],
                                idx=incl_range[0],
                                ctr=ctr)

  # Now go over the quantity regexes.  We can match up to 2 of them
  # of appropriate types.
  matches = {}
  # The logic here depends on the ordering in QUANTITY_RE
  for cmp, regex in QUANTITY_RE:
    fail_if_found = False
    # If we've matched GE/LE, we shouldn't find more GT/LT.
    # If we have matched anything at all, we shouldn't find EQ.
    if ((cmp == QCmpType.GT and QCmpType.GE in matches) or
        (cmp == QCmpType.LT and QCmpType.LE in matches) or
        (cmp == QCmpType.EQ and matches) or (cmp in matches)):
      fail_if_found = True
    for w in re.finditer(_matchable(regex), query):
      if fail_if_found:
        ctr.err('quantity_matching_multimatches', cmp)
        return None
      subs = w.group(1).strip()
      matches[cmp] = (w.start(), subs)
      query = query.replace(subs, '')

  # This is fine, not a quantity query.
  if not matches:
    return None

  if len(matches) == 2:
    lcmp = QCmpType.GE if QCmpType.GE in matches else QCmpType.GT
    ucmp = QCmpType.LE if QCmpType.LE in matches else QCmpType.LT
    idx = matches[lcmp][0]
    if matches[ucmp][0] < matches[lcmp][0]:
      idx = matches[ucmp][0]
    return _make_quantity_range(lcmp=lcmp,
                                lval=matches[lcmp][1],
                                ucmp=ucmp,
                                uval=matches[ucmp][1],
                                idx=idx,
                                ctr=ctr)

  cmp = list(matches.keys())[0]
  num = _to_number(matches[cmp][1], ctr)
  if num == None:
    return None
  return QuantityClassificationAttributes(qval=Quantity(cmp=cmp, val=num),
                                          qrange=None,
                                          idx=matches[cmp][0])
