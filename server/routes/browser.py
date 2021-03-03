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
import os
import services.datacommons as dc
from flask import Blueprint, render_template

bp = Blueprint('browser', __name__, url_prefix='/browser')


@bp.route('/')
def kg_main():
    return render_template('/browser/kg_main.html')


@bp.route('/<path:dcid>')
def kg_entity(dcid):
    return render_template('/browser/kg_entity.html', dcid=dcid)


@bp.route('/browser2')
@bp.route('/browser2/<path:dcid>')
def browser(dcid=None):
    # TODO(chejennifer): Permit production use after development finishes and update routes
    if os.environ.get('FLASK_ENV') == 'production':
        flask.abort(404)
    if not dcid:
        return render_template('/browser/kg_main.html')
    node_name_values = dc.get_property_values([dcid], "name").get(dcid, [])
    node_name = dcid
    if node_name_values:
        node_name = node_name_values[0]
    return render_template('browser/browser2_entity.html',
                           dcid=dcid,
                           node_name=node_name)