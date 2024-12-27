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
"""Data Commons Explore page routes"""

import os

from flask import Blueprint
from flask import current_app
from flask import render_template

bp = Blueprint('explore', __name__, url_prefix='/explore')


@bp.route('', strict_slashes=False)
def page():
  return render_template('/explore.html',
                         manual_ga_pageview=True,
                         maps_api_key=current_app.config.get('MAPS_API_KEY'),
                         website_hash=os.environ.get("WEBSITE_HASH"))


@bp.route('/<string:topic>')
def landing(topic):
  return render_template('/explore_landing.html',
                         topic=topic,
                         website_hash=os.environ.get("WEBSITE_HASH"))
