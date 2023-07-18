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
from flask import request
from server import cache

DEFAULT_WIDTH = 500
DEFAULT_HEIGHT = 400

# Define blueprint
bp = Blueprint("chart", __name__, url_prefix='/chart')


@bp.route('/', strict_slashes=False)
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def render_chart():
  chart_type = request.args.get('chartType', None)

  attributes = ''
  for key in request.args.keys():
    if key != 'chartType':
      values = request.args.getlist(key)
      attributes += f'{key}=\"{" ".join(values)}\" '

  component = f"<datacommons-{chart_type} {attributes}></datacommons-{chart_type}>"

  return f"""
  <html>
    <head>
      <link rel="alternate" type="application/json+oembed"
        href="https://datacommons.org/omebed?format=json&url={request.url}"
        title="Data Commons Embeddable Chart"/>
      <link rel="alternate" type="application/xml+oembed"
        href="https://datacommons.org/omebed?format=xml&url={request.url}"
        title="Data Commons Embeddable Chart"/>
      <link rel="stylesheet" href="https://datacommons.org/css/datacommons.min.css" />
      <script src="http://localhost:8080/datacommons.js"></script>
    </head>
    <body>
      <div style="width:{DEFAULT_WIDTH}px; height:{DEFAULT_HEIGHT}px; margin-top:-20px">
        {component}
      </div>
    </body>
  </html>"""