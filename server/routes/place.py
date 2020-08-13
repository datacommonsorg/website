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

from cache import cache
# import main
# import services.util

# from flask import Blueprint, render_template

bp = flask.Blueprint(
  'place',
  __name__,
  url_prefix='/place'
)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_property_value(dcid, prop, out=True):
    return dc.get_property_values([dcid], prop, out)[dcid]


@bp.route('/')
def place():
    place_dcid = flask.request.args.get('dcid')
    if not place_dcid:
        return flask.redirect(flask.url_for('place.place', dcid='country/USA'))
    place_types = get_property_value(place_dcid, 'typeOf')
    # We prefer to use specific type like "State", "County" over "AdministrativeArea"
    chosen_type = None
    for place_type in place_types:
        if not chosen_type or chosen_type.startswith('AdministrativeArea'):
            chosen_type = place_type
    place_names = get_property_value(place_dcid, 'name')
    if place_names:
        place_name = place_names[0]
    else:
        place_name = place_dcid
    topic = flask.request.args.get('topic', '')
    return flask.render_template(
        'place.html',
        place_type=chosen_type,
        place_name=place_name,
        place_dcid=place_dcid,
        topic=topic)

