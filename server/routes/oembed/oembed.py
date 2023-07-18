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
"""Endpoint for oEmbed API, for embedding web components using oEmbed"""

import logging
import json
import math
from flask import Blueprint
from flask import request
from flask import Response
from server import cache

DEFAULT_WIDTH = 500
DEFAULT_HEIGHT = 400

# Define blueprint
bp = Blueprint("oembed", __name__, url_prefix='/oembed')


@bp.route('/', strict_slashes=False)
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def render_chart():
  format = request.args.get('format', type=str, default='json')
  url = request.args.get('url', type=str)
  max_width = request.args.get('maxwidth', type=int)
  max_height = request.args.get('maxheight', type=int)

  width = math.min(max_width, DEFAULT_WIDTH) if max_width else DEFAULT_WIDTH
  height = math.min(max_height, DEFAULT_HEIGHT) if max_height else DEFAULT_HEIGHT
  html = f'<object width="{width}" height="{height}" data="{url}"></object>'

  properties = {
    'type': 'rich',
    'version': '1.0',
    'provider_name': 'Data Commons',
    'provider_url': 'https://datacommons.org',
    'width': width,
    'height': height,
    'html': html,
  }
  logging.info(url)
  match format:
    case 'json':
      return Response(json.dumps(properties), 200, mimetype='application/json')
    
    case 'xml':
      xml = '<?xml version="1.0" encoding="utf-8" standalone"yes"?>\n'
      xml += '<oembed>\n'
      for key, val in properties.items():
        xml += f'<{key}>{val}</{key}>\n'
      xml += '</oembed>'
      logging.info(xml)
      return Response(xml, 200, mimetype='text/xml')
  
    case _:
      return "error: format must be one of 'json' or 'xml'", 400
