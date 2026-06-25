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

import server.lib.render as lib_render
import server.lib.shared as shared_api
import server.services.datacommons as dc

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
  try:
    api_name = shared_api.names([dcid]).get(dcid)
    if api_name:
      node_name = api_name
  except Exception as e:
    logging.info(e)

  json_ld_data = {}
  # Provenance nodes start with dc/base/
  if dcid.startswith("dc/base/"):
    json_ld_data = {
        "@context": {
            "@language": "en",
            "@vocab": "https://schema.org/",
            "sc": "https://schema.org/",
            "cr": "http://mlcommons.org/croissant/",
            "rai": "http://mlcommons.org/croissant/RAI/",
            "dct": "http://purl.org/dc/terms/",
            "citeAs": "cr:citeAs",
            "column": "cr:column",
            "conformsTo": "dct:conformsTo",
            "data": {
                "@id": "cr:data",
                "@type": "@json"
            },
            "dataType": {
                "@id": "cr:dataType",
                "@type": "@vocab"
            },
            "examples": {
                "@id": "cr:examples",
                "@type": "@json"
            },
            "extract": "cr:extract",
            "field": "cr:field",
            "fileProperty": "cr:fileProperty",
            "fileObject": "cr:fileObject",
            "fileSet": "cr:fileSet",
            "format": "cr:format",
            "includes": "cr:includes",
            "isLiveDataset": "cr:isLiveDataset",
            "jsonPath": "cr:jsonPath",
            "key": "cr:key",
            "md5": "cr:md5",
            "parentField": "cr:parentField",
            "path": "cr:path",
            "recordSet": "cr:recordSet",
            "references": "cr:references",
            "regex": "cr:regex",
            "repeated": "cr:repeated",
            "replace": "cr:replace",
            "separator": "cr:separator",
            "source": "cr:source",
            "subField": "cr:subField",
            "transform": "cr:transform"
        },
        "@type":
            "Dataset",
        "conformsTo":
            "http://mlcommons.org/croissant/1.0",
        "description":
            f"This dataset contains all the data related to provenance {dcid}",
        "url":
            f"https://datacommons.org/browser/{dcid}",
        "publisher": {
            "@type": "Organization",
            "name": "Data Commons",
            "url": "https://datacommons.org"
        }
    }

    try:
      resp = dc.v2node([dcid], "->*")
      data = resp.get("data", {}).get(dcid, {})
      arcs = data.get("arcs", {})

      # Extract the name from the isPartOf node (the Dataset)
      is_part_of_nodes = arcs.get("isPartOf", {}).get("nodes", [])
      if is_part_of_nodes and "name" in is_part_of_nodes[0]:
        json_ld_data["name"] = is_part_of_nodes[0]["name"]

      if "description" in arcs and arcs["description"].get("nodes"):
        json_ld_data["description"] = arcs["description"]["nodes"][0].get(
            "value", json_ld_data["description"])

      # Fetch license
      if "license" in arcs and arcs["license"].get("nodes"):
        json_ld_data["license"] = arcs["license"]["nodes"][0].get("value")

      # Fetch source
      source_nodes = arcs.get("source", {}).get("nodes", [])

      if source_nodes:
        s_node = source_nodes[0]
        s_name = s_node.get("name", s_node.get("value", ""))
        s_dcid = s_node.get("dcid", "")

        source_obj = {"@type": "Organization", "name": s_name}

        # Fetch its external URL
        if s_dcid:
          try:
            s_resp = dc.v2node([s_dcid], "->url")
            s_url_nodes = s_resp.get("data", {}).get(s_dcid, {}).get(
                "arcs", {}).get("url", {}).get("nodes", [])
            if s_url_nodes:
              source_obj["url"] = s_url_nodes[0].get("value")
          except Exception as e:
            logging.error("Error fetching source URL for %s: %s", s_dcid, e)

        json_ld_data["creator"] = [source_obj]

    except Exception as e:
      logging.error("Error fetching metadata for %s: %s", dcid, e)

  return render_template('/browser/node.html',
                         dcid=dcid,
                         node_name=node_name,
                         json_ld_data=json_ld_data,
                         maps_api_key=current_app.config['MAPS_API_KEY'])
