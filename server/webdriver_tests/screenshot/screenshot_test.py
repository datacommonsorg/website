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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_tests.base_test import WebdriverBaseTest

# TODO(shifucun): add test for narrow width for mobile testing
WIDTH = 1280

SCREENSHOTS_FOLDER = 'test_screenshots/'
# TODO: Can add more urls and tests if necessary.
TEST_URLS = [
    {
        'url': '/place',
        'filename_suffix': 'place_landing.png',
        'test_class': 'container',
        'height': 1142
    },
    {
        'url': '/place/country/USA',
        'filename_suffix': 'place_usa.png',
        'test_class': 'chart-container',
        'height': 5500
    },
    {
        'url': '/place/country/USA?topic=Demographics',
        'filename_suffix': 'place_usa_demographics.png',
        'test_class': 'chart-container',
        'height': 4400
    },
    # TODO(beets): Re-enable this test when feasible (without sacrificing
    #              potential ssl downgrade)
    # {
    #     'url': '/place?dcid=country/USA&topic=Health',
    #     'filename_suffix': 'place_usa_health.png',
    #     'test_class': 'chart-container',
    #     'height': 3300
    # },
    {
        'url':
            '/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Age_Person',
        'filename_suffix':
            'median_age_six_places.png',
        'test_class':
            'card',
        'height':
            1000
    },
    {
        'url':
            '/tools/timeline#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Count_CriminalActivities_ViolentCrime',
        'filename_suffix':
            'violentcrime_six_places.png',
        'test_class':
            'card',
        'height':
            1000
    },
    {
        'url':
            '/tools/timeline#place=country%2FUSA%2CgeoId%2F06085&pc=1&statsVar=CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase',
        'filename_suffix':
            'covid_19_cases_two_places.png',
        'test_class':
            'card',
        'height':
            1000
    },
    {
        'url': '/ranking/Median_Income_Person/County/country/USA',
        'filename_suffix': 'ranking_median_income_counties.png',
        'test_class': 'chart-container',
        'height': 1080
    },
    {
        'url': '/ranking/Count_Person/Country?bottom',
        'filename_suffix': 'ranking_population_countries.png',
        'test_class': 'chart-container',
        'height': 1080
    },
    {
        'url':
            '/ranking/Count_Person_BelowPovertyLevelInThePast12Months_AsianAlone/City/geoId/06085?h=geoId%2F0649670&pc=1&scaling=100&unit=%25',
        'filename_suffix':
            'ranking_poverty.png',
        'test_class':
            'chart-container',
        'height':
            1080
    },
    {
        'url': '/dev',
        'filename_suffix': 'dev_charts.png',
        'test_class': 'chart',
        'height': 2300
    },
    {
        'url':
            '/tools/scatter#&svx=Count_Person_Employed&svpx=3-0&svdx=Count_Person&svnx=Employed'
            '&svy=Count_Establishment&svpy=9-2&svny=Number of Establishments&epd=geoId/10'
            '&epn=Delaware&ept=County&y=2016',
        'filename_suffix': 'scatter_delaware_establishments_vs_employed.png',
        'test_class': 'plot-title',
        'height': 1000
    }
]


# Class to test timeline tool.
class TestScreenShot(WebdriverBaseTest):

  def test_pages_and_sreenshot(self):
    """Test these page can show correctly and do screenshot."""
    for index, test_info in enumerate(TEST_URLS):
      test_class_name = test_info['test_class']
      self.driver.get(self.url_ + test_info['url'])

      # Wait until the test_class_name has loaded.
      element_present = EC.presence_of_element_located(
          (By.CLASS_NAME, test_class_name))
      WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

      # Set the window size. Testing different sizes.
      self.driver.set_window_size(width=WIDTH,
                                  height=test_info['height'],
                                  windowHandle='current')

      # Get the element to test.
      charts = self.driver.find_elements_by_class_name(test_class_name)

      # Assert there is at least one chart.
      self.assertGreater(len(charts), 0, test_info['url'])

      # Take a screenshot of the page and save it.
      self.driver.save_screenshot('{}{:02}_{}'.format(
          SCREENSHOTS_FOLDER, index, test_info['filename_suffix']))
