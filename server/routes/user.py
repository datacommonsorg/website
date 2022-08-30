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

import requests
from flask import Blueprint, current_app, session, abort, redirect, request, render_template
from google.oauth2 import id_token
from cachecontrol import CacheControl
import google.auth.transport.requests
from google.cloud import storage

import routes.api.user as user_api

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
    token_request = google.auth.transport.requests.Request(
        session=cached_session)

    id_info = id_token.verify_oauth2_token(id_token=credentials._id_token,
                                           request=token_request,
                                           audience=GOOGLE_CLIENT_ID)

    session['google_id'] = id_info.get('sub')
    session['name'] = id_info.get('name')
    return redirect('/user')


@bp.route('/auth/logout')
def logout():
    session.clear()
    return redirect('/user/login')


def login_is_required(func):

    def wrapper(*args, **kwargs):
        if 'google_id' not in session:
            return redirect('/user/login')
        else:
            return func()

    wrapper.__name__ = func.__name__
    return wrapper


@bp.route('/login')
def index():
    return "Data Commons </br> <a href='/user/auth/login'><button>Login</button></a>"


@bp.route('/upload/import', methods=['POST'])
@login_is_required
def upload_import():
    # TODO: changeg SECRETE_PROJECT to APP_PROJECT
    # Upload import files to GCS
    user_id = session["google_id"]
    project = current_app.config['SECRET_PROJECT']
    bucket_name = get_gcs_bucket(project)
    gcs_client = storage.Client(project=project)
    bucket = gcs_client.get_bucket(bucket_name)
    import_name = request.form.get('importName')
    # Since this is adding a new import, the folder should not existed
    # TODO: in the UI, check the import name is non-existence for this user.
    for f in request.files.getlist('files'):
        blob_name = f'{user_id}/{import_name}/{f.filename}'
        blob = bucket.blob(blob_name)
        blob.upload_from_string(f.read())
    # Record the entry in user database
    user_api.add_import(user_id, import_name)
    return '', 200


@bp.route('/')
@login_is_required
def user():
    user_id = session['google_id']
    user_name = session['name']
    user_info = user_api.get_user_info(user_id)
    is_new_user = False
    if not user_info:
        user_api.create_user(user_id, {'name': user_name})
        is_new_user = True
    user_info = user_api.get_user_info(user_id)
    return render_template('/user/portal.html',
                           info=user_info,
                           is_new_user=is_new_user)
