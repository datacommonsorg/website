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

from flask import Blueprint, render_template, g
from lib.gcs import list_blobs
import routes.api.place as place_api

_SA_FEED_BUCKET = 'datacommons-frog-feed'
_MAX_BLOBS = 1

bp = Blueprint('static', __name__)

_HOMEPAGE_PLACE_DCIDS = [
    'geoId/1150000', 'geoId/3651000', 'geoId/0649670', 'geoId/4805000'
]


@bp.route('/')
def homepage():
    place_names = place_api.get_display_name('^'.join(_HOMEPAGE_PLACE_DCIDS),
                                             g.locale)
    return render_template('static/homepage.html', place_names=place_names)


@bp.route('/about')
def about():
    return render_template('static/about.html')


@bp.route('/faq')
def faq():
    return render_template('static/faq.html')


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
