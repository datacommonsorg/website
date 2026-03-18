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
"""Place Ranking related handlers."""

import json

import flask
from flask import current_app

import server.routes.shared_api.place as place_api
import server.lib.feature_flags as feature_flags

bp = flask.Blueprint('ranking', __name__, url_prefix='/ranking')


@bp.route('/<stat_var>/<place_type>', strict_slashes=False)
@bp.route('/<stat_var>/<place_type>/<path:place_dcid>')
def ranking(stat_var, place_type, place_dcid=''):
  place_name = ''
  if place_dcid:
    place_names = place_api.get_i18n_name([place_dcid])
    place_name = place_names[place_dcid]
    if place_name == '':
      place_name = place_dcid
  else:
    place_name = 'the World'
  per_capita = flask.request.args.get('pc', False) != False

  # Check if the new ranking page feature flag is enabled
  use_new_ranking = feature_flags.is_feature_enabled(
      feature_flags.NEW_RANKING_PAGE, app=current_app, request=flask.request)

  return flask.render_template('ranking.html',
                               place_name=place_name,
                               place_dcid=place_dcid,
                               place_type=place_type,
                               per_capita=per_capita,
                               stat_var=stat_var,
                               use_new_ranking=use_new_ranking,
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))
