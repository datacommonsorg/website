#!/bin/bash
set -e

./run_test.sh -w --flake-finder --flake-runs=5 \
  server/webdriver/tests/vis_timeline_test.py::TestVisTimeline::test_landing_page_link \
  server/webdriver/tests/vis_timeline_test.py::TestVisTimeline::test_server_and_page \
  server/webdriver/tests/vis_timeline_test.py::TestVisTimeline::test_manually_enter_options \
  server/webdriver/tests/map_test.py::TestMap::test_manually_enter_options_results_in_chart \
  server/webdriver/tests/scatter_test.py::TestScatter::test_landing_page_link \
