# Copyright 2025 Google LLC
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
"""Place Data overview routing"""

from flask import Blueprint

from server.lib import render as lib_render

bp = Blueprint('data', __name__)


@bp.route("/data_overview/<path:place>")
def data_overview(place):
  return lib_render.render_page("static/data_overview.html",
                                "data_overview.html",
                                place_dcid=place)
