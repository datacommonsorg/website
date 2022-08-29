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
"""User related handlers."""

import flask
import json

from flask import current_app

bp = flask.Blueprint('api.user', __name__, url_prefix='/api/user')


def get_user_info(google_id):
    """Returns data given a user id."""
    db = current_app.config['USER_DB']
    users_ref = db.collection(u'users')
    docs = users_ref.stream()
    for doc in docs:
        if doc.id == google_id:
            return json.dumps(doc.to_dict())
    return {}


def create_user(google_id, data):
    """Create a new user."""
    db = current_app.config['USER_DB']
    doc_ref = db.collection(u'users').document(google_id)
    doc_ref.set(data)


def add_import(google_id, import_name):
    """Add a new import for a user"""
    db = current_app.config['USER_DB']
    doc_ref = db.collection(u'users').document(google_id)
    importUpdate = {}
    importUpdate[f'import.{import_name}.status'] = "imported"
    doc_ref.update(importUpdate)
