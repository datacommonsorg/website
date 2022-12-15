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

import os
import flask
import services.datacommons as dc
from flask import Blueprint, render_template
import json
import logging
from lib.gcs import list_png
import routes.api.shared as shared_api
import routes.api.node as node_api

SCREENSHOT_BUCKET = 'datcom-browser-screenshot'

# Define blueprint
bp = Blueprint("dev", __name__, url_prefix='/dev')


@bp.route('/')
def dev():
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)
  return flask.render_template('dev/dev.html')


@bp.route('/screenshot/<path:folder>')
def screenshot(folder):
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)
  images = list_png(SCREENSHOT_BUCKET, folder)
  return flask.render_template('dev/screenshot.html', images=images)


@bp.route('/event')
def event():
  if not os.environ.get('FLASK_ENV') in [
      'autopush', 'local', 'dev', 'stanford', 'local-stanford',
      'stanford-staging'
  ]:
    flask.abort(404)
  return flask.render_template('dev/event.html')


def parseTriplesResponse(response):
  """Parses response from triples API.
  
  Returns a list of properties and their values in the form of:
     {dcid: property_dcid, value: <nodes>}
  where <nodes> map to the "nodes" key in the triples API response.
  
  The returned list is used to render property values in the event pages.
  """
  parsed = []
  for key, value in response.items():
    parsed.append({"dcid": key, "values": value["nodes"]})
  parsed = str(parsed).replace(
      "'", '"')  # JSON.parse on client side requires double quotes
  return parsed


@bp.route('/event/<path:dcid>')
def event_node(dcid):
  if not os.environ.get('FLASK_ENV') in [
      'autopush', 'local', 'dev', 'stanford', 'local-stanford',
      'stanford-staging'
  ]:
    flask.abort(404)
  node_name = dcid
  properties = "{}"
  try:
    name_results = shared_api.names([dcid])
    if dcid in name_results.keys():
      node_name = name_results.get(dcid)
    properties = node_api.triples('out', dcid)
    parsed_properties = parseTriplesResponse(properties)
  except Exception as e:
    logging.info(e)
  return render_template('dev/event.html',
                         dcid=dcid,
                         node_name=node_name,
                         properties=parsed_properties)
