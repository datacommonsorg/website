# Copyright 2022 Google LLC
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

import json
from typing import Dict

from cachecontrol import CacheControl
from flask import abort
from flask import Blueprint
from flask import current_app
from flask import redirect
from flask import render_template
from flask import request
from flask import session
import google.auth.transport.requests
from google.cloud import exceptions
from google.cloud import storage
from google.oauth2 import id_token
import requests

import server.lib.util as libutil
import server.routes.user.api as user_api

bp = Blueprint('user', __name__, url_prefix='/user')


def get_gcs_bucket(project_id):
  return project_id + '-resources'


@bp.route('/auth/login')
def login():
  flow = current_app.config['OAUTH_FLOW']
  authorization_url, state = flow.authorization_url()
  session['state'] = state
  return redirect(authorization_url)


@bp.route('/auth/callback')
def callback():
  flow = current_app.config['OAUTH_FLOW']
  GOOGLE_CLIENT_ID = current_app.config['GOOGLE_CLIENT_ID']
  flow.fetch_token(authorization_response=request.url)
  if not session['state'] == request.args['state']:
    abort(500)  # State does not match!

  credentials = flow.credentials
  request_session = requests.session()
  cached_session = CacheControl(request_session)
  token_request = google.auth.transport.requests.Request(session=cached_session)

  id_info = id_token.verify_oauth2_token(id_token=credentials._id_token,
                                         request=token_request,
                                         audience=GOOGLE_CLIENT_ID)

  session['oauth_user_id'] = id_info.get('sub')
  return redirect('/user')


@bp.route('/auth/logout')
def logout():
  session.clear()
  return redirect('/user/login')


def login_is_required(func):

  def wrapper(*args, **kwargs):
    if 'oauth_user_id' not in session:
      return redirect('/user/login')
    else:
      return func()

  wrapper.__name__ = func.__name__
  return wrapper


@bp.route('/login')
def index():
  return "Data Commons </br> <a href='/user/auth/login'><button>Login</button></a>"


@bp.route('/imports')
@login_is_required
def imports() -> Dict[str, Dict]:
  return user_api.get_imports(libutil.hash_id(session['oauth_user_id']))


# TODO(shifucun): modularize to a separate file when /import/* path grows.
@bp.route('/import/upload', methods=['POST'])
@login_is_required
def upload_import():
  # TODO: change SECRET_PROJECT to APP_PROJECT
  # Upload import files to GCS
  oauth_user_id = session["oauth_user_id"]
  user_id = libutil.hash_id(oauth_user_id)
  project = current_app.config['SECRET_PROJECT']
  bucket_name = get_gcs_bucket(project)
  gcs_client = storage.Client(project=project)
  try:
    bucket = gcs_client.get_bucket(bucket_name)
  except exceptions.NotFound:
    return f'Bucket {bucket_name} is not found', 500

  import_name = request.form.get('importName')
  if not import_name:
    return 'Import name is empty', 400
  # Since this is adding a new import, the folder should not existed
  # TODO: in the UI, check the import name is non-existence for this user.
  gcs_files = []
  for f in request.files.getlist('files'):
    blob_name = f'{user_id}/{import_name}/{f.filename}'
    blob = bucket.blob(blob_name)
    blob.upload_from_string(f.read())
    gcs_files.append(user_api.GcsFile(bucket_name, blob_name))
  # Record the entry in user database
  user_api.add_import(user_id, import_name, gcs_files)
  return '', 200


@bp.route('/')
@login_is_required
def get_user():
  oauth_user_id = session['oauth_user_id']
  user_id = libutil.hash_id(oauth_user_id)
  is_new_user = False
  if not user_api.has_user(user_id):
    user_api.create_user(user_id)
    is_new_user = True
  user = user_api.get_user(user_id)
  return render_template('/user/portal.html',
                         user=json.dumps(user.to_dict()),
                         is_new_user=is_new_user)
