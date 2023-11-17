# Copyright 2023 Google LLC
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
"""Endpoint for iframe-friendly embed-able chart pages"""

from flask import Blueprint
from flask import current_app
from flask import render_template
from flask import request

from server import cache
import server.lib.config as libconfig

DEFAULT_WIDTH = 500
DEFAULT_HEIGHT = 400
ALLOWED_CHART_TYPES = [
    "bar",
    "gauge",
    "line",
    "map",
    "pie",
    "ranking",
]

# Define blueprint
bp = Blueprint("chart", __name__, url_prefix="/chart")


@bp.route("/", strict_slashes=False)
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def render_chart():
  chart_type = request.args.get("chartType", None)
  if not chart_type or not chart_type in ALLOWED_CHART_TYPES:
    return "error: must provide a valid chart type", 400

  attributes = ""
  for key in request.args.keys():
    if key != "chartType":
      values = request.args.getlist(key)
      attributes += f'{key}="{" ".join(values)}" '

  component = (
      f"<datacommons-{chart_type} {attributes}></datacommons-{chart_type}>")

  # need to encode '&' so /oembed endpoint will read full url downstream
  request_url = request.url.replace("&", "%26")

  # get api host to serve datacommons.js for web components from
  hostname = "https://datacommons.org"
  if current_app.config['LOCAL']:
    hostname = "http://127.0.0.1:8080"

  return render_template(
      "oembed_chart.html",
      request_url=request_url,
      component=component,
      width=DEFAULT_WIDTH,
      height=DEFAULT_HEIGHT,
      hostname=hostname,
  )
