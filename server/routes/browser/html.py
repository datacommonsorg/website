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
"""Data Commons Knowledge Knowledge Graph routes
"""

import logging
import os

from flask import Blueprint
from flask import current_app
from flask import g
from flask import render_template

import server.lib.croissant_metadata as croissant_metadata_lib
import server.lib.feature_flags as feature_flags_lib
import server.lib.fetch as fetch
import server.lib.render as lib_render
import server.lib.shared as shared_api

bp = Blueprint('browser', __name__, url_prefix='/browser')


@bp.route('/')
def browser_main():
  return lib_render.render_page("browser/landing.html", "browser_landing.html")


@bp.route('/bio')
def bio_browser_main():
  return lib_render.render_page("browser/bio_landing.html", "")


@bp.route('/<path:dcid>')
def browser_node(dcid):
  node_name = dcid
  node_types = []
  json_ld_data = {}

  if feature_flags_lib.is_feature_enabled(
      feature_flags_lib.CROISSANT_JSON_LD_FEATURE):
    try:
      node_info = fetch.multiple_property_values([dcid], ["name", "typeOf"])
      dcid_info = node_info.get(dcid, {})
      names = dcid_info.get("name", [])
      if names:
        node_name = names[0]
      node_types = dcid_info.get("typeOf", [])
    except Exception as e:
      logging.info(e)

    if 'Dataset' in node_types:
      json_ld_data = croissant_metadata_lib.build_dataset_metadata(dcid)
  else:
    try:
      api_name = shared_api.names([dcid]).get(dcid)
      if api_name:
        node_name = api_name
    except Exception as e:
      logging.info(e)

  return render_template('/browser/node.html',
                         dcid=dcid,
                         node_name=node_name,
                         json_ld_data=json_ld_data,
                         maps_api_key=current_app.config['MAPS_API_KEY'])
