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

import json
import math
import re

from flask import Blueprint
from flask import request
from flask import Response

from server import cache
import server.lib.config as libconfig

DEFAULT_WIDTH = 500
DEFAULT_HEIGHT = 400

# Define blueprint
bp = Blueprint("oembed", __name__, url_prefix="/oembed")



@bp.route("/", strict_slashes=False)
@cache.cache.cached(timeout=cache.TIMEOUT, query_string=True)
def render_chart():
  response_format = request.args.get("format", type=str, default="json")
  if response_format not in ["json", "xml"]:
    return "error: format must be one of 'json' or 'xml'", 400
  
  # Set allowed url values
  # We want to allow only datacommons urls with /chart endpoints to be passed in
  # Hostname changes based on current config (local vs autopush/prod)
  url_regex = "https?://*\.datacommons\.org/chart*"
  cfg = libconfig.get_config()
  if cfg.LOCAL:
    url_regex = "http://(127\.0\.0\.1|localhost):8080/chart*"

  url = request.args.get("url", type=str)
  if not url or not re.match(url_regex, url):
    # reject request if url not matching allowed pattern or not provided
    return "error: must provide a valid url", 400
  
  max_width = request.args.get("maxwidth", type=int, default=500)
  max_height = request.args.get("maxheight", type=int, default=400)

  width = min(max_width, DEFAULT_WIDTH)
  height = min(max_height, DEFAULT_HEIGHT)
  html = f'<object width="{width}" height="{height}" data="{url}"></object>'

  properties = {
      "type": "rich",
      "version": "1.0",
      "provider_name": "Data Commons",
      "provider_url": "https://datacommons.org",
      "width": width,
      "height": height,
      "html": html,
  }

  if response_format == "json":
    return Response(json.dumps(properties), 200, mimetype="application/json")

  else: # response_format is XML
    # xml treats '&' as a special character, need to encode
    properties["html"] = html.replace("&", "&amp;")
    xml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n'
    xml += "<oembed>\n"
    for key, val in properties.items():
      xml += f"<{key}>{val}</{key}>\n"
    xml += "</oembed>"
    return Response(xml, 200, mimetype="text/xml")
    
