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

from dataclasses import dataclass
import json
import os
from typing import Dict, List

import datacommons as dc

#
#           |  1-P, 1-V  |  N-P, 1-V  |  1-P, N-V  |  N-P, N-V
# ----------|------------|------------|------------|-------------
#  Map      |            |     x      |            |
#  Gauge    |      x     |            |            |
#  Higlight |      x     |            |            |
#  Pie      |            |            |      x     |
#  Donut    |            |            |      x     |
#  Line     |      x     |     x      |      x     |     x
#  Ranking  |            |     x      |            |
#  V-Bar    |      x     |     x      |      x     |     x
#  H-Bar    |      x     |     x      |      x     |     x
#  V-St-Bar |            |            |      x     |     x
#  H-St-Bar |            |            |      x     |     x
#  V-Lol    |            |     x      |      x     |     x
#  H-Lol    |            |     x      |      x     |     x
#  V-St-Lol |            |            |      x     |     x
#  H-St-Lol |            |            |      x     |     x
#
# Scatter => N-P + 2-V
#

# Topic Cache JSON
_TOPIC_CACHE = '../../server/config/nl_page/topic_cache.json'
_SDG_TOPIC_CACHE = '../../server/config/nl_page/sdg_topic_cache.json'

# Generated charts dir
_OUT_DIR = 'output_charts'

_HTML_OPEN = """
<html>
  <head>
    <link
      rel="stylesheet"
      href="https://dev.datacommons.org/css/datacommons.min.css"
    />
    <script src="https://dev.datacommons.org/datacommons.js"></script>
  </head>
  <body style="max-width: 40vw; margin: auto">    
"""

_HTML_CLOSE = """
  </body>
</html>
"""

_MAIN_SPC = '    '
_SUB_SPC = _MAIN_SPC + '  '


def _fname(outdir: str, fno: int) -> str:
  return os.path.join(outdir, f'shard_{fno}.html')


class Writer:

  def __init__(self, outdir):
    self.next_fno = 1
    self.ncharts = 0
    self.total_charts = 0
    self.fp = None
    os.makedirs(outdir, exist_ok=True)
    self.outdir = outdir
    self._new_html()

  def add(self, chart_type: str, params: List[str]):
    content = f'{_MAIN_SPC}<datacommons-{chart_type}\n'
    content += f'{_SUB_SPC}'
    content += f'\n{_SUB_SPC}'.join(params)
    content += f'\n{_MAIN_SPC}></datacommons-{chart_type}>\n'
    self.fp.write(content)

    self.total_charts += 1
    self.ncharts += 1
    if self.ncharts >= 100:
      self._new_html()

  def close(self):
    if self.fp:
      self.fp.write(_HTML_CLOSE)
      self.fp.close()

  def _new_html(self):
    self.close()
    self.fp = open(_fname(self.outdir, self.next_fno), 'w')
    self.fp.write(_HTML_OPEN)
    # Write the header for html.
    self.next_fno += 1
    self.ncharts = 0


@dataclass
class Context:
  place: str
  child_type: str
  child_places: List[str]
  writer: Writer
  topic_map: Dict[str, Dict]


def _composite(v: str) -> bool:
  return v.startswith('dc/topic/') or v.startswith('dc/svpg/')


#
# Helper functions to generate the chart configs.
#
def _gauge(v: str, title: str, ctx: Context):
  parts = [
      f'header="{title}"',
      f'place="{ctx.place}"',
      f'variable="{v}"',
      'min="0"',
      'max="100"',
  ]
  ctx.writer.add('gauge', parts)


def _highlight(v: str, title: str, ctx: Context):
  parts = [f'header="{title}"', f'place="{ctx.place}"', f'variable="{v}"']
  ctx.writer.add('higlight', parts)


def _map(v: str, title: str, ctx: Context):
  parts = [
      f'header="{title}"',
      f'parentPlace="{ctx.place}"',
      f'childPlaceType="{ctx.child_type}"',
      f'variable="{v}"',
  ]
  ctx.writer.add('map', parts)


def _ranking(v: str, title: str, ctx: Context):
  parts = [
      f'header="{title}"',
      f'parentPlace="{ctx.place}"',
      f'childPlaceType="{ctx.child_type}"',
      f'variable="{v}"',
      'rankingCount=10',
  ]
  ctx.writer.add('ranking', parts)

  parts = [
      f'header="{title}"',
      f'parentPlace="{ctx.place}"',
      f'childPlaceType="{ctx.child_type}"',
      f'variable="{v}"',
      'showLowest',
      'rankingCount=10',
  ]
  ctx.writer.add('ranking', parts)


def _pie(vars: List[str], title: str, ctx: Context, donut: bool = False):
  vars_str = ' '.join(vars)
  parts = [
      f'header="{title}"', f'place="{ctx.place}"', f'variables="{vars_str}"'
  ]
  if donut:
    parts.append('donut')
  ctx.writer.add('pie', parts)


def _line(vars: List[str], title: str, ctx: Context):
  vars_str = ' '.join(vars[:5])

  parts = [
      f'header="{title}"', f'place="{ctx.place}"', f'variables="{vars_str}"'
  ]
  ctx.writer.add('line', parts)

  places_str = ' '.join(ctx.child_places)
  parts = [
      f'header="{title}"', f'places="{places_str}"', f'variables="{vars_str}"'
  ]
  ctx.writer.add('line', parts)

  parts = [
      f'header="{title}"', f'parentPlace="{ctx.place}"',
      f'childPlaceType="{ctx.child_type}"', f'variables="{vars_str}"',
      f'maxPlaces="10"'
  ]
  ctx.writer.add('line', parts)


def _bar(vars: List[str],
         title: str,
         ctx: Context,
         stacked: bool = False,
         lollipop: bool = False,
         horizontal: bool = False):
  vars_str = ' '.join(vars[:5])

  def _opts(parts):
    if stacked:
      parts.append('stacked')
    if lollipop:
      parts.append('lollipop')
    if horizontal:
      parts.append('horizontal')
    return parts

  parts = [
      f'header="{title}"',
      f'place="{ctx.place}"',
      f'variables="{vars_str}"',
  ]
  ctx.writer.add('bar', _opts(parts))

  places_str = ' '.join(ctx.child_places)
  parts = [
      f'header="{title}"',
      f'places="{places_str}"',
      f'variables="{vars_str}"',
      f'sort="ascending"',
  ]
  ctx.writer.add('bar', _opts(parts))

  parts = [
      f'header="{title}"',
      f'parentPlace="{ctx.place}"',
      f'childPlaceType="{ctx.child_type}"',
      f'variables="{vars_str}"',
      'maxPlaces="10"',
      f'sort="descending"',
  ]
  ctx.writer.add('bar', _opts(parts))


#
# Overall logic to pick charts.
#
def pick_charts(vars: List[str], title: str, ctx: Context):
  for v in vars:
    vname = ctx.topic_map.get(v, {}).get('n', '')
    _gauge(v, vname, ctx)
    _highlight(v, vname, ctx)
    _map(v, vname, ctx)
    _ranking(v, vname, ctx)

  _line(vars, title, ctx)

  _bar(vars, title, ctx, horizontal=False)
  _bar(vars, title, ctx, horizontal=True)
  _bar(vars, title, ctx, lollipop=True, horizontal=False)
  _bar(vars, title, ctx, lollipop=True, horizontal=True)

  if len(vars) > 1:
    _pie(vars, title, ctx, donut=False)
    _pie(vars, title, ctx, donut=True)
    _bar(vars, title, ctx, stacked=True, horizontal=False)
    _bar(vars, title, ctx, stacked=True, horizontal=True)
    _bar(vars, title, ctx, stacked=True, horizontal=False, lollipop=True)
    _bar(vars, title, ctx, stacked=True, horizontal=True, lollipop=True)


def pick(topic: str, ctx: Context):
  vars = []
  for v in ctx.topic_map.get(topic, {}).get('v', []):
    if not _composite(v):
      vars.append(v)
  if vars:
    pick_charts(vars, ctx.topic_map[topic]['n'], ctx)


def load_topics(topic_cache_file: str):
  with open(topic_cache_file, 'r') as fp:
    cache = json.load(fp)

  all_vars = set()
  out_map = {}
  for node in cache['nodes']:
    dcid = node['dcid'][0]
    name = node['name'][0]
    if 'relevantVariableList' in node:
      vars = node['relevantVariableList']
    else:
      vars = node['memberList']
    out_map[dcid] = {'n': name, 'v': vars}
    for v in vars:
      if not _composite(v):
        all_vars.add(v)

  # Get all the names of variables.
  all_vars = sorted(list(all_vars))
  for id, names in dc.get_property_values(all_vars, 'name').items():
    assert id not in out_map, id
    if names:
      out_map[id] = {'n': names[0]}

  return out_map


def main():
  writer = Writer(_OUT_DIR)
  ntopics = 0

  topic_map = load_topics(_TOPIC_CACHE)
  for pl, ct, cpl in [
      ('country/USA', 'State',
       ['geoId/06', 'geoId/36', 'geoId/08', 'geoId/48', 'geoId/27']),
      ('geoId/06', 'County',
       ['geoId/06085', 'geoId/06061', 'geoId/06029', 'geoId/06025']),
      ('Earth', 'Country', [
          'country/USA', 'country/IND', 'country/IRN', 'country/NGA',
          'country/BRA'
      ]),
  ]:
    for t in sorted(topic_map.keys()):
      if not _composite(t):
        continue
      ntopics += 1
      pick(
          t,
          Context(place=pl,
                  child_type=ct,
                  child_places=cpl,
                  writer=writer,
                  topic_map=topic_map))

  topic_map = load_topics(_SDG_TOPIC_CACHE)
  for pl, ct, cpl in [
      ('Earth', 'Country', [
          'country/USA', 'country/IND', 'country/IRN', 'country/NGA',
          'country/BRA'
      ]),
  ]:
    for t in sorted(topic_map.keys()):
      if not _composite(t):
        continue
      ntopics += 1
      pick(
          t,
          Context(place=pl,
                  child_type=ct,
                  child_places=cpl,
                  writer=writer,
                  topic_map=topic_map))

  writer.close()
  print(
      f'Processed {ntopics} topics and produced {writer.total_charts} charts!')


if __name__ == "__main__":
  main()
