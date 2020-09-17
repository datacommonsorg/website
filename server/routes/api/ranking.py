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
import json
import services.datacommons as dc
import routes.api.place as place_api

bp = flask.Blueprint('api.ranking', __name__, url_prefix='/api/ranking')

# Only show the top 100 places in rankings for now
ALL_KEYS = ['rankAll', 'rankTop1000', 'rankBottom1000']
TOP_KEYS_KEEP = ['rankAll', 'rankTop1000']
TOP_KEYS_DEL = ['rankBottom1000']
BOTTOM_KEYS_KEEP = ['rankBottom1000']
BOTTOM_KEYS_DEL = ['rankTop1000']
RANK_SIZE = 100


@bp.route('/<stat_var>/<place_type>/')
@bp.route('/<stat_var>/<place_type>/<path:place>')
def ranking_api(stat_var, place_type, place=None):
    """Returns top 100 rankings for a stats var, grouped by place type and
    optionally scoped by a containing place. Each place in the ranking has
    it's named returned, if available.

    Optional GET args:
        pc (per capita - the presence of the key enables it)
        bottom (show bottom ranking instead - the presence of the key enables it)
    """
    is_per_capita = flask.request.args.get('pc', False) != False
    is_show_bottom = flask.request.args.get('bottom', False) != False
    rank_keys = BOTTOM_KEYS_KEEP if is_show_bottom else TOP_KEYS_KEEP
    delete_keys = BOTTOM_KEYS_DEL if is_show_bottom else TOP_KEYS_DEL

    ranking_results = dc.get_place_ranking([stat_var], place_type, place,
                                           is_per_capita)
    if not 'payload' in ranking_results:
        flask.abort(500)
    payload = ranking_results['payload']
    if not stat_var in ranking_results['payload']:
        flask.abort(500)

    # split rankAll to top/bottom if it's larger than RANK_SIZE
    if 'rankAll' in payload[stat_var]:
        rank_all = payload[stat_var]['rankAll']
        if 'info' in rank_all and len(rank_all['info']) > RANK_SIZE:
            if is_show_bottom:
                payload[stat_var]['rankBottom1000'] = rank_all
            else:
                payload[stat_var]['rankTop1000'] = rank_all
            del payload[stat_var]['rankAll']

    for k in delete_keys:
        try:
            del payload[stat_var][k]
        except KeyError:
            pass  # key might not exist for fewer than 1000 places

    dcids = set()
    for k in rank_keys:
        if k in payload[stat_var] and 'info' in payload[stat_var][k]:
            info = payload[stat_var][k]['info']
            if is_show_bottom:
                # truncate and reverse the bottom RANK_SIZE elems
                info = info[-RANK_SIZE:]
            else:
                info = info[:RANK_SIZE]
            for r in info:
                dcids.add(r['placeDcid'])
            payload[stat_var][k]['info'] = info
            # payload[stat_var][k]['count'] = count
    place_names = place_api.get_name(list(dcids))
    for k in rank_keys:
        if k in payload[stat_var] and 'info' in payload[stat_var][k]:
            for r in payload[stat_var][k]['info']:
                r['placeName'] = place_names[r['placeDcid']]
    return flask.Response(json.dumps(ranking_results),
                          200,
                          mimetype='application/json')
