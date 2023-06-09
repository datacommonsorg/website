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
from datetime import datetime
import io
import os

from dateutil.relativedelta import relativedelta
import flask
from flask import current_app
from flask import request
from github import Github
from google.cloud import secretmanager
from markupsafe import escape

from server.lib.gcs import list_png
from server.routes.screenshot.diff import img_diff

SCREENSHOT_BUCKET = 'datcom-website-screenshot'

bp = flask.Blueprint("screenshot", __name__, url_prefix='/screenshot')


@bp.route('/')
def commit_list():
  """List recent commits and diff url

  Optional url argument "base" to set a base commit sha for comparison.
  """
  base_sha = request.args.get('base', '')
  # Secret generated from Github account 'dc-org2018'
  secret_client = secretmanager.SecretManagerServiceClient()
  secret_name = secret_client.secret_version_path(
      current_app.config['SECRET_PROJECT'], 'github-token', 'latest')
  secret_response = secret_client.access_secret_version(name=secret_name)
  token = secret_response.payload.data.decode('UTF-8')
  g = Github(token)
  # Then, get the repository:
  repo = g.get_repo("datacommonsorg/website")
  one_month_ago = datetime.now() - relativedelta(months=1)
  # Get the most recent commits:
  commits = repo.get_commits(since=one_month_ago)
  data = []
  prev_sha = ''
  for c in commits.reversed:
    item = {}
    commit = c.commit
    raw_message = commit.message
    message = raw_message
    ready = False
    for i in range(0, len(raw_message) - 1):
      if raw_message[i] == '(' and raw_message[i + 1] == '#':
        ready = True
      if ready and raw_message[i] == ')':
        message = raw_message[0:i + 1]
        break
    sha = c.sha[0:7]
    item = {
        'message': message,
        'url': c.html_url,
        'sha': sha,
        'base_sha': base_sha,
        'compare_base': ''
    }
    if prev_sha:
      item['compare'] = '{}...{}'.format(prev_sha, sha)
    if base_sha:
      item['compare_base'] = '{}...{}'.format(prev_sha, base_sha)
    prev_sha = sha
    data.append(item)
  # Change back the item order from new to old
  data.reverse()
  return flask.render_template('screenshot_landing.html', data=data)


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
