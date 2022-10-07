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
"""Data Commons Knowledge Graph Browser routes
"""

from flask import Blueprint, current_app, render_template
import routes.api.shared as shared_api

bp = Blueprint('browser', __name__, url_prefix='/browser')


@bp.route('/')
def browser_main():
    env_name = current_app.config.get('ENV_NAME', None)
    if env_name == 'IITM':
        return render_template('private_dc/iitm/browser_landing.html')
    return render_template('/browser/landing.html')


@bp.route('/<path:dcid>')
def browser_node(dcid):
    node_name = shared_api.cached_name(dcid).get(dcid)
    if not node_name:
        node_name = dcid
    return render_template('/browser/node.html', dcid=dcid, node_name=node_name)
