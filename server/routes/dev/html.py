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

import os

import flask

from server.lib.gcs import list_png

SCREENSHOT_BUCKET = 'datcom-website-screenshot'

# Define blueprint
bp = flask.Blueprint("dev", __name__, url_prefix='/dev')


@bp.route('/')
def dev():
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)
  return flask.render_template('dev/dev.html')


@bp.route('/screenshot/<path:folder>')
def screenshot(folder):
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)
  images = list_png(SCREENSHOT_BUCKET, folder)
  return flask.render_template('dev/screenshot.html', images=images)
