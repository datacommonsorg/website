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

import collections

from flask import Blueprint
from flask import flash
from flask import g
from flask import redirect
from flask import render_template
from flask import request
from flask import url_for
from google.cloud import storage

from cache import cache


_MAX_BLOBS = 1
_FC_FEEDS_BUCKET = 'datacommons-feeds'


def list_blobs(bucket_name):
  """Return a dictionary of three recent blobs in the bucket.

  Args:
    bucket_name: the bucket where the feed is stored.
  Returns:
    Ordered dictionary of three recent blobs, most recent first.
  """
  storage_client = storage.Client()
  bucket = storage_client.get_bucket(bucket_name)

  blobs = bucket.list_blobs()

  json_blobs = []
  for b in blobs:
    if b.name.endswith('.json'):
      json_blobs.append(b)

  recent_blobs = sorted(json_blobs, key=lambda blob: blob.updated, reverse=True)
  d = collections.OrderedDict()
  num_blobs = 0
  for b in recent_blobs:
    formatted_date = b.updated.strftime('%Y-%m-%d %H:%M:%S')
    d[formatted_date] = b
    num_blobs += 1
    if num_blobs == _MAX_BLOBS:
      break
  return d

# Define blueprint
bp = Blueprint(
  "factcheck",
  __name__,
  url_prefix='/factcheck'
)

@bp.route('/')
def homepage():
  return render_template('factcheck/factcheck_homepage.html')

@bp.route('/faq')
def faq():
  return render_template('factcheck/factcheck_faq.html')

@bp.route('/blog')
def blog():
  return render_template('factcheck/factcheck_blog.html')

@bp.route('/download')
def download():
  recent_blobs = list_blobs(_FC_FEEDS_BUCKET)
  return render_template('factcheck/factcheck_download.html')