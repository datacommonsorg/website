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

import flask

import server.routes.api.place as place_api

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
  return flask.render_template('ranking.html',
                               place_name=place_name,
                               place_dcid=place_dcid,
                               place_type=place_type,
                               per_capita=per_capita,
                               stat_var=stat_var)
