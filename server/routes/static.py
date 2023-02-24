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
"""Data Commons static content routes."""

from datetime import date
import os

import babel.dates as babel_dates
from flask import Blueprint
from flask import current_app
from flask import g
from flask import render_template

from server.services import datacommons as dc

bp = Blueprint('static', __name__)


@bp.route('/')
def homepage():
  template_file = os.path.join('custom_dc', g.env, 'homepage.html')
  if os.path.exists(
      os.path.join(current_app.root_path, 'templates', template_file)):
    return render_template(template_file)
  if current_app.config['CUSTOM']:
    return render_template('custom_dc/default/homepage.html')
  blog_date = babel_dates.format_date(date(2021, 7, 26),
                                      format='long',
                                      locale=g.locale)
  return render_template('static/homepage.html', blog_date=blog_date)


@bp.route('/about')
def about():
  template_file = os.path.join('custom_dc', g.env, 'about.html')
  if os.path.exists(
      os.path.join(current_app.root_path, 'templates', template_file)):
    return render_template(template_file)
  return render_template('static/about.html')


@bp.route('/faq')
def faq():
  current_date = date.today().strftime('%-d %b %Y')
  current_year = date.today().strftime('%Y')
  template_file = os.path.join('custom_dc', g.env, 'faq.html')
  if os.path.exists(
      os.path.join(current_app.root_path, 'templates', template_file)):
    return render_template(template_file,
                           current_date=current_date,
                           current_year=current_year)
  return render_template('static/faq.html',
                         current_date=current_date,
                         current_year=current_year)


@bp.route('/disclaimers')
def disclaimers():
  return render_template('static/disclaimers.html')


@bp.route('/feedback')
def feedback():
  template_file = os.path.join('custom_dc', g.env, 'feedback.html')
  if os.path.exists(
      os.path.join(current_app.root_path, 'templates', template_file)):
    return render_template(template_file)
  return render_template('static/feedback.html')


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@bp.route('/translator')
def translator_handler():
  return render_template('translator.html')


@bp.route('/healthz')
def healthz():
  return "very healthy"


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@bp.route('/mcf_playground')
def mcf_playground():
  return render_template('mcf_playground.html')


# TODO(shifucun): get branch cache version from mixer
@bp.route('/version')
def version():
  mixer_version = dc.version()
  return render_template('version.html',
                         website_hash=os.environ.get("WEBSITE_HASH"),
                         mixer_hash=mixer_version['gitHash'],
                         tables=mixer_version['tables'],
                         bigquery=mixer_version['bigquery'])
