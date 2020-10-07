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

from collections import defaultdict
import functools
import math
import re
from operator import mul

AGE_REGEX = re.compile("Count_Person_(.*)Years")
AGE_FMT = "Count_Person_{}Years"

AGE_RANGE = {
    'census': {
        (5, 17): set([(5, 17)]),
        (18, 24): set([(18, 24)]),
        (25, 34): set([(25, 34)]),
        (35, 44): set([(35, 44)]),
        (45, 54): set([(45, 54)]),
        (55, 64): set([(55, 59), (60, 61), (62, 64)]),
        (65, 74): set([(65, 74)]),
        (75, math.inf): set([(75, math.inf)])
    },
    'oecd': {
        (0, 9): set([(0, 4), (5, 9)]),
        (10, 19): set([(10, 14), (15, 19)]),
        (20, 29): set([(20, 24), (25, 29)]),
        (30, 39): set([(30, 34), (35, 39)]),
        (40, 49): set([(40, 44), (45, 49)]),
        (50, 59): set([(50, 54), (55, 59)]),
        (60, 69): set([(60, 64), (65, 69)]),
        (70, math.inf): set([(70, 74), (75, 79), (80, math.inf)]),
    }
}


def from_string(s):
    """Function to get the low of the range."""
    if len(s.split('To')) == 2:
        low = int(s.split('To')[0])
        high = int(s.split('To')[1])
    elif s.startswith('Upto'):
        low = 0
        high = int(s.replace('Upto', ''))
    elif s.endswith('OrMore'):
        low = int(s.replace('OrMore', ''))
        high = math.inf
    else:
        low = int(s)
        high = low
    return (low, high)


def from_stat_var(stat_var, regex):
    """Convert a stat var to a range tuple with low and high value."""
    p = regex.search(stat_var)
    if p:
        return from_string(p.group(1))
    raise ValueError("Invalid stat_var %s", stat_var)


def to_stat_var(r, fmt):
    """Convert a range to stat var str."""
    if r[0] == 0:
        part = 'Upto' + str(r[1])
    elif r[1] == math.inf:
        part = str(r[0]) + 'OrMore'
    else:
        part = '{}To{}'.format(r[0], r[1])
    return fmt.format(part)


def aggregate_age_stat_var(place_stat_vars):
    """Build aggregated age stat vars.

    Args:
        place_stat_vars: A dict from place dcid to a list of age stat vars.
    Returns:
        A dict of age stat var mapping from aggregated age stat var to the raw
        age stat var.
    """
    place_age_range = {}
    for place, stat_vars in place_stat_vars.items():
        place_age_range[place] = set(
            [from_stat_var(sv, AGE_REGEX) for sv in stat_vars])

    # For each aggregation pattern and place, obtain a score, which is the
    # percentage of age bucket that the place has.
    agg_score = {}
    for method, bucket in AGE_RANGE.items():
        agg_score[method] = {}
        total = float(len(bucket))
        for place, range_set in place_age_range.items():
            count = 0
            for agg_range, raw_ranges in bucket.items():
                if raw_ranges.issubset(range_set):
                    count += 1
            agg_score[method][place] = float(count) / float(total)
    # Pick the aggregation pattern with the highest total score product across
    # places. This rewards a method with more places bucket match and penalize
    # method that misses place bucket.
    highest_score = 0
    used_method = None
    for method, place_scores in agg_score.items():
        score = functools.reduce(mul, list(place_scores.values()), 1)
        if score > highest_score:
            used_method = method
            highest_score = score
    # Get the stat var grouping for each place.
    result = {place: {} for place in place_stat_vars}
    for agg_range, raw_ranges in AGE_RANGE[used_method].items():
        agg_stat_var = to_stat_var(agg_range, AGE_FMT)
        raw_stat_vars = [to_stat_var(r, AGE_FMT) for r in raw_ranges]
        for place, range_set in place_age_range.items():
            if raw_ranges.issubset(range_set):
                result[place][agg_stat_var] = raw_stat_vars
    return result