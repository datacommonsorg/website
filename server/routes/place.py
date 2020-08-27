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
import services.datacommons as dc
import routes.api.place as place_api

from cache import cache
# import main
# import services.util

# from flask import Blueprint, render_template

bp = flask.Blueprint(
  'place',
  __name__,
  url_prefix='/place'
)


@bp.route('', strict_slashes=False)
def place():
    place_dcid = flask.request.args.get('dcid')
    if not place_dcid:
        return flask.redirect(flask.url_for('place.place', dcid='country/USA'))
    place_type = place_api.get_place_type(place_dcid)
    place_names = place_api.get_property_value(place_dcid, 'name')
    if place_names:
        place_name = place_names[0]
    else:
        place_name = place_dcid
    topic = flask.request.args.get('topic', '')
    return flask.render_template(
        'place.html',
        place_type=place_type,
        place_name=place_name,
        place_dcid=place_dcid,
        topic=topic)

