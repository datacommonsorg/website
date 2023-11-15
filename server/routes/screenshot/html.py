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
from datetime import timedelta
import io
import json
import os
import urllib.parse

from dateutil.relativedelta import relativedelta
import flask
from flask import current_app
from flask import request
from github import Github
from google.cloud import secretmanager
from google.cloud import storage
from markupsafe import escape

from server import cache
from server.lib.gcs import list_folder
from server.lib.gcs import read_blob
from server.routes.screenshot.diff import img_diff

SCREENSHOT_BUCKET = 'datcom-website-screenshot'
GCS_IMAGE_URL = 'https://storage.mtls.cloud.google.com/'

bp = flask.Blueprint("screenshot", __name__, url_prefix='/screenshot')


def env_valid():
  return os.environ.get('FLASK_ENV') in [
      'autopush', 'local', 'test', 'webdriver'
  ]


def get_image_url(blob_name):
  return os.path.join(GCS_IMAGE_URL, SCREENSHOT_BUCKET,
                      urllib.parse.quote(blob_name))


def get_page_url_from_blob(prefix, blob_name):
  name = blob_name.removeprefix(prefix).removesuffix('.png')
  return urllib.parse.unquote(name)


def list_png(bucket_name, prefix):
  """Return a png blob name and url given bucket and folder prefix.

  Args:
    bucket_name: the bucket where the image is stored.
    prefix: the folder prefix
  Returns:
    A map from blob name to image url and page url
  """
  storage_client = storage.Client()
  bucket = storage_client.get_bucket(bucket_name)
  blobs = bucket.list_blobs(prefix=prefix)
  # Read the image url json
  image_url = {}
  blob = bucket.get_blob(prefix + '/screenshot_url.json')
  if blob:
    image_url = json.loads(blob.download_as_string())
  result = {}
  for b in blobs:
    if b.name.endswith('png'):
      if b.metadata:
        result[b.name] = {
            'page_url': b.metadata['url'],
            'image_url': get_image_url(b.name)
        }
      elif image_url:
        parts = b.name.split('/')
        file_name = parts[len(parts) - 1]
        if file_name in image_url:
          result[b.name] = {
              'page_url': image_url[file_name],
              'image_url': get_image_url(b.name)
          }
      else:
        result[b.name] = {
            'page_url': get_page_url_from_blob(prefix, b.name),
            'image_url': get_image_url(b.name)
        }
      # Remove param used for logging purpose. So runs with and without this
      # param can be compared.
      result[b.name]['page_url'] = result[b.name]['page_url'].replace(
          '&test=screenshot', '')
  return result


@bp.route('/')
def home():
  """List recent commits and diff url

  Optional url argument "base" to set a base commit sha or date string for
  comparison.
  """
  if not env_valid():
    flask.abort(404)
  domain = request.args.get('domain', '')

  if domain:
    base_date = request.args.get('base_date', '')
    one_month_ago = datetime.now() - timedelta(days=30)
    start_offset = one_month_ago.strftime("%Y_%m_%d")
    folders = list_folder(SCREENSHOT_BUCKET, domain, start_offset)
    data = []
    prev_date = ''
    for date in folders:
      item = {'date': date, 'prev_date': prev_date, 'base_date': base_date}
      prev_date = date
      data.append(item)
    # Change back the item order from new to old
    data.reverse()
    return flask.render_template('screenshot/home.html',
                                 domain=domain,
                                 data=data)

  base_sha = request.args.get('base_sha', '')
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
        'prev_sha': prev_sha,
        'base_sha': base_sha,
    }
    prev_sha = sha
    data.append(item)
  # Change back the item order from new to old
  data.reverse()
  return flask.render_template('screenshot/home.html', data=data)


@bp.route('/commit/<path:sha>')
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def commit(sha):
  if not env_valid():
    flask.abort(404)
  prefix = 'local/' + sha
  images = list_png(SCREENSHOT_BUCKET, prefix)
  return flask.render_template('screenshot/commit.html', images=images, sha=sha)


@bp.route('/date/<path:date>')
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def date(date):
  if not env_valid():
    flask.abort(404)
  domain = request.args.get('domain')
  prefix = domain + '/' + date
  images = list_png(SCREENSHOT_BUCKET, prefix)
  return flask.render_template('screenshot/date.html', images=images, date=date)


@bp.route('/compare/<path:compare>')
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def compare(compare):
  """
  compare is an expression in the form of "githash1...githash2".
  This is to follow the github url pattern.
  """
  if not env_valid():
    flask.abort(404)
  domain = request.args.get('domain') or 'local'

  compare = str(escape(compare))
  parts = compare.split('...')
  if len(parts) != 2:
    return "Invalid hash comparison: " + compare, 400

  token1 = parts[0]
  token2 = parts[1]
  prefix1 = domain + '/' + token1
  prefix2 = domain + '/' + token2
  images1 = list_png(SCREENSHOT_BUCKET, prefix1)
  images2 = list_png(SCREENSHOT_BUCKET, prefix2)
  return flask.render_template('screenshot/compare.html',
                               images1=json.dumps(images1),
                               images2=json.dumps(images2),
                               token1=token1,
                               token2=token2,
                               domain=domain)


@bp.route('/api/diff')
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def diff():
  blob1 = request.args.get('blob1')
  blob2 = request.args.get('blob2')
  if not blob1 or not blob2:
    flask.abort(500, description='url param blob1 or blob2 is missing')

  im1 = read_blob(SCREENSHOT_BUCKET, blob1)
  im2 = read_blob(SCREENSHOT_BUCKET, blob2)

  diff, diff_ratio = img_diff(im1, im2)
  diff_byte_arr = io.BytesIO()
  diff.save(diff_byte_arr, format='PNG')
  diff_byte_arr = diff_byte_arr.getvalue()
  return {
      'diff': b64encode(diff_byte_arr).decode('utf-8'),
      'base': b64encode(im1).decode('utf-8'),
      'new': b64encode(im2).decode('utf-8'),
      'diffRatio': diff_ratio
  }