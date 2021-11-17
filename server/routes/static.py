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
from flask import Blueprint, render_template, current_app, g
from lib.gcs import list_blobs
import babel.dates as babel_dates
import routes.api.place as place_api

_SA_FEED_BUCKET = 'datacommons-frog-feed'
_MAX_BLOBS = 1

bp = Blueprint('static', __name__)

_HOMEPAGE_PLACE_DCIDS = [
    'country/IND',  # India
    'country/USA',  # USA
    'geoId/06029',  # Kern County, CA
    'geoId/06085',  # Santa Clara County, CA
    'geoId/0668000',  # San Jose, CA
    'geoId/22095',  # St John the Baptist Parish, LA
    'geoId/3651000',  # New York City
    'wikidataId/Q1445',  # Tamil Nadu
]


@bp.route('/')
def homepage():
    if current_app.config['PRIVATE']:
        return render_template('static/private.html')
    if current_app.config['SUSTAINABILITY']:
        return render_template('sustainability/homepage.html')
    # place_names = place_api.get_display_name('^'.join(_HOMEPAGE_PLACE_DCIDS),
    #                                          g.locale)
    blog_date = babel_dates.format_date(date(2021, 7, 26),
                                        format='long',
                                        locale=g.locale)
    return render_template('static/homepage.html',
                        #    place_names=place_names,
                           blog_date=blog_date)


@bp.route('/about')
def about():
    return render_template('static/about.html')


@bp.route('/faq')
def faq():
    current_date = date.today().strftime('%-d %b %Y')
    current_year = date.today().strftime('%Y')
    return render_template('static/faq.html',
                           current_date=current_date,
                           current_year=current_year)


@bp.route('/disclaimers')
def disclaimers():
    return render_template('static/disclaimers.html')


@bp.route('/datasets')
def datasets():
    return render_template('static/datasets.html')


@bp.route('/feedback')
def feedback():
    return render_template('static/feedback.html')


@bp.route('/special_announcement')
def special_announcement():
    recent_blobs = list_blobs(_SA_FEED_BUCKET, _MAX_BLOBS)
    return render_template('static/special_announcement.html',
                           recent_blobs=recent_blobs)


@bp.route('/special_announcement/faq')
def special_announcement_faq():
    return render_template('static/special_announcement_faq.html')
