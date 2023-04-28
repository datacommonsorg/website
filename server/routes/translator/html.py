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
"""Data Commons translator page."""

from flask import Blueprint
from flask import render_template

bp = Blueprint('static', __name__)


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@bp.route('/translator')
def translator():
  return render_template('translator.html')
