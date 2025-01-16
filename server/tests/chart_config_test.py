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

import json
import os
import unittest

import server.lib.range as lib_range
import server.lib.util as lib_util


class TestChart(unittest.TestCase):

  def readConfig(self, legacy):
    self.charts = []
    chart_config_dir = os.path.join(lib_util.get_repo_root(), "config",
                                    "chart_config")
    for filename in os.listdir(chart_config_dir):
      if filename.endswith(".json"):
        with open(os.path.join(chart_config_dir, filename),
                  encoding='utf-8') as f:
          config = json.load(f)
          if (legacy and 'statsVars' in config) or (not legacy and
                                                    'variables' in config):
            self.charts.extend(config)

  def test_unique_chart(self):
    for use_legacy in [True, False]:
      self.readConfig(use_legacy)
      chart_set = set()
      for chart in self.charts:
        assert (chart['category'], chart['title']) not in chart_set
        chart_set.add((chart['category'], chart['title']))

  def test_related_chart_scale(self):
    for use_legacy in [True, False]:
      self.readConfig(use_legacy)
      for chart in self.charts:
        if 'relatedChart' in chart:
          if chart['relatedChart'].get('scale', False):
            assert 'denominator' in chart['relatedChart']

  def test_aggregate_field(self):
    for use_legacy in [True, False]:
      self.readConfig(use_legacy)
      for chart in self.charts:
        if 'aggregate' in chart:
          agg_conf = lib_range.get_aggregate_config(chart['aggregate'])
          assert 'grouping' in agg_conf
