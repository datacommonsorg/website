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
from flask import Blueprint, current_app, session, abort, redirect, request
from google.oauth2 import id_token
from cachecontrol import CacheControl
import google.auth.transport.requests

bp = Blueprint('user', __name__)


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


def login_is_required(function):

    def wrapper(*args, **kwargs):
        if 'google_id' not in session:
            return redirect('/user/login')
        else:
            return function()

    return wrapper


@bp.route('/user/login')
def index():
    return "Data Commons </br> <a href='/auth/login'><button>Login</button></a>"


@bp.route('/user')
@login_is_required
def user():
    return f"Hello {session['name']}! <br/> <a href='/auth/logout'><button>Logout</button></a>"