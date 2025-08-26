# Copyright 2025 Google LLC
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
from unittest import mock

from flask import Flask

from server.lib.cache import cache, should_skip_cache
from server.services.datacommons import (
    nl_search_vars,
    nl_search_vars_in_parallel,
    v2node_paginated,
)

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_DATA_DIR = os.path.join(MODULE_DIR, "..", "test_data", "datacommons")


def get_json(filename):
    if not filename.lower().endswith(".json"):
        filename += ".json"
    filepath = os.path.join(TEST_DATA_DIR, filename)
    with open(filepath, "r") as f:
        return json.load(f)


class TestServiceDataCommonsV2NodePaginated(unittest.TestCase):
    @mock.patch("server.services.datacommons.post")
    def test_termination_condition_max_pages_fetched(self, mock_post):
        response_with_next_token = get_json("v2node_response_with_next_token")

        def side_effect(url, data):
            assert url.endswith("/v2/node")
            assert data == {
                "nodes": ["dc/1", "dc/2"],
                "property": "->{property1,property2}",
                "nextToken": "",
            }
            return response_with_next_token

        mock_post.side_effect = side_effect

        self.assertEqual(
            v2node_paginated(["dc/1", "dc/2"], "->{property1,property2}", max_pages=1),
            response_with_next_token,
        )
        assert mock_post.call_count == 1

    @mock.patch("server.services.datacommons.post")
    def test_termination_condition_no_next_token(self, mock_post):
        response_without_next_token = get_json("v2node_response_without_next_token")

        def side_effect(url, data):
            assert url.endswith("/v2/node")
            assert data == {
                "nodes": ["dc/1", "dc/2"],
                "property": "->{property1,property2}",
                "nextToken": "",
            }
            return response_without_next_token

        mock_post.side_effect = side_effect

        self.assertEqual(
            v2node_paginated(["dc/1", "dc/2"], "->{property1,property2}", max_pages=3),
            response_without_next_token,
        )
        assert mock_post.call_count == 1

    @mock.patch("server.services.datacommons.post")
    def test_merge_paged_responses_with_no_max_pages(self, mock_post):
        response_with_next_token = get_json("v2node_response_with_next_token")
        response_without_next_token = get_json("v2node_response_without_next_token")

        call_count = 0

        def side_effect(url, data):
            nonlocal call_count
            call_count += 1
            assert url.endswith("/v2/node")
            assert data["nodes"] == ["dc/1", "dc/2"]
            assert data["property"] == "->{property1,property2}"

            if call_count == 1:
                assert not data["nextToken"]
                return response_with_next_token

            assert data["nextToken"]
            return response_without_next_token

        mock_post.side_effect = side_effect

        self.assertEqual(
            v2node_paginated(
                ["dc/1", "dc/2"], "->{property1,property2}", max_pages=None
            ),
            get_json("v2node_expected_merged_response"),
        )
        assert mock_post.call_count == 2

    @mock.patch("server.services.datacommons.post")
    def test_merging_property_responses(self, mock_post):
        properties_with_next_token = get_json("v2node_properties_with_next_token")
        properties_without_next_token = get_json("v2node_properties_without_next_token")
        call_count = 0

        def side_effect(url, data):
            nonlocal call_count
            call_count += 1
            assert url.endswith("/v2/node")
            assert data["nodes"] == ["dc/1", "dc/2"]
            assert data["property"] == "->"

            if call_count == 1:
                assert not data["nextToken"]
                return properties_with_next_token

            assert data["nextToken"]
            return properties_without_next_token

        mock_post.side_effect = side_effect

        self.assertEqual(
            v2node_paginated(["dc/1", "dc/2"], "->", max_pages=3),
            get_json("v2node_expected_merged_properties"),
        )
        assert mock_post.call_count == 2

    @mock.patch("server.services.datacommons.post")
    def test_empty_response_returns_empty(self, mock_post):
        def side_effect(url, data):
            assert url.endswith("/v2/node")
            assert data == {
                "nodes": ["dc/1", "dc/2"],
                "property": "->",
                "nextToken": "",
            }
            return {}

        mock_post.side_effect = side_effect

        self.assertEqual(v2node_paginated(["dc/1", "dc/2"], "->", max_pages=3), {})
        assert mock_post.call_count == 1

    @mock.patch("server.services.datacommons.post")
    def test_no_data_in_response(self, mock_post):
        response_with_no_data_for_dcids = {"data": {"dc/1": {}, "dc/2": {}}}

        def side_effect(url, data):
            assert url.endswith("/v2/node")
            assert data == {
                "nodes": ["dc/1", "dc/2"],
                "property": "->",
                "nextToken": "",
            }
            return response_with_no_data_for_dcids

        mock_post.side_effect = side_effect

        self.assertEqual(
            v2node_paginated(["dc/1", "dc/2"], "->", max_pages=3),
            response_with_no_data_for_dcids,
        )
        assert mock_post.call_count == 1


class TestServiceDataCommonsNLSearchVars(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config["NL_ROOT"] = "fake_root"
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    @mock.patch("server.services.datacommons.post")
    def test_without_skip_topics(self, mock_post):
        idx_param = "fake_index"

        def side_effect(url, data, api_key=None):
            assert url.endswith(f"/api/search_vars?idx={idx_param}")
            self.assertEqual(data, {"queries": ["foo", "bar"]})
            return {}

        mock_post.side_effect = side_effect

        nl_search_vars(
            queries=["foo", "bar"],
            index_types=[idx_param],
        )

        assert mock_post.call_count == 1

    @mock.patch("server.services.datacommons.post")
    def test_with_skip_topics(self, mock_post):
        idx_param = "fake_index"

        def side_effect(url, data, api_key=None):
            assert url.endswith(f"/api/search_vars?idx={idx_param}&skip_topics=true")
            self.assertEqual(data, {"queries": ["foo", "bar"]})
            return {}

        mock_post.side_effect = side_effect

        nl_search_vars(
            queries=["foo", "bar"],
            index_types=[idx_param],
            skip_topics="true",
        )

        assert mock_post.call_count == 1


class TestServiceDataCommonsCacheSkip(unittest.TestCase):
    def setUp(self):
        # Create Flask app
        self.app = Flask(__name__)

        # Initialize cache with the test app
        cache.init_app(self.app)

        # Push app context
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        # Pop context
        self.app_context.pop()

    def test_should_skip_cache_with_true_header(self):
        """Test that should_skip_cache() returns True for 'true' (case-insensitive)"""
        test_cases = ["true", "TRUE", "True", "tRuE"]
        for value in test_cases:
            with self.app.test_request_context(headers={"X-Skip-Cache": value}):
                self.assertTrue(should_skip_cache(), f"Failed for value: {value}")

    def test_should_skip_cache_with_false_values(self):
        """Test that should_skip_cache() returns False for false/invalid values"""
        test_cases = ["false", "", "1", "0", "yes", "no", "invalid", "True "]
        for value in test_cases:
            with self.app.test_request_context(headers={"X-Skip-Cache": value}):
                self.assertFalse(should_skip_cache(), f"Failed for value: '{value}'")

    def test_should_skip_cache_with_no_header(self):
        """Test that should_skip_cache() returns False when no X-Skip-Cache header"""
        with self.app.test_request_context():
            self.assertFalse(should_skip_cache())


class TestServiceDataCommonsNLSearchVarsInParallel(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config["NL_ROOT"] = "fake_root"
        self.app.config["DC_API_KEY"] = "fake_key"
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    @mock.patch("server.services.datacommons.nl_search_vars")
    def test_basic(self, mock_nl_search_vars):
        def side_effect(queries, index_types, skip_topics, nl_root, api_key):
            # Assert that the config is passed down correctly from the app context
            self.assertEqual(nl_root, "fake_root")
            self.assertEqual(api_key, "fake_key")
            self.assertEqual(queries, ["foo"])
            self.assertEqual(skip_topics, "true")
            # Return a unique value for each index to check the final dict
            if index_types == ["idx1"]:
                return {"result": "one"}
            if index_types == ["idx2"]:
                return {"result": "two"}
            return {}

        mock_nl_search_vars.side_effect = side_effect

        result = nl_search_vars_in_parallel(
            queries=["foo"], index_types=["idx1", "idx2"], skip_topics="true"
        )

        self.assertEqual(result, {"idx1": {"result": "one"}, "idx2": {"result": "two"}})
        self.assertEqual(mock_nl_search_vars.call_count, 2)
