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
import services.datacommons as dc
import routes.api.place as place_api

from cache import cache

bp = flask.Blueprint('ranking', __name__, url_prefix='/ranking')

# Only show the top 100 places in rankings for now
RANK_KEYS = ['rankAll', 'rankTop1000']
RANK_SIZE = 100


def stat_var_to_string(stat_var):
    parts = stat_var.split('_')
    if len(parts) < 2:
        return {}
    measured_property = parts[0]
    pop_type = parts[1]


@bp.route('/<place_type>')
@bp.route('/<place_type>/<path:place_dcid>')
def ranking(place_type, place_dcid=''):
    place_name = ''
    if place_dcid:
        place_names = place_api.get_name([place_dcid])
        place_name = place_names[place_dcid]
        if place_name == '':
            place_name = place_dcid
    else:
        place_name = 'World'
    stat_vars = flask.request.args.getlist('stat')
    return flask.render_template('ranking.html',
                                 place_name=place_name,
                                 place_dcid=place_dcid,
                                 place_type=place_type,
                                 stat_vars=stat_vars)


@bp.route('/api/<place_type>/')
@bp.route('/api/<place_type>/<path:place>')
def ranking_api(place_type, place=None):
    """Returns top 100 rankings for a stats var, grouped by place type and
    optionally scoped by a containing place. Each place in the ranking has
    it's named returned, if available.
    """
    stats = flask.request.args.getlist('stat')
    ranking_results = dc.get_place_ranking(stats, place_type, place)
    if not 'payload' in ranking_results:
        return ranking_results
    payload = ranking_results['payload']
    dcids = set()
    for sv in payload:
        try:
            del payload[sv]['rankBottom1000']
        except KeyError:
            pass  # key might not exist for fewer than 1000 places
        for k in RANK_KEYS:
            if k in payload[sv] and 'info' in payload[sv][k]:
                payload[sv][k]['info'] = payload[sv][k]['info'][:RANK_SIZE]
                for r in payload[sv][k]['info']:
                    dcids.add(r['placeDcid'])
    place_names = place_api.get_name(list(dcids))
    for sv in payload:
        for k in RANK_KEYS:
            if k in payload[sv] and 'info' in payload[sv][k]:
                for r in payload[sv][k]['info']:
                    r['placeName'] = place_names[r['placeDcid']]
    return ranking_results
