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
import json
import os

from flask import Blueprint
from flask import current_app
from flask import redirect
from flask import render_template
from flask import request

import server.lib.render as lib_render
from server.services import datacommons as dc

bp = Blueprint('static', __name__)


@bp.route('/')
def homepage():
  # Return old homepage if hiding revamp changes
  # http since the ssl happens in GCP load balancer.
  if request.url == 'http://unsdg.datacommons.org/':
    return redirect('https://unstats.un.org/UNSDWebsite/undatacommons/sdgs',
                    code=302)
  return lib_render.render_page(
      "static/homepage.html",
      "homepage.html",
      topics=json.dumps(current_app.config.get('HOMEPAGE_TOPICS', [])),
      partners_list=current_app.config.get('HOMEPAGE_PARTNERS', []),
      partners=json.dumps(current_app.config.get('HOMEPAGE_PARTNERS', [])),
      sample_questions=json.dumps(
          current_app.config.get('HOMEPAGE_SAMPLE_QUESTIONS', [])))


@bp.route('/about')
def about():
  return lib_render.render_page("static/about.html", "about.html")


@bp.route('/build')
def build():
  return lib_render.render_page(
      "static/build.html",
      "build.html",
      partners=json.dumps(current_app.config.get('HOMEPAGE_PARTNERS', [])))


@bp.route('/faq')
def faq():
  current_date = date.today().strftime('%-d %b %Y')
  current_year = date.today().strftime('%Y')
  return lib_render.render_page("static/faq.html",
                                "faq.html",
                                current_date=current_date,
                                current_year=current_year)


@bp.route('/disclaimers')
def disclaimers():
  return lib_render.render_page("static/disclaimers.html", "disclaimers.html")


@bp.route('/feedback')
def feedback():
  return lib_render.render_page("static/feedback.html", "feedback.html")


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@bp.route('/translator')
def translator_handler():
  return render_template('translator.html')


@bp.route('/healthz')
def healthz():
  return "very healthy"


# Alternate health check route in case /healthz is intercepted by infrastructure
# (e.g. when running as a Cloud Run service)
@bp.route('/health')
def health():
  return "super healthy"


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
                         mixer_hash=mixer_version.get('gitHash', ''),
                         tables=mixer_version.get('tables', ''),
                         bigquery=mixer_version.get('bigquery', ''),
                         remote_mixer_domain=mixer_version.get(
                             'remoteMixerDomain', ''))
