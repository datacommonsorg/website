# Copyright 2022 Google LLC
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
"""Disease browser related handlers."""

import flask

from server.cache import cache
import server.services.datacommons as dc

bp = flask.Blueprint('api.disease', __name__, url_prefix='/api/disease')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/<path:dcid>')
def get_node(dcid):
  """Returns data given a disease node."""
  return dc.bio(dcid)
