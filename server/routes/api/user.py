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

from enum import Enum
from flask import current_app

bp = flask.Blueprint('api.user', __name__, url_prefix='/api/user')

# User information is stored in Cloud Firestore as "users" collection.
# Each user document has a "imports" subcollection that stores the import
# document. So an import has the a path like:
#
# /users/<user_id>/imports/<import_id>
#
USER_COLLECTION = 'users'
IMPORT_COLLECTION = 'imports'


class ImportStatus(Enum):
    IMPORTED = 1


def get_user_db():
    return current_app.config['USER_DB']


def get_user_info(user_id):
    """Returns user document from Cloud Firestore.

    User doc contains "imports" subcollection that holds the "import" document.
    """
    db = get_user_db()
    for user in db.collection(USER_COLLECTION).stream():
        if user.id == user_id:
            return json.dumps(user.to_dict())
    return {}


def create_user(user_id):
    """Create a new user."""
    db = get_user_db()
    db.collection(USER_COLLECTION).document(user_id).set({})


def add_import(user_id, import_name):
    """Add a new import for a user"""
    db = get_user_db()
    user_ref = db.collection(USER_COLLECTION).document(user_id)
    import_ref = user_ref.collection(IMPORT_COLLECTION).document(import_name)
    import_ref.set({'status': ImportStatus.IMPORTED.value})
