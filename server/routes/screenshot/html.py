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

from base64 import b64encode
import io
import os

import flask
from markupsafe import escape

from server.lib.gcs import list_png
from server.routes.screenshot.diff import img_diff

SCREENSHOT_BUCKET = 'datcom-website-screenshot'

bp = flask.Blueprint("screenshot", __name__, url_prefix='/screenshot')


@bp.route('/commit/<path:githash>')
def screenshot(githash):
  if os.environ.get('FLASK_ENV') not in [
      'autopush', 'local', 'test', 'webdriver'
  ]:
    flask.abort(404)
  images = list_png(SCREENSHOT_BUCKET, githash)
  data = {}
  for name in images:
    data[name] = {
        'base': b64encode(images[name]).decode('utf-8'),
    }
  return flask.render_template('screenshot.html', data=data, githash=githash)


@bp.route('/compare/<path:compare>')
def diff(compare):
  """
  compare is an expression in the form of "githash1...githash2".
  This is to follow the github url pattern.
  """

  if os.environ.get('FLASK_ENV') not in [
      'autopush', 'local', 'test', 'webdriver'
  ]:
    flask.abort(404)

  compare = str(escape(compare))
  parts = compare.split('...')
  if len(parts) != 2:
    return "Invalid hash comparison: " + compare, 400

  images_1 = list_png(SCREENSHOT_BUCKET, parts[0])
  images_2 = list_png(SCREENSHOT_BUCKET, parts[1])

  data = {}
  for name, im1 in images_1.items():
    data[name] = {}
    if name in images_2:
      im2 = images_2[name]
      diff, diff_ratio = img_diff(im1, im2)
      diff_byte_arr = io.BytesIO()
      diff.save(diff_byte_arr, format='PNG')
      diff_byte_arr = diff_byte_arr.getvalue()
      data[name] = {
          'diff': b64encode(diff_byte_arr).decode('utf-8'),
          'base': b64encode(im1).decode('utf-8'),
          'diff_ratio': diff_ratio
      }
  return flask.render_template('screenshot.html', data=data, compare=compare)
