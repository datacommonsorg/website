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

from flask import current_app
import flask
from flask import Blueprint, render_template

import pandas as pd
import services.datacommons as dc

bp = Blueprint('nl', __name__, url_prefix='/nl')

FIXED_PREFIXES = ['md=', 'mq=', 'st=', 'mp=', 'pt=']
FIXED_PROPS = set([p[:-1] for p in FIXED_PREFIXES])

def _is_vertical_svg(svg):
  return '_' not in svg

def _get_preferred_type(types):
  for t in ['Country', 'State', 'County', 'City']:
    if t in types: return t
  return sorted(types)[0]

def _highlight_svs(sv_df):
  return sv_df[sv_df['CosineScore'] > 0.4]['SV'].values.tolist()

def _filtered_svs_list(sv_df):
  sv_df = sv_df.drop(sv_df[sv_df['CosineScore'] < 0.3].index)
  return sv_df['SV'].values.tolist()

def sv_definition_name_maps(svgs_info, svs_list):
  sv2definition = {}
  sv2name = {}
  for svgi in svgs_info:
    if 'info' not in svgi:
      continue
    if 'childStatVars' not in svgi['info']:
      continue
    child_svs = svgi['info']['childStatVars']
    for svi in child_svs:
      sv2definition[svi['id']] = svi['definition']
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
    if p in FIXED_PROPS: continue
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

def _chart_config(place_dcid, main_place_type, main_place_name, child_places_type, 
                  highlight_svs, sv2name, peer_buckets):
  #@title
  chart_config = {}
  chart_config['metadata'] = {
    'place_dcid': [place_dcid],
  }

  if child_places_type:
    chart_config['metadata']['contained_in_places'] = [{
      'key': main_place_type,
      'value': child_places_type
    }]

  added_buckets = set()
  sv4spec = set()

  blocks = []
  for sv in highlight_svs:
    tiles = []

    tiles.append({
        'title': sv2name[sv] + ': historical',
        'type': 'LINE',
        'stat_var_key': [sv]})

    if child_places_type:
      tiles.append({
          'title': sv2name[sv] + ': places within ' + main_place_name,
          'type': 'MAP',
          'stat_var_key': [sv]})

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
      if sv not in svs: continue
      if key in added_buckets: continue

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

    blocks.append({
        'title': sv2name[sv],
        'columns': [{
            'tiles': tiles
        }]
    })
    sv4spec.add(sv)

  for key, svs in peer_buckets.items():
    if key in added_buckets: continue
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

  sv_specs = []
  for sv in sv4spec:
    sv_specs.append({
        'key': sv,
        'value': {
            'stat_var': sv,
            'name': sv2name[sv]
        }
    })

  chart_config['categories'] = [{
      'title': 'Search Results',
      'blocks': blocks,
      'stat_var_spec': sv_specs
  }]

  return chart_config

def _get_related_places(place_dcid):
  place_page_data = dc.get_landing_page_data(place_dcid, 'Overview', [])
  if isinstance(place_page_data, dict):
    return place_page_data
  return {}

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
  svgs_info = _get_svg_info(relevant_places, list(svgs))['data']
  return svgs_info


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
      if key not in peer_buckets: peer_buckets[key] = {}
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

@bp.route('/<path:dcid>')
def page(dcid):
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)
  model = current_app.config['NL_MODEL']
  
  # Step 1: find all relevant places and the name/type of the main place found.
  # TODO(jehangiramjad): for now, using tmp_place_dcid. Replace with place detection.
  place_dcid = dcid

  place_types = dc.property_values([place_dcid], 'typeOf')[place_dcid]
  main_place_type = _get_preferred_type(place_types)
  main_place_name = dc.property_values([place_dcid], 'name')[place_dcid][0]

  related_places = _related_places(place_dcid)
  child_places_type = related_places['childPlacesType']
  all_relevant_places = list(set(related_places['parentPlaces'] + 
                                            related_places['nearbyPlaces'] + 
                                            related_places['similarPlaces']))

  # Step 2: replace the places in the query sentence with "".
  # TODO(jehangiramjad): implement this. For now, using a temp query without a place.
  query = "people who cannot see"

  # Step 3: Identify the SV matched based on the query.
  svs_df = pd.DataFrame(model.detect_svs(query))

  # Step 4: filter SVs based on scores.
  highlight_svs = _highlight_svs(svs_df)
  relevant_svs = _filtered_svs_list(svs_df)

  # Step 5: get related SVGs and all info.
  svgs_info = _related_svgs(relevant_svs, all_relevant_places)

  # Step 6: get useful sv2name and sv2definitions.
  sv_maps = sv_definition_name_maps(svgs_info, relevant_svs)
  sv2name = sv_maps["sv2name"]
  sv2definition = sv_maps["sv2definition"]

  # Step 7: Get SVGs into peer buckets.
  peer_buckets = _peer_buckets(sv2definition, relevant_svs)

  # Step 8: Produce Chart Config JSON.
  chart_config = _chart_config(place_dcid, main_place_type, main_place_name,
                          child_places_type, highlight_svs, sv2name, peer_buckets)

  print(chart_config)

  return render_template('/nl.html')