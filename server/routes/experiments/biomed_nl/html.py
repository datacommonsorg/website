# Copyright 2025 Google LLC
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
"""Biomed NL interface page routes"""

import flask

# Define blueprint
bp = flask.Blueprint("biomed_nl", __name__, url_prefix='/experiments/biomed_nl')


@bp.route('/')
def biomed_nl():
  return flask.render_template('experiments/biomed_nl.html')
