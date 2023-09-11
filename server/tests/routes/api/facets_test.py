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

import unittest

from web_app import app


class TestGetFacetsWithinPlace(unittest.TestCase):

  def test_required_params(self):
    """Failure if required fields are not present."""
    no_parent_place = app.test_client().get('api/facets/within',
                                            query_string={
                                                "childType": "County",
                                                "variables": ["Count_Person"],
                                            })
    assert no_parent_place.status_code == 400

    no_child_type = app.test_client().get('api/facets/within',
                                          query_string={
                                              "parentEntity": "country/USA",
                                              "variables": ["Count_Person"],
                                          })
    assert no_child_type.status_code == 400

    no_stat_vars = app.test_client().get('api/facets/within',
                                         query_string={
                                             "childType": "County",
                                             "parentEntity": "country/USA",
                                         })
    assert no_stat_vars.status_code == 400
