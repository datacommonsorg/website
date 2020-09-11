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

bp = flask.Blueprint('api.ranking', __name__, url_prefix='/api/ranking')

# Only show the top 100 places in rankings for now
RANK_KEYS = ['rankAll', 'rankTop1000']
RANK_SIZE = 100


# TODO(beets): Add support for per-capita
@bp.route('/<stat_var>/<place_type>/')
@bp.route('/<stat_var>/<place_type>/<path:place>')
def ranking_api(stat_var, place_type, place=None):
    """Returns top 100 rankings for a stats var, grouped by place type and
    optionally scoped by a containing place. Each place in the ranking has
    it's named returned, if available.
    """
    ranking_results = dc.get_place_ranking([stat_var], place_type, place)
    if not 'payload' in ranking_results:
        return ranking_results
    payload = ranking_results['payload']
    dcids = set()
    try:
        del payload[stat_var]['rankBottom1000']
    except KeyError:
        pass  # key might not exist for fewer than 1000 places
    for k in RANK_KEYS:
        if k in payload[stat_var] and 'info' in payload[stat_var][k]:
            payload[stat_var][k]['info'] = payload[stat_var][k][
                'info'][:RANK_SIZE]
            for r in payload[stat_var][k]['info']:
                dcids.add(r['placeDcid'])
    place_names = place_api.get_name(list(dcids))
    for k in RANK_KEYS:
        if k in payload[stat_var] and 'info' in payload[stat_var][k]:
            for r in payload[stat_var][k]['info']:
                r['placeName'] = place_names[r['placeDcid']]
    return ranking_results
