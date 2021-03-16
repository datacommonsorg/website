# Copyright 2021 Google LLC
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

from webdriver_tests.base_test import WebdriverBaseTest
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


class TestPlaceLanding(WebdriverBaseTest):
    """Tests for Homepage."""

    def test_homepage_en(self):
        """Test homepage in EN."""

        self.driver.get(self.url_ + '/')

        title_present = EC.text_to_be_present_in_element(
            (By.XPATH, '//*[@id="main-nav"]/div/div[1]/a'), 'Data Commons')
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

        hero_msg = self.driver.find_elements_by_class_name('lead')[0]
        self.assertTrue(
            hero_msg.text.startswith(
                'Data Commons is an open knowledge repository'))

        explore_callout_msg = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[3]/p')
        self.assertTrue(
            explore_callout_msg.text.startswith(
                'We cleaned and processed the data so you don\'t have to'))

        nyc_health = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[3]/ul/li[1]/ul/li[2]/a')
        self.assertEqual(nyc_health.text, 'New York City, NY Health')
        self.assertEqual(nyc_health.get_attribute('href'),
                         self.url_ + '/place/geoId/3651000?topic=Health')

        schema_org = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[5]/ul/li[2]')
        self.assertEqual(schema_org.text,
                         'Open sourced, built using Schema.org.')

        more_msg = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[3]/ul/li[3]/ul/li[4]/a')
        self.assertEqual(more_msg.text, 'more ...')

    def test_homepage_it(self):
        """Test homepage in IT."""

        self.driver.get(self.url_ + '/?hl=it')

        title_present = EC.text_to_be_present_in_element(
            (By.XPATH, '//*[@id="main-nav"]/div/div[1]/a'), 'Data Commons')
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

        hero_msg = self.driver.find_elements_by_class_name('lead')[0]
        self.assertTrue(
            hero_msg.text.startswith(
                'Data Commons è un repository di conoscenza aperto che combina i dati provenienti'
            ))

        explore_callout_msg = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[3]/p')
        self.assertTrue(
            explore_callout_msg.text.startswith(
                'Abbiamo pulito ed elaborato i dati al tuo posto, così non dovrai farlo tu.'
            ))

        nyc_health = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[3]/ul/li[1]/ul/li[2]/a')
        self.assertEqual(nyc_health.text, 'Salute a New York, New York')
        self.assertEqual(nyc_health.get_attribute('href'),
                         self.url_ + '/place/geoId/3651000?topic=Health&hl=it')

        schema_org = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[5]/ul/li[2]')
        self.assertEqual(schema_org.text,
                         'Progetto open source realizzato con Schema.org.')

        more_msg = self.driver.find_element_by_xpath(
            '//*[@id="homepage"]/section[3]/ul/li[3]/ul/li[4]/a')
        self.assertEqual(more_msg.text, 'altro…')


if __name__ == '__main__':
    unittest.main()