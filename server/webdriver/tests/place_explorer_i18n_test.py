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

from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.shared_tests.place_explorer_i18n_test import \
    PlaceI18nExplorerTestMixin


class TestPlaceI18nExplorer(PlaceI18nExplorerTestMixin, BaseDcWebdriverTest):
  """Class to test i18n place explorer page. Tests come from PlaceI18nExplorerTestMixin."""