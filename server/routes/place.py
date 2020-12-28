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
"""Place Explorer related handlers."""

import flask
from flask import current_app
import routes.api.place as place_api
import logging

bp = flask.Blueprint('place', __name__, url_prefix='/place')


@bp.route('', strict_slashes=False)
@bp.route('/<path:place_dcid>', strict_slashes=False)
def place(place_dcid=None):
    dcid = flask.request.args.get('dcid', None)
    topic = flask.request.args.get('topic', None)
    # TODO(hanluc): Also use request.accept_languages.best_match()
    locale = flask.request.args.get('hl', 'en')
    if dcid:
        url = flask.url_for('place.place',
                            place_dcid=dcid,
                            topic=topic,
                            _external=True,
                            _scheme="https")
        return flask.redirect(url)

    if not place_dcid:
        return flask.render_template(
            'place_landing.html',
            maps_api_key=current_app.config['MAPS_API_KEY'])

    place_type = place_api.get_place_type(place_dcid)
    place_names = place_api.get_i18n_name([place_dcid], locale)
    logging.info("+++++++++++++++++++++++++++++++++++++++++++")
    logging.info(place_type)
    logging.info(place_dcid)
    logging.info(dcid)
    logging.info(place_names)
    if place_names:
        place_name = place_names[place_dcid]
    else:
        place_name = place_dcid
    return flask.render_template(
        'place.html',
        place_type=place_type,
        place_name=place_name,
        place_dcid=place_dcid,
        topic=topic if topic else '',
        maps_api_key=current_app.config['MAPS_API_KEY'])
