# Copyright 2022 Google LLC
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
"""Data Commons NL Interface routes"""

import os
import logging
import json

import flask
from flask import Blueprint, current_app, render_template, request
from google.protobuf.json_format import MessageToJson, ParseDict
import pandas as pd
import re
import requests

import services.datacommons as dc
from config import subject_page_pb2

bp = Blueprint('nl', __name__, url_prefix='/nl')

MAPS_API = "https://maps.googleapis.com/maps/api/place/textsearch/json?"
FIXED_PREFIXES = ['md=', 'mq=', 'st=', 'mp=', 'pt=']
FIXED_PROPS = set([p[:-1] for p in FIXED_PREFIXES])


def _is_vertical_svg(svg):
  return '_' not in svg


def _get_preferred_type(types):
  for t in ['Country', 'State', 'County', 'City']:
    if t in types:
      return t
  return sorted(types)[0]


def _highlight_svs(sv_df):
  return sv_df[sv_df['CosineScore'] > 0.4]['SV'].values.tolist()


def _filtered_svs_list(sv_df):
  sv_df = sv_df.drop(sv_df[sv_df['CosineScore'] < 0.3].index)
  return sv_df['SV'].values.tolist()


def _sv_definition_name_maps(svgs_info, svs_list):
  sv2definition = {}
  sv2name = {}
  for svgi in svgs_info:
    if 'info' not in svgi:
      continue
    if 'childStatVars' not in svgi['info']:
      continue
    child_svs = svgi['info']['childStatVars']
    for svi in child_svs:
      if 'id' not in svi:
        continue
      if 'definition' in svi:
        sv2definition[svi['id']] = svi['definition']
      if 'displayName' in svi:
        sv2name[svi['id']] = svi['displayName']

  # Get any missing SV Names
  sv_names_api = dc.property_values(svs_list, 'name')
  sv2name.update({p: v[0] for p, v in sv_names_api.items()})

  return {"sv2definition": sv2definition, "sv2name": sv2name}


def _caps(e):
  return e[0].upper() + e[1:]


def _caps_list(list):
  return [_caps(e) for e in list]


def _bucket_to_name(key):
  parts = key.split(',')
  # Drilldown by <P> for <PopType> [<statType>] <MeasuredProp>: <V1>, <V2>, ...
  pv = {part.split('=')[0]: part.split('=')[1] for part in parts}

  end_parts = []
  prefix = ""
  for p, v in pv.items():
    if p in FIXED_PROPS:
      continue
    if not v:
      prefix = "Drilldown by " + _caps(p) + " for '"
    else:
      end_parts.append(v)

  mid_parts = [pv['pt']]
  if 'st' in pv:
    mid_parts.append(pv['st'].replace('Value', ''))
  mid_parts.append(pv['mp'])

  result = prefix + " ".join(_caps_list(mid_parts))
  if end_parts:
    result += ': ' + ', '.join(sorted(_caps_list(end_parts)))
  result += "'"

  # Some fixups
  return result.replace('Person Count', 'Population')


# Returns a map of buckets.  The key is SV definition without V, and value is
# the missing V.
def _get_buckets(defn):
  parts = defn.split(',')
  fixed_parts = []
  cpv_parts = []
  for part in parts:
    if any([part.startswith(p) for p in FIXED_PREFIXES]):
      fixed_parts.append(part)
    else:
      cpv_parts.append(part)
  fixed_prefix = ','.join(fixed_parts)
  if not cpv_parts:
    return {fixed_prefix: ""}

  buckets = {}
  for rpv in cpv_parts:
    parts = [fixed_prefix]
    v_only = ""
    for opv in cpv_parts:
      if rpv == opv:
        # P only
        p_only, v_only = rpv.split('=')
        parts.append(p_only + '=')
      else:
        parts.append(opv)
    buckets[','.join(parts)] = v_only
  return buckets


def _chart_config(place_dcid, main_place_type, main_place_name,
                  child_places_type, highlight_svs, sv2name, peer_buckets):
  #@title
  chart_config = {}
  chart_config['metadata'] = {
      'place_dcid': [place_dcid],
  }

  if child_places_type and ('metadata' in chart_config):
    chart_config['metadata']['contained_place_types'] = {
        main_place_type: child_places_type
    }

  added_buckets = set()
  sv4spec = set()

  blocks = []
  for sv in highlight_svs:
    tiles = []

    tiles.append({
        'title': sv2name[sv] + ': historical',
        'type': 'LINE',
        'stat_var_key': [sv]
    })

    if child_places_type:
      tiles.append({
          'title': sv2name[sv] + ': places within ' + main_place_name,
          'type': 'MAP',
          'stat_var_key': [sv]
      })

      tiles.append({
          'title': sv2name[sv] + ': rankings within ' + main_place_name,
          'type': 'RANKING',
          'stat_var_key': [sv],
          'ranking_tile_spec': {
              'show_highest': True,
              'show_lowest': True
          }
      })

    # If the highlight SV is part of an SV peer-group, add it ahead of others.
    for key, svs in peer_buckets.items():
      if sv not in svs:
        continue
      if key in added_buckets:
        continue

      sv_list = list(svs)
      # Consider if this should be bar or time-series?
      tiles.append({
          'title': _bucket_to_name(key),
          'type': 'LINE',
          'stat_var_key': sv_list
      })
      added_buckets.add(key)
      sv4spec.update(sv_list)
      # TODO: add CLUSTERED_BAR

    blocks.append({'title': sv2name[sv], 'columns': [{'tiles': tiles}]})
    sv4spec.add(sv)

  for key, svs in peer_buckets.items():
    if key in added_buckets:
      continue
    tile = {
        'title': _bucket_to_name(key),
        'type': 'BAR',
        'stat_var_key': list(svs)
    }
    blocks.append({
        'title': _bucket_to_name(key) + ' in ' + main_place_name,
        'columns': [{
            'tiles': [tile]
        }]
    })
    added_buckets.add(key)
    sv4spec.update(list(svs))
    # TODO: add CLUSTERED_BAR when supported

  sv_specs = {}
  for sv in sv4spec:
    sv_specs[sv] = {'stat_var': sv, 'name': sv2name[sv]}

  chart_config['categories'] = [{
      'title': 'Search Results',
      'blocks': blocks,
      'stat_var_spec': sv_specs
  }]

  return chart_config


def _get_related_places(place_dcid):
  place_page_data = dc.get_landing_page_data(place_dcid, 'Overview', [])
  if not place_page_data:
    place_page_data = {}

  if "parentPlaces" not in place_page_data:
    place_page_data["parentPlaces"] = []
  if "childPlacesType" not in place_page_data:
    place_page_data["childPlacesType"] = ""
  if "nearbyPlaces" not in place_page_data:
    place_page_data["nearbyPlaces"] = []
  if "similarPlaces" not in place_page_data:
    place_page_data["similarPlaces"] = []

  return place_page_data


def _get_svg_info(entities, svg_dcids):
  result = dc.get_variable_group_info_bulk(svg_dcids, entities)
  if isinstance(result, dict):
    return result
  return {}


def _related_svgs(svs_list, relevant_places):
  # Using PropertyValues (memberOf) and VariableGroupInfo APIs
  svs_to_svgs = dc.property_values(svs_list, 'memberOf')

  # Get all distinct SVGs and SV under verticals.
  svgs = set()
  sv_under_verticals = set()

  for sv, svg_list in svs_to_svgs.items():
    has_svg = False
    for svg in svg_list:
      svgs.add(svg)
      if '_' in svg:
        has_svg = True
    if not has_svg:
      # This is top-level SV, so we will try getting child SVGs
      sv_under_verticals.add(sv)

  # Get SVG info for all relevant places
  svgs_info = _get_svg_info(relevant_places, list(svgs))
  return svgs_info.get('data', {})


def _related_places(dcid):
  # Get related places using Place API
  related_places = _get_related_places(dcid)
  related_places['nearbyPlaces'] += [dcid]
  related_places['similarPlaces'] += [dcid]
  return related_places


def _peer_buckets(sv2definition, svs_list):
  peer_buckets = {}
  for sv, defn in sv2definition.items():
    keys = _get_buckets(defn)
    for key, cval in keys.items():
      if key not in peer_buckets:
        peer_buckets[key] = {}
      peer_buckets[key][sv] = cval

  # Remove single SV keys and remove groups with result SV
  for bucket_id in list(peer_buckets.keys()):
    if len(peer_buckets[bucket_id]) == 1:
      # With only 1 SV, no point having a bucket
      del peer_buckets[bucket_id]
    elif not any([sv in peer_buckets[bucket_id] for sv in svs_list]):
      # this bucket has no useful SV
      del peer_buckets[bucket_id]

  return peer_buckets


def _maps_place(place_str):
  api_key = current_app.config["MAPS_API_KEY"]
  url_formatted = f"{MAPS_API}input={place_str}&key={api_key}"
  r = requests.get(url_formatted)
  resp = r.json()

  # Return the first "political" place found.
  if "results" in resp:
    for res in resp["results"]:
      if "political" in res["types"]:
        return res
  return {}


def _dc_recon(place_ids):
  resp = dc.resolve_id(place_ids, "placeId", "dcid")
  if "entities" not in resp:
    return {}

  d_return = {}
  for ent in resp["entities"]:
    for out in ent["outIds"]:
      d_return[ent["inId"]] = out
      break

  return d_return


def _remove_places(query, places_found):
  for p_str in places_found:
    # See if the word "in" precedes the place. If so, best to remove it too.
    needle = "in " + p_str
    if needle not in query:
      needle = p_str
    query = query.replace(needle, "")

  # Remove all punctuation.
  query = re.sub(r'[^\w\s]', '', query)

  # Remove any extra spaces and return.
  return ' '.join(query.split())


def _infer_place_dcid(places_found):
  if not places_found:
    return ""

  place_dcid = ""
  place = _maps_place(places_found[0])
  logging.info(f"MAPS API found place: {place}")
  # If maps API returned a valid place, use the place_id to
  # get the dcid.
  if place and ("place_id" in place):
    place_id = place["place_id"]
    place_ids_map = _dc_recon([place_id])

    if place_id in place_ids_map:
      place_dcid = place_ids_map[place_id]

  logging.info(f"DC API found DCID: {place_dcid}")
  return place_dcid


def _debug_dict(status, original_query, places_found, place_dcid, query,
                svs_dict):
  return {
      "debug": {
          'status': status,
          'original_query': original_query,
          'places_detected': places_found,
          'place_dcid': place_dcid,
          'query_with_places_removed': query,
          'sv_matching': svs_dict,
      }
  }


@bp.route('/', strict_slashes=False)
def page():
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  return render_template('/nl_interface.html',
                         place_type="",
                         place_name="",
                         place_dcid="",
                         config={})


@bp.route('/data')
def data():
  original_query = request.args.get('q')
  model = current_app.config['NL_MODEL']
  res = {'place_type': '', 'place_name': '', 'place_dcid': '', 'config': {}}
  if not original_query:
    logging.info("Query was empty.")
    debug_info = _debug_dict("Aborted: Query was Empty.", original_query, [],
                             "", "", {
                                 "SV": [],
                                 "CosineScore": []
                             })
    res.update(debug_info)
    logging.info(debug_info)
    return res

  # Step 1: find all relevant places and the name/type of the main place found.
  places_found = model.detect_place(original_query)
  logging.info(places_found)

  if not places_found:
    logging.info("Place detection failed.")

  # If place_dcid was already set by the url, skip inferring it.
  place_dcid = request.args.get('place_dcid', '')
  if not place_dcid:
    place_dcid = _infer_place_dcid(places_found)

  # If a valid DCID was was not found or provided, do not proceed.
  if not place_dcid:
    logging.info("Could not find a place dcid.")
    debug_info = _debug_dict("Aborted: No Place DCID found.", original_query,
                             places_found, place_dcid, original_query, {
                                 "SV": [],
                                 "CosineScore": []
                             })
    res.update(debug_info)
    logging.info(debug_info)
    return res

  place_types = dc.property_values([place_dcid], 'typeOf')[place_dcid]
  main_place_type = _get_preferred_type(place_types)
  main_place_name = dc.property_values([place_dcid], 'name')[place_dcid][0]

  related_places = _related_places(place_dcid)
  child_places_type = ""
  if 'childPlacesType' in related_places:
    child_places_type = related_places['childPlacesType']
  all_relevant_places = list(
      set(related_places['parentPlaces'] + related_places['nearbyPlaces'] +
          related_places['similarPlaces']))

  # Step 2: replace the places in the query sentence with "".
  query = _remove_places(original_query, places_found)

  # Step 3: Identify the SV matched based on the query.
  svs_df = pd.DataFrame(model.detect_svs(query))
  logging.info(svs_df)

  # Step 4: filter SVs based on scores.
  highlight_svs = _highlight_svs(svs_df)
  relevant_svs = _filtered_svs_list(svs_df)

  # Step 5: get related SVGs and all info.
  svgs_info = _related_svgs(relevant_svs, all_relevant_places)

  # Step 6: get useful sv2name and sv2definitions.
  sv_maps = _sv_definition_name_maps(svgs_info, relevant_svs)
  sv2name = sv_maps["sv2name"]
  sv2definition = sv_maps["sv2definition"]

  # Step 7: Get SVGs into peer buckets.
  peer_buckets = _peer_buckets(sv2definition, relevant_svs)

  # Step 8: Produce Chart Config JSON.
  chart_config = _chart_config(place_dcid, main_place_type, main_place_name,
                               child_places_type, highlight_svs, sv2name,
                               peer_buckets)

  message = ParseDict(chart_config, subject_page_pb2.SubjectPageConfig())
  d = {
      'place_type': main_place_type,
      'place_name': main_place_name,
      'place_dcid': place_dcid,
      'config': json.loads(MessageToJson(message)),
  }
  d.update(
      _debug_dict("Successful.", original_query, places_found, place_dcid,
                  original_query, svs_df.to_dict()))
  return json.dumps(d)
