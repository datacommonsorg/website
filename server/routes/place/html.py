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

import json
import os

import flask
from flask import current_app
from flask import g

import server.routes.shared_api.place as place_api

bp = flask.Blueprint('place', __name__, url_prefix='/place')

CATEGORY_REDIRECTS = {
    "Climate": "Environment",
}


@bp.route('', strict_slashes=False)
@bp.route('/<path:place_dcid>/', strict_slashes=False)
def place(place_dcid=None):
  redirect_args = dict(flask.request.args)
  should_redirect = False
  if 'topic' in flask.request.args:
    redirect_args['category'] = flask.request.args.get('topic', '')
    del redirect_args['topic']
    should_redirect = True

  category = redirect_args.get('category', None)
  if category in CATEGORY_REDIRECTS:
    redirect_args['category'] = CATEGORY_REDIRECTS[category]
    should_redirect = True

  if should_redirect:
    redirect_args['place_dcid'] = place_dcid
    return flask.redirect(flask.url_for('place.place', **redirect_args))

  dcid = flask.request.args.get('dcid', None)
  seed = flask.request.args.get('seed', 0)
  if dcid:
    # Traffic from "explore more" in Search. Forward along all parameters,
    # except for dcid, to the new URL format.
    redirect_args = dict(flask.request.args)
    redirect_args['place_dcid'] = dcid
    del redirect_args['dcid']
    redirect_args['category'] = category
    url = flask.url_for('place.place',
                        **redirect_args,
                        _external=True,
                        _scheme=current_app.config.get('SCHEME', 'https'))
    return flask.redirect(url)

  if not place_dcid:
    return place_landing()

  place_type = place_api.get_place_type(place_dcid)
  place_names = place_api.get_i18n_name([place_dcid])
  if place_names and place_names.get(place_dcid):
    place_name = place_names[place_dcid]
  else:
    place_name = place_dcid
  return flask.render_template('place.html',
                               place_type=place_type,
                               place_name=place_name,
                               place_dcid=place_dcid,
                               category=category if category else '',
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               seed=seed)


def place_landing():
  """Returns filled template for the place landing page."""
  template_file = os.path.join('custom_dc', g.env, 'place_landing.html')
  dcid_json = os.path.join('custom_dc', g.env, 'place_landing_dcids.json')
  if not os.path.exists(
      os.path.join(current_app.root_path, 'templates', template_file)):
    template_file = 'place_landing.html'
    dcid_json = 'place_landing_dcids.json'

  with open(os.path.join(current_app.root_path, 'templates', dcid_json)) as f:
    landing_dcids = json.load(f)
    # Use display names (including state, if applicable) for the static page
    place_names = place_api.get_display_name(landing_dcids)
    return flask.render_template(
        template_file,
        place_names=place_names,
        maps_api_key=current_app.config['MAPS_API_KEY'])
