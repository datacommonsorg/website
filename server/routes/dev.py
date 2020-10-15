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
from flask import Blueprint, request
from werkzeug.utils import import_string

from cache import cache
from lib.gcs import list_png
from google.cloud import secretmanager

SCREENSHOT_BUCKET = 'datcom-browser-screenshot'

# Define blueprint
bp = Blueprint("dev", __name__, url_prefix='/dev')


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


# TODO(shifucun): Add Flask API Authentication with Firebase
@bp.route('/clearcache')
def clearcache():
    return flask.render_template('dev/clearcache.html')


@bp.route('/clearcache/action', methods=['POST'])
def clearcacheaction():
    user_input = request.form.get('secret')
    if os.environ.get('FLASK_ENV') == 'staging':
        cfg = import_string('configmodule.DevelopmentConfig')()
    elif os.environ.get('FLASK_ENV') == 'production':
        cfg = import_string('configmodule.ProductionConfig')()
    else:
        cfg = None
        flask.abort(500)
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path(cfg.PROJECT, 'clearcache',
                                                    '1')
    secret_response = secret_client.access_secret_version(secret_name)
    token = secret_response.payload.data.decode('UTF-8')
    if user_input == token:
        success = cache.clear()
        if success:
            return "Success"
    return "Fail"