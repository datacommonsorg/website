# Copyright 2026 Google LLC
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

import logging

import requests

import server.lib.feature_flags as feature_flags_lib
import server.lib.fetch as fetch
import server.services.datacommons as dc


def build_dataset_metadata(dcid: str) -> dict:
  """Builds a Croissant JSON-LD dictionary for a Dataset node."""

  if not feature_flags_lib.is_feature_enabled(
      feature_flags_lib.CROISSANT_JSON_LD_FEATURE):
    return {}

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
          "http://mlcommons.org/croissant/1.1",
      "description":
          f"This dataset contains all the data related to dataset {dcid}",
      "url":
          f"https://datacommons.org/browser/{dcid}",
      "publisher": {
          "@type": "Organization",
          "name": "Data Commons",
          "url": "https://datacommons.org"
      }
  }

  try:
    resp = dc.v2node([dcid], "->[name,description,license,source]")
    data = (resp.get("data") or {}).get(dcid) or {}
    arcs = data.get("arcs") or {}

    name_nodes = (arcs.get("name") or {}).get("nodes", [])
    if name_nodes:
      json_ld_data["name"] = name_nodes[0].get("value")

    desc_nodes = (arcs.get("description") or {}).get("nodes", [])
    if desc_nodes:
      json_ld_data["description"] = desc_nodes[0].get(
          "value", json_ld_data["description"])

    # Fetch license
    license_nodes = (arcs.get("license") or {}).get("nodes", [])
    if license_nodes:
      json_ld_data["license"] = license_nodes[0].get("value")

    # Fetch source
    source_nodes = (arcs.get("source") or {}).get("nodes", [])
    if source_nodes:
      s_node = source_nodes[0]
      s_name = s_node.get("name", s_node.get("value", ""))
      s_dcid = s_node.get("dcid", "")

      source_obj = {"@type": "Organization", "name": s_name}

      # Fetch its external URL
      if s_dcid:
        try:
          s_resp = dc.v2node([s_dcid], "->url")
          s_url_nodes = ((((s_resp.get("data") or {}).get(s_dcid) or
                           {}).get("arcs") or {}).get("url") or
                         {}).get("nodes", [])
          if s_url_nodes:
            source_obj["url"] = s_url_nodes[0].get("value")
        except (ValueError, requests.exceptions.RequestException) as e:
          logging.warning("Error fetching source URL for %s: %s", s_dcid, e)

      json_ld_data["creator"] = [source_obj]

  except (ValueError, requests.exceptions.RequestException) as e:
    logging.error("Error fetching metadata for %s: %s", dcid, e)
    return {}

  return json_ld_data
