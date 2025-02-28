# # Copyright 2025 Google LLC
# #
# # Licensed under the Apache License, Version 2.0 (the "License");
# # you may not use this file except in compliance with the License.
# # You may obtain a copy of the License at
# #
# #      http://www.apache.org/licenses/LICENSE-2.0
# #
# # Unless required by applicable law or agreed to in writing, software
# # distributed under the License is distributed on an "AS IS" BASIS,
# # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# # See the License for the specific language governing permissions and
# # limitations under the License.

import unittest

from server.routes.experiments.biomed_nl.query_resolution import sanitize_query


class TestQueryResolution(unittest.TestCase):

  def test_sanitize_query(self):
    assert sanitize_query(
        'query ends in question mark?') == 'query ends in question mark'
    assert sanitize_query(
        'query about entity1, entity2, and entity removes commas'
    ) == 'query about entity1 entity2 and entity removes commas'
    assert sanitize_query("entity's query with apostrophe is removed"
                         ) == 'entity query with apostrophe is removed'
