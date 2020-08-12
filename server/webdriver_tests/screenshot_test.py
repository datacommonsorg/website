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


import unittest
import urllib
import time
from base_test import WebdriverBaseTest
 

#TODO: Can add more urls and tests if necessary.
TIMELINE_EXPLORER_URL_1 = '/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Age_Person'
TIMELINE_EXPLORER_URL_2 = '/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Count_CriminalActivities_ViolentCrime'
TIMELINE_EXPLORER_URL_3 = '/tools/timeline#place=country%2FUSA%2CgeoId%2F06085&pc=1&statsVar=CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase'
PLACE_EXPLORER_URL_1 = '/place?dcid=country/USA'
PLACE_EXPLORER_URL_2 = '/place?dcid=country/USA&topic=Demographics'
PLACE_EXPLORER_URL_3 = '/place?dcid=country/USA&topic=Health'


# Class to test timeline tool.
class TestScreenShot(WebdriverBaseTest):

    def test_pages_and_sreenshot(self):
        """Test these page can show correctly and do screenshot."""
        self.driver.set_window_size(width=1000,height=2000,windowHandle='current')

        # Test TIMELINE_EXPLORER_URL_1.
        self.driver.get(self.url_ + TIMELINE_EXPLORER_URL_1)
        time.sleep(5)
        charts = self.driver.find_elements_by_class_name("card")
        # Assert there are one chart.
        self.assertEqual(len(charts), 1)
        self.driver.save_screenshot("test_screenshots/1_median_age_six_places.png")

        # Test TIMELINE_EXPLORER_URL_2.
        self.driver.get(self.url_ + TIMELINE_EXPLORER_URL_2)
        time.sleep(5)
        charts = self.driver.find_elements_by_class_name("card")
        # Assert there are one chart.
        self.assertEqual(len(charts), 1)
        self.driver.save_screenshot("test_screenshots/2_violentcrime_six_places.png")

        # Test TIMELINE_EXPLORER_URL_3.
        self.driver.get(self.url_ + TIMELINE_EXPLORER_URL_3)
        time.sleep(5)
        charts = self.driver.find_elements_by_class_name("card")
        # Assert there are one chart.
        self.assertEqual(len(charts), 1)
        self.driver.save_screenshot("test_screenshots/3_covid_19_cases_two_places.png")

        # Test PLACE_EXPLORER_URL_1.
        self.driver.get(self.url_ + PLACE_EXPLORER_URL_1)
        time.sleep(5)
        charts = self.driver.find_elements_by_class_name("chart-container")
        # Assert there are more than 10 charts.
        self.assertGreaterEqual(len(charts), 10)
        self.driver.save_screenshot("test_screenshots/4_place_usa.png")

        # Test PLACE_EXPLORER_URL_2.
        self.driver.get(self.url_ + PLACE_EXPLORER_URL_2)
        time.sleep(5)
        charts = self.driver.find_elements_by_class_name("chart-container")
        # Assert there are more than 10 charts.
        self.assertGreaterEqual(len(charts), 10)
        self.driver.save_screenshot("test_screenshots/5_place_usa_demographics.png")

        # Test PLACE_EXPLORER_URL_3.
        self.driver.get(self.url_ + PLACE_EXPLORER_URL_3)
        time.sleep(5)
        charts = self.driver.find_elements_by_class_name("chart-container")
        # Assert there are more than 10 charts.
        self.assertGreaterEqual(len(charts), 10)
        self.driver.save_screenshot("test_screenshots/6_place_usa_health.png")
