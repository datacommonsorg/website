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
"""Data Commons NL Interface routes"""

import logging
import os

import flask
from flask import Blueprint
from flask import current_app
from flask import g
from flask import render_template
from flask import request
from selenium import webdriver

from server.lib.nl import scraper

bp = Blueprint('nl', __name__, url_prefix='/nl')


@bp.route('/')
def page():
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  placeholder_query = ''
  # TODO: Make this more customizable for all custom DC's
  if g.env == 'climate_trace':
    placeholder_query = 'Greenhouse gas emissions in USA'
  return render_template('/nl_interface.html',
                         maps_api_key=current_app.config['MAPS_API_KEY'],
                         placeholder_query=placeholder_query,
                         website_hash=os.environ.get("WEBSITE_HASH"))


def _get_selenium_driver():
  options = webdriver.chrome.options.Options()
  options.add_argument("--headless=new")
  options.add_argument("--disable-gpu")
  options.add_argument("--no-sandbox")
  options.add_argument("enable-automation")
  options.add_argument("--disable-infobars")
  options.add_argument("--disable-dev-shm-usage")
  return webdriver.Chrome(options=options)


@bp.route('/screenshot')
def screenshot():
  query_text = request.args.get('q', '')
  #
  # Create a new session every time for a couple of reasons:
  # 1. Sessions are not thread-safe, so we need to use a pool / thread-local
  # 2. Importantly, once we do a driver.get(), we cannot apparently not close the
  #    page, other than running a script to clear out its content (seems hacky).
  #    So we can end up scraping the old content for a new query incorrectly.
  # So, this approach is simpler but evaluate and maybe revisit.
  #
  driver = _get_selenium_driver()
  try:
    charts = scraper.scrape(query_text, driver)
  finally:
    driver.quit()
  return {'charts': charts}


@bp.route('/data')
def data_page():
  logging.info('NL Data Page: Enter')
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  placeholder_query = ''
  # TODO: Make this more customizable for all custom DC's
  if g.env == 'climate_trace':
    placeholder_query = 'Greenhouse gas emissions in USA'
  template = render_template('/nl_interface_data.html',
                             maps_api_key=current_app.config['MAPS_API_KEY'],
                             placeholder_query=placeholder_query,
                             website_hash=os.environ.get("WEBSITE_HASH"))
  logging.info('NL Data Page: Exit')
  return template
