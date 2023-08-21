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

# NL Bridge fulfiller.

from server.config.subject_page_pb2 import SubjectPageConfig
import server.lib.explore.fulfiller as exp_fulfiller
import server.lib.explore.related as related
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.config_builder import base
import server.lib.nl.config_builder.builder as nl_config_builder
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.existence as ext
import server.lib.nl.fulfillment.fulfiller as nl_fulfiller
import server.lib.nl.fulfillment.types as ftypes
import server.lib.nl.fulfillment.utils as futils


def fulfill(uttr: nl_uttr.Utterance,
            cb_config: base.Config) -> exp_fulfiller.FulfillResp:
  related_things = {}
  uttr = nl_fulfiller.fulfill(uttr,
                              explore_mode=True,
                              related_things=related_things)
  config_pb = nl_config_builder.build(uttr, cb_config)
  return exp_fulfiller.FulfillResp(chart_pb=config_pb,
                                   related_things=related_things,
                                   user_message='')
