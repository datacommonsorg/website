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

import server.lib.fetch as fetch
import server.services.datacommons as dc


def _get_base_context() -> dict:
  return {
      "@language": "en",
      "@vocab": "https://schema.org/",
      "sc": "https://schema.org/",
      "cr": "http://mlcommons.org/croissant/",
      "rai": "http://mlcommons.org/croissant/RAI/",
      "prov": "http://www.w3.org/ns/prov#",
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
  }


def _build_file_object(prov_id: str, prov_name: str, p_desc: list, p_urls: list,
                       p_download_urls: list) -> dict:
  file_object = {
      "@type": "cr:FileObject",
      "@id": prov_id,
      "name": prov_name,
      "contentUrl": p_download_urls[0] if p_download_urls else "",
      "encodingFormat": "text/csv"
  }

  if p_desc and p_desc[0]:
    file_object["description"] = p_desc[0]

  if p_urls:
    file_object["prov:wasDerivedFrom"] = {"@id": p_urls[0]}

  return file_object


def _build_record_set(prov_id: str) -> dict:
  csv_columns = [
      "variableMeasured", "observationAbout", "unit", "measurementMethod",
      "observationPeriod", "provenance", "observationDate", "value",
      "scalingFactor"
  ]

  fields = []
  for col in csv_columns:
    data_type = "sc:Number" if col in ("value", "scalingFactor") else "sc:Text"
    fields.append({
        "@type": "cr:Field",
        "@id": f"{prov_id}-records/{col}",
        "name": f"{prov_id}-records/{col}",
        "dataType": data_type,
        "source": {
            "fileObject": {
                "@id": prov_id
            },
            "extract": {
                "column": col
            }
        }
    })

  return {
      "@type": "cr:RecordSet",
      "@id": f"{prov_id}-records",
      "name": f"{prov_id}-records",
      "field": fields
  }


def _fetch_source_info(arcs: dict) -> tuple:
  """Returns (source_id, source_obj) dicts ready to be used or empty/None."""
  source_nodes = (arcs.get("isPartOf") or {}).get("nodes", [])
  if not source_nodes:
    return "", None

  s_node = source_nodes[0]
  s_name = s_node.get("name", s_node.get("value", ""))
  s_dcid = s_node.get("dcid", "")

  source_obj = {"@type": "Organization", "name": s_name}
  if s_dcid:
    source_obj["@id"] = s_dcid

  if s_dcid:
    try:
      urls = fetch.property_values([s_dcid], "url")
      if urls.get(s_dcid):
        source_obj["url"] = urls[s_dcid][0]
    except (ValueError, requests.exceptions.RequestException) as e:
      logging.warning("Error fetching source URL for %s: %s", s_dcid, e)

  return s_dcid, source_obj


def _cleanup_dataset(json_ld_data: dict, extended_enabled: bool):
  """Cleans up empty arrays to prevent downstream validation errors."""
  if extended_enabled and "distribution" in json_ld_data:
    if not json_ld_data["distribution"]:
      del json_ld_data["distribution"]
      if "recordSet" in json_ld_data:
        del json_ld_data["recordSet"]


def _validate_dataset(json_ld_data: dict, dcid: str) -> bool:
  """Validates Croissant JSON-LD. Returns True if valid, False if it should be skipped."""
  if not json_ld_data.get("name"):
    logging.info("Skipping Croissant JSON-LD for %s: Missing 'name'", dcid)
    return False

  if not json_ld_data.get("url"):
    logging.info("Skipping Croissant JSON-LD for %s: Missing 'url'", dcid)
    return False

  desc = json_ld_data.get("description") or ""
  if len(desc) < 50 or len(desc) > 5000:
    logging.info(
        "Skipping Croissant JSON-LD for %s: Invalid description length (%d)",
        dcid, len(desc))
    return False

  if not json_ld_data.get("license"):
    logging.info("Skipping Croissant JSON-LD for %s: Missing 'license'", dcid)
    return False

  if not json_ld_data.get("datePublished"):
    logging.info("Skipping Croissant JSON-LD for %s: Missing 'datePublished'",
                 dcid)
    return False

  if not json_ld_data.get("creator"):
    logging.info("Skipping Croissant JSON-LD for %s: Missing 'creator'", dcid)
    return False

  return True


def build_dataset_metadata(dcid: str, extended_enabled: bool = False) -> dict:
  """Builds a Croissant JSON-LD dictionary for a Dataset node."""
  json_ld_data = {
      "@context": _get_base_context(),
      "@type": "Dataset",
      "conformsTo": "http://mlcommons.org/croissant/1.1",
      "url": f"https://datacommons.org/browser/{dcid}",
      "isLiveDataset": True,
      "publisher": {
          "@type": "Organization",
          "name": "Data Commons",
          "url": "https://datacommons.org"
      }
  }

  try:
    resp = dc.v2node([dcid], "->[name,description,license,isPartOf]")
    data = (resp.get("data") or {}).get(dcid) or {}
    arcs = data.get("arcs") or {}

    # 1. Dataset Name
    name_nodes = (arcs.get("name") or {}).get("nodes", [])
    if name_nodes:
      json_ld_data["name"] = name_nodes[0].get("value")

    # 2. Dataset Description
    fallback_description_found = False
    desc_nodes = (arcs.get("description") or {}).get("nodes", [])
    if desc_nodes and "value" in desc_nodes[0]:
      json_ld_data["description"] = desc_nodes[0]["value"]
      fallback_description_found = True

    # 3. Dataset License
    fallback_license_found = False
    license_nodes = (arcs.get("license") or {}).get("nodes", [])
    if license_nodes:
      json_ld_data["license"] = license_nodes[0].get("value")
      fallback_license_found = True

    # 4. Source / Creator
    source_id, source_obj = _fetch_source_info(arcs)
    if source_obj:
      json_ld_data["creator"] = [source_obj]
      if source_id:
        json_ld_data["prov:wasAttributedTo"] = {"@id": source_id}

    # 5. Provenance Handling
    prov_resp = dc.v2node([dcid], "<-isPartOf")
    prov_data = (prov_resp.get("data") or {}).get(dcid) or {}
    prov_arcs = prov_data.get("arcs") or {}
    incoming_provenances = (prov_arcs.get("isPartOf") or {}).get("nodes", [])

    if incoming_provenances:
      if extended_enabled:
        json_ld_data["distribution"] = []
        json_ld_data["recordSet"] = []

      prov_dcids = [
          n.get("dcid") for n in incoming_provenances if n.get("dcid")
      ]
      prov_props = {}
      if prov_dcids:
        try:
          prov_props = fetch.multiple_property_values(prov_dcids, [
              "url", "downloadUrl", "description", "provenanceCategory",
              "license", "lastDataRefreshDate"
          ])
        except (ValueError, requests.exceptions.RequestException) as e:
          logging.warning("Error fetching properties for provenances: %s", e)

      unique_licenses = set()
      max_refresh_date = ""

      for prov_node in incoming_provenances:
        prov_dcid = prov_node.get("dcid")
        if not prov_dcid:
          continue

        p_props = prov_props.get(prov_dcid, {})
        p_category = p_props.get("provenanceCategory", [])
        valid_categories = {
            "StatisticsProvenance", "AggregatedStatisticsProvenance"
        }
        if not any(c in valid_categories for c in p_category):
          continue

        # Fetch Fallbacks
        p_desc = p_props.get("description", [])
        if not fallback_description_found and p_desc:
          json_ld_data["description"] = p_desc[0]
          fallback_description_found = True

        if not fallback_license_found:
          p_licenses = p_props.get("license", [])
          if p_licenses:
            unique_licenses.update(p_licenses)

        p_dates = p_props.get("lastDataRefreshDate", [])
        if p_dates:
          for d in p_dates:
            if d > max_refresh_date:
              max_refresh_date = d

        # Extended Feature: distributions and recordSets
        if extended_enabled:
          p_download_urls = p_props.get("downloadUrl", [])
          # contentUrl is required for FileObjects in Croissant 1.1
          if p_download_urls:
            prov_name = prov_node.get("name", prov_dcid)
            prov_id = prov_name

            file_object = _build_file_object(prov_id, prov_name, p_desc,
                                             p_props.get("url", []),
                                             p_download_urls)
            json_ld_data["distribution"].append(file_object)
            json_ld_data["recordSet"].append(_build_record_set(prov_id))

      # Apply final fallbacks
      if not fallback_license_found and unique_licenses:
        sorted_licenses = sorted(unique_licenses)
        json_ld_data["license"] = sorted_licenses if len(
            sorted_licenses) > 1 else sorted_licenses[0]

      if max_refresh_date:
        json_ld_data["datePublished"] = max_refresh_date

    _cleanup_dataset(json_ld_data, extended_enabled)
    if not _validate_dataset(json_ld_data, dcid):
      return {}

  except (ValueError, AttributeError,
          requests.exceptions.RequestException) as e:
    logging.error("Error fetching metadata for %s: %s", dcid, e)
    return {}

  return json_ld_data
