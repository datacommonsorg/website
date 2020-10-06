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
import math
import re

NUM_RANGE = 9

STAT_VAR_RANGE = {
    "age": (re.compile("Count_Person_(.*)Years"), "Count_Person_{}Years")
}


def stat_var_to_range(stat_var, regex):
    """Convert a stat var to a range tuple with low and high value."""
    p = regex.search(stat_var)
    if p:
        return string_to_range(p.group(1))
    raise ValueError("Invalid stat_var %s", stat_var)


def range_to_stat_var(r, format_str):
    """Convert a range to stat var str."""
    if r[0] == 0:
        part = 'Upto' + str(r[1])
    elif r[1] == math.inf:
        part = str(r[0]) + 'OrMore'
    else:
        part = '{}To{}'.format(r[0], r[1])
    return format_str.format(part)


def string_to_range(r):
    """Function to get the low of the range."""
    if len(r.split('To')) == 2:
        low = int(r.split('To')[0])
        high = int(r.split('To')[1])
    elif r.startswith('Upto'):
        low = 0
        high = int(r.replace('Upto', ''))
    elif r.endswith('OrMore'):
        low = int(r.replace('OrMore', ''))
        high = math.inf
    else:
        low = int(r)
        high = low
    return (low, high)


def expand(range_lists, range_start_map):
    result = []
    complete = True
    for l in range_lists:
        last_item = l[-1]
        next_start = last_item[-1] + 1
        if next_start in range_start_map:
            complete = False
            for next_item in range_start_map[next_start]:
                result.append(l + [next_item])
        else:
            result.append(l)
    return result, complete


def concat_aggregate_range(ranges):
    """Return an ordered and aggregated range from the input.

    Args:
      ranges: a list of range in the form of a two value tuple, ex:
        [(0, 5), (6, 10), (21, 40), (11, 20), (21, math.inf)]
    Returns:
      A list of list of range.
    """
    # Sort the range by start then by end.
    ranges = set(ranges)
    sorted_ranges = sorted(ranges, key=lambda x: (x[0], x[1]))

    # Start value to range.
    range_start_map = defaultdict(list)
    for r in sorted_ranges:
        range_start_map[r[0]].append(r)

    # Find the connected ranges.
    range_link = defaultdict(list)
    for r in sorted_ranges:
        if r[1] + 1 in range_start_map:
            range_link[r].append(range_start_map[r[1] + 1])

    # Build linked range groups.
    range_lists = [[sorted_ranges[0]]]
    while True:
        range_lists, complete = expand(range_lists, range_start_map)
        if complete:
            break
    range_lists.sort(key=lambda x: len(x))

    # Pick the list with the most range.
    select_list = range_lists[-1]

    # Aggregate range if needed
    span = select_list[-1][0] - select_list[0][0]
    average_span = span / NUM_RANGE
    result = [[select_list[0]]]
    current_span = select_list[0][1] - select_list[0][0]
    for item in select_list[1:]:
        item_span = item[1] - item[0]
        if (item_span < average_span and current_span < average_span and
                current_span + item_span < 1.5 * average_span):
            result[-1].append(item)
            current_span += (item_span + 1)
        else:
            result.append([item])
            current_span = item_span
    return result


def build_stat_var_range_group(stat_vars, range_type):
    """Build a continous and better ranged quantity range stat var."""
    regex, fmt = STAT_VAR_RANGE[range_type]
    ranges = [stat_var_to_range(stat_var, regex) for stat_var in stat_vars]
    range_groups = concat_aggregate_range(ranges)
    result = {}
    for group in range_groups:
        if len(group) == 1:
            sv = range_to_stat_var(group[0], fmt)
            result[sv] = [sv]
        else:
            low = group[0][0]
            high = group[-1][1]
            key = range_to_stat_var((low, high), fmt)
            result[key] = [range_to_stat_var(item, fmt) for item in group]
    return result