# Copyright 2021 Google LLC
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
"""Topic page related handlers."""

import flask
from flask import current_app
import os
import routes.api.place as place_api

bp = flask.Blueprint('topic_page', __name__, url_prefix='/topic')


@bp.route('', strict_slashes=False)
@bp.route('/<path:place_dcid>', strict_slashes=False)
def topic_page(place_dcid=None):
    if os.environ.get('FLASK_ENV') == 'production':
        flask.abort(404)
    topic = flask.request.args.get('topic', '')
    # TODO: should use place metadata API to fetch these data in one call.
    place_type = place_api.get_place_type(place_dcid)
    place_names = place_api.get_i18n_name([place_dcid])
    if place_names:
        place_name = place_names[place_dcid]
    else:
        place_name = place_dcid
    return flask.render_template('topic_page.html',
                                 place_type=place_type,
                                 place_name=place_name,
                                 place_dcid=place_dcid,
                                 topic=topic)
