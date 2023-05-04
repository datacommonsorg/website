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

import base64
import logging
import time

from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

_URL = 'https://dev.datacommons.org/nl#a=True&q='


def _to_svg(svg):
  svg_str = str(svg)
  if ' xmlns=' not in svg_str:
    # This makes the SVG not render when opened on chrome.
    svg_str = svg_str.replace('<svg ',
                              '<svg xmlns="http://www.w3.org/2000/svg" ')
  if ' xlink:href' in svg_str:
    # This throws an error
    svg_str = svg_str.replace(' xlink:href', ' href')
  svg_bytes = svg_str.encode('utf-8')
  svg_b64 = base64.b64encode(svg_bytes).decode('utf-8')
  return 'data:image/svg+xml;base64,' + svg_b64


def scrape(query, driver):
  logging.info(f'Scraping: {query}')
  driver.get(_URL + query)

  # Wait until the test_class_name has loaded.
  wait = WebDriverWait(driver, 30)
  wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'chart-container')))
  wait.until(
      EC.invisibility_of_element_located((By.CLASS_NAME, 'dot-loading-stage')))
  time.sleep(5)

  html = driver.page_source
  soup = BeautifulSoup(html, 'html.parser')

  charts = []
  subject_page = soup.find('div', {'id': 'subject-page-main-pane'})
  for block in subject_page.find_all('section', {'class': 'block'}):
    for chart_container in block.find_all('div', {'class': 'chart-container'}):
      chart = {}

      chart['srcs'] = []
      chart['title'] = chart_container.find('h4').text
      for src in chart_container.find_all('div', {'class': 'sources'}):
        anchor = src.find('a')
        chart['srcs'].append({'name': anchor.text, 'url': anchor.get('href')})
      classes = chart_container['class']
      if 'line-chart' in classes:
        chart['type'] = 'LINE'
        chart['svg'] = _to_svg(chart_container.find('svg'))
        legend = chart_container.find('div', {'class': 'legend'})
        chart['legend'] = []
        for l in legend.find_all('a'):
          # TODO: maybe convert rbg to color name.
          chart['legend'].append(l.text)
      elif 'map-chart' in classes:
        chart['type'] = 'LINE'
        map_area = chart_container.find('div', {'class': 'map'})
        chart['svg'] = _to_svg(map_area.find('svg'))
        legend_area = chart_container.find('div', {'class': 'legend'})
        chart['legend_svg'] = _to_svg(legend_area.find('svg'))
      elif 'bar-chart' in classes:
        chart['type'] = 'BAR'
        chart['svg'] = _to_svg(chart_container.find('svg'))
        legend = chart_container.find('div', {'class': 'legend'})
        chart['legend'] = []
        for l in legend.find_all('a'):
          # TODO: maybe convert rbg to color name.
          chart['legend'].append(l.text)
      elif 'scatter-chart' in classes:
        chart['type'] = 'SCATTER'
        chart['svg'] = _to_svg(chart_container.find('svg'))
      elif 'ranking-tile' in classes:
        chart['type'] = 'TABLE'
        chart['rows'] = []
        table = chart_container.find('table')
        # Loop through the rows of the table
        for row in table.find('tbody').find_all('tr'):
          # Create an empty dictionary to hold the row data
          row_data = {}
          header = table.find('thead')
          # Loop through the cells of the row
          for i, cell in enumerate(row.find_all('td')):
            # Use the text content of the cell as the value
            col = None
            if header:
              col = header.find_all('td')[i].text
            if not col:
              col = str(i)
            row_data[col] = cell.text
          # Add the row data to the list
          chart['rows'].append(row_data)
      elif 'disaster-event-map-tile' in classes:
        chart['type'] = 'EVENT_MAP'
        chart['svg'] = _to_svg(chart_container.find('svg'))
        legend = chart_container.find('div',
                                      {'class': 'disaster-event-map-legend'})
        chart['legend'] = []
        for l in legend.find_all('span'):
          # TODO: maybe convert rbg to color name.
          chart['legend'].append(l.text)
      charts.append(chart)
  return charts
