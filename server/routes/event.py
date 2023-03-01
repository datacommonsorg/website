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
"""Endpoints for event pages"""

import json
import logging
import os

from flask import abort
from flask import Blueprint
from flask import current_app
from flask import escape
from flask import render_template

import server.routes.api.node as node_api
import server.routes.api.shared as shared_api

DEFAULT_EVENT_DCID = ""

# Define blueprint
bp = Blueprint("event", __name__, url_prefix='/event')


def get_properties(dcid):
  """Get and parse response from triples API.

  Args:
    dcid: DCID of the node to get properties for

  Returns:
    A list of properties and their values in the form of:
      {dcid: property_dcid, value: <nodes>}
    where <nodes> map to the "nodes" key in the triples API response.

  The returned list is used to render property values in the event pages.
  """
  response = node_api.triples('out', dcid)
  parsed = []
  for key, value in response.items():
    parsed.append({"dcid": key, "values": value["nodes"]})
  return parsed


@bp.route('/')
@bp.route('/<path:dcid>', strict_slashes=False)
def event_node(dcid=DEFAULT_EVENT_DCID):
  if not os.environ.get('FLASK_ENV') in [
      'autopush', 'local', 'dev', 'stanford', 'local-stanford',
      'stanford-staging'
  ]:
    abort(404)
  node_name = escape(dcid)
  properties = "{}"
  try:
    name_results = shared_api.names([dcid])
    if dcid in name_results.keys():
      node_name = name_results.get(dcid)
    properties = get_properties(dcid)
  except Exception as e:
    logging.info(e)
  return render_template('custom_dc/stanford/event.html',
                         dcid=escape(dcid),
                         maps_api_key=current_app.config['MAPS_API_KEY'],
                         node_name=node_name,
                         properties=json.dumps(properties))
