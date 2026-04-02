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

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
import server.webdriver.shared as shared
from server.webdriver.shared_tests.timeline_test import \
    StandardizedTimelineTestMixin
from server.webdriver.shared_tests.timeline_test import TimelineTestMixin


class TestTimeline(TimelineTestMixin, StandardizedTimelineTestMixin,
                   BaseDcWebdriverTest):
  """Class to test scatter page. Tests come from TimelineTestMixin."""

  # TODO(juliawu): Implement a test for testing that per capita toggle affects metadata dialog content.
  # There was previously a test here designed for /tools/visualization, but it was removed
  # during the turn-down of /tools/visualization. We should add a new test for /tools/timeline
  # that tests the same functionality.

  # TODO(nick-next): Move to shared_tests once metadata_modal feature flag is dropped



