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


import time
from webdriver_tests.base_test import WebdriverBaseTest


SCREENSHOTS_FOLDER = 'test_screenshots/'
# TODO: Can add more urls and tests if necessary.
TEST_URLS = [
    {
        'url': '/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Age_Person',
        'filename_suffix': 'median_age_six_places.png',
        'test_class': 'card',
        'height': 1000
    },
    {
        'url': '/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Count_CriminalActivities_ViolentCrime',
        'filename_suffix': 'violentcrime_six_places.png',
        'test_class': 'card',
        'height': 1000
    },
    {
        'url': '/tools/timeline#place=country%2FUSA%2CgeoId%2F06085&pc=1&statsVar=CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase',
        'filename_suffix': 'covid_19_cases_two_places.png',
        'test_class': 'card',
        'height': 1000
    },
    {
        'url': '/place?dcid=country/USA',
        'filename_suffix': 'place_usa.png',
        'test_class': 'chart-container',
        'height': 5500
    },
    {
        'url': '/place?dcid=country/USA&topic=Demographics',
        'filename_suffix': 'place_usa_demographics.png',
        'test_class': 'chart-container',
        'height': 4400
    },
    {
        'url': '/place?dcid=country/USA&topic=Health',
        'filename_suffix': 'place_usa_health.png',
        'test_class': 'chart-container',
        'height': 3300
    }
]


# Class to test timeline tool.
class TestScreenShot(WebdriverBaseTest):

    def test_pages_and_sreenshot(self):
        """Test these page can show correctly and do screenshot."""
        index = 1
        for test_info in TEST_URLS:
            self.driver.get(self.url_ + test_info['url'])
            time.sleep(5)
            self.driver.set_window_size(
                width=1000, height=test_info['height'], windowHandle='current')
            charts = self.driver.find_elements_by_class_name(
                test_info['test_class'])
            # Assert there are charts.
            self.assertGreater(len(charts), 0)
            self.driver.save_screenshot(
                SCREENSHOTS_FOLDER + str(index) + "_" + test_info['filename_suffix'])
            index = index + 1
