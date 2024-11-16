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

# This module defines functions to fetch data from Data Commons Mixer API.
# The fetch functions call REST wrappers in datacommons module.

import copy
import re
from typing import Dict, List

import server.services.datacommons as dc

COMPLEX_UNIT_REGEX = r'\[.+ [0-9]+\]'


def _get_unit_names(units: List[str]) -> Dict:
  if not units:
    return {}

  dcid2name = {}
  resp = triples(nodes=units)

  for dcid, arcs in resp.items():
    short_name = arcs.get('shortDisplayName', [])
    name = arcs.get('name', [])
    if short_name:
      # Prefer short names
      dcid2name[dcid] = short_name[0].get('value', '')
    elif name:
      # Otherwise use name
      dcid2name[dcid] = name[0].get('value', '')

  return dcid2name


# For all facets that have a unit with a shortDisplayName, adds a
# unitDisplayName property to the facet with the short display name as the value
def _get_processed_facets(facets):
  units = set()
  for facet in facets.values():
    facet_unit = facet.get('unit', '')
    if facet_unit:
      units.add(facet_unit)
    # If the facet unit is a complex unit, add the unit part to the set of units
    if re.match(COMPLEX_UNIT_REGEX, facet_unit):
      unit = facet_unit[1:].split()[0]
      units.add(unit)
  unit2name = _get_unit_names(list(units))
  result = copy.deepcopy(facets)
  for facet_id, facet in facets.items():
    facet_unit = facet.get('unit', '')
    if facet_unit and unit2name.get(facet_unit, ''):
      result[facet_id]['unitDisplayName'] = unit2name[facet_unit]
    # handle unit display name for complex units
    elif re.match(COMPLEX_UNIT_REGEX, facet_unit):
      unit = facet_unit[1:].split()[0]
      if unit2name.get(unit, ''):
        result[facet_id]['unitDisplayName'] = unit2name[unit]
  return result


# TODO: include obsCount, earliestDate, and latestDate like obs_series
def _convert_v2_obs_point(facet):
  result = {
      'facet': facet['facetId'],
  }
  if 'observations' in facet and len(facet['observations']) > 0:
    if 'date' in facet['observations'][0]:
      result['date'] = facet['observations'][0]['date']
    if 'value' in facet['observations'][0]:
      result['value'] = facet['observations'][0]['value']
  return result


def _convert_v2_obs_series(facet):
  result = {
      'facet': facet.get('facetId', ''),
      'obsCount': facet.get('obsCount', 0),
      'earliestDate': facet.get('earliestDate', ''),
      'latestDate': facet.get('latestDate', '')
  }
  if 'observations' in facet:
    result['series'] = facet['observations']
  return result


# Returns a compact version of observation point API results
# TODO update this function to always return the same structure. Right now,
# if all_facets is true, the value for data[var][entity] is an array & if false,
# the value is an object.
def _compact_point(point_resp, all_facets):
  result = {
      'facets': {},
  }
  if all_facets:
    result['facets'] = point_resp.get('facets', {})
  data = {}
  for var, var_obs in point_resp.get('byVariable', {}).items():
    data[var] = {}
    for entity, entity_obs in var_obs.get('byEntity', {}).items():
      data[var][entity] = None
      if 'orderedFacets' in entity_obs:
        if all_facets:
          data[var][entity] = [
              _convert_v2_obs_point(x) for x in entity_obs['orderedFacets']
          ]
        else:
          # There should be only one point. Find the facet with the latest date
          best = None
          for x in entity_obs['orderedFacets']:
            point = _convert_v2_obs_point(x)
            if not best or point['date'] > best['date']:
              best = point
          data[var][entity] = best
          facet_id = best['facet']
          result['facets'][facet_id] = point_resp['facets'][facet_id]
      else:
        if all_facets:
          data[var][entity] = []
        else:
          data[var][entity] = {}
  result['data'] = data
  return result


# TODO update this function to always return the same structure. Right now,
# if all_facets is true, the value for data[var][entity] is an array & if false,
# the value is an object.
def _compact_series(series_resp, all_facets):
  result = {
      'facets': {},
  }
  if all_facets:
    result['facets'] = series_resp.get('facets', {})
  data = {}
  for var, var_obs in series_resp.get('byVariable', {}).items():
    data[var] = {}
    for entity, entity_obs in var_obs.get('byEntity', {}).items():
      data[var][entity] = None
      if 'orderedFacets' in entity_obs:
        if all_facets:
          data[var][entity] = [
              _convert_v2_obs_series(x) for x in entity_obs['orderedFacets']
          ]
        else:
          # There should be only one series
          data[var][entity] = _convert_v2_obs_series(
              entity_obs['orderedFacets'][0])
          facet_id = data[var][entity]['facet']
          result['facets'][facet_id] = series_resp['facets'][facet_id]
      else:
        if all_facets:
          data[var][entity] = []
        else:
          data[var][entity] = {
              'series': [],
          }
  result['data'] = data
  return result


def point_core(entities, variables, date, all_facets):
  """Fetchs observation point for given entities, variables and date.

  The response is in the following format:
  {
    "facets": {
      <facet_id>: {<facet object>}
    },
    "data": {
      <var_dcid>: {
        <entity_dcid>: {
          <observation point(s)>
        }
      }
    }
  }
  """
  resp = dc.obs_point(entities, variables, date)
  resp['facets'] = _get_processed_facets(resp.get('facets', {}))
  return _compact_point(resp, all_facets)


def point_within_core(ancestor_entity,
                      descendent_type,
                      variables,
                      date,
                      all_facets,
                      facet_ids=None):
  """Fetchs observation point for descendent entities of certain type.

  The response is in the following format:
  {
    "facets": {
      <facet_id>: {<facet object>}
    },
    "data": {
      <var_dcid>: {
        <entity_dcid>: {
          <observation point(s)>
        }
      }
    }
  }
  """
  resp = dc.obs_point_within(ancestor_entity, descendent_type, variables, date,
                             facet_ids)
  resp['facets'] = _get_processed_facets(resp.get('facets', {}))
  return _compact_point(resp, all_facets)


def series_core(entities, variables, all_facets, facet_ids=None):
  """Fetches observation series for given entities and variables.

  The response is in the following format:
  {
    "facets": {
      <facet_id>: {<facet object>}
    },
    "data": {
      <var_dcid>: {
        <entity_dcid>: {
          <observation series>
        }
      }
    }
  }
  """
  resp = dc.obs_series(entities, variables, facet_ids)
  resp['facets'] = _get_processed_facets(resp.get('facets', {}))
  return _compact_series(resp, all_facets)


def series_facet(entities, variables, all_facets):
  """Fetches facet of series for given entities and variables.

  The response is in the following format:
  {
    "facets": {
      <facet_id>: {<facet object>}
    },
    "data": {
      <var_dcid>: {
        <entity_dcid>: [{
          "facet": <facet_id>,
          "obsCount": <count of observations>,
          "earliestDate": <earliest date of observations>,
          "latestDate": <latest date of observations>
        }, ...]
      }
    }
  }

  """
  resp = dc.series_facet(entities, variables)
  compacted_series = _compact_series(resp, all_facets)
  processed_series = {'facets': compacted_series.get('facets', {}), 'data': {}}
  # Update compacted series so that the entity data is always a list.
  for var, var_obs in compacted_series.get('data', {}).items():
    processed_series['data'][var] = {}
    for entity, entity_obs in var_obs.items():
      if not all_facets:
        processed_series['data'][var][entity] = [entity_obs]
      else:
        processed_series['data'][var][entity] = entity_obs
  return processed_series


def point_within_facet(ancestor_entity, descendent_type, variables, date,
                       all_facets):
  """Fetches facet of child places of a certain place type contained in a parent
  place at a given date.
  """
  resp = dc.point_within_facet(ancestor_entity, descendent_type, variables,
                               date)
  return _compact_point(resp, all_facets)


def series_within_core(ancestor_entity,
                       descendent_type,
                       variables,
                       all_facets,
                       facet_ids=None):
  """Fetchs observation series for for descendent entities of certain type.

  The response is in the following format:
  {
    "facets": {
      <facet_id>: {<facet object>}
    },
    "data": {
      <var_dcid>: {
        <entity_dcid>: {
          <observation series>
        }
      }
    }
  }
  """
  resp = dc.obs_series_within(ancestor_entity, descendent_type, variables,
                              facet_ids)
  resp['facets'] = _get_processed_facets(resp.get('facets', {}))
  return _compact_series(resp, all_facets)


def observation_existence(variables, entities):
  """Check if observation exist for variable, entity pairs.

  Returns:
      {
        <variable_did>: {
          <entity_dcid>: boolean
        }
      }

  """
  result = {}
  # Populate result
  for var in variables:
    result[var] = {}
    for e in entities:
      result[var][e] = False
  # Fetch existence check data
  resp = dc.v2observation(select=['variable', 'entity'],
                          entity={'dcids': entities},
                          variable={'dcids': variables})
  for var, entity_obs in resp.get('byVariable', {}).items():
    for e in entity_obs.get('byEntity', {}):
      result[var][e] = True
  return result


def entity_variables(entities):
  """Gets the statistical variables that have observations for given entities.

  Args:
      entities: List of entity dcids.

  The response is in the following format:
  {
    <variable_dcid>: {
      <entity_dcid>: {}  // Empty map
    }
  }
  """
  resp = dc.v2observation(select=['variable', 'entity'],
                          entity={'dcids': entities},
                          variable={})
  result = {}
  for var, entity_obs in resp.get('byVariable', {}).items():
    result[var] = entity_obs.get('byEntity', {})
  return result


def properties(nodes, out=True):
  """Returns the properties for a list of nodes.

  The response is in the following format:
  {
    <node_dcid>: [property list]
  }

  """
  resp = dc.v2node(nodes, '->' if out else '<-')
  result = {node: [] for node in nodes}
  for node, val in resp.get('data', {}).items():
    result[node] = val.get('properties', [])
  return result


def property_values(nodes, prop, out=True, constraints=''):
  """Returns a compact property values data out of REST API response.

  The response is the following format:
  {
    <node_dcid>: [value list]
  }
  """
  resp = dc.v2node(nodes, '{}{}{}'.format('->' if out else '<-', prop,
                                          constraints))
  result = {}
  for node, node_arcs in resp.get('data', {}).items():
    result[node] = []
    for v in node_arcs.get('arcs', {}).get(prop, {}).get('nodes', []):
      if 'dcid' in v:
        result[node].append(v['dcid'])
      elif 'value' in v:
        result[node].append(v['value'])
  return result


def multiple_property_values(nodes: List[str],
                             props: List[str],
                             out=True) -> Dict[str, Dict[str, List[str]]]:
  """
  Fetches specified properties for given nodes using the /v2/node API.

  Args:
      nodes (List[str]): List of node identifiers.
      props (List[str]): Properties to retrieve for each node.
      out (bool): If True, fetches outgoing properties; otherwise, incoming (default: True).

  Returns:
      dict: A dictionary mapping each node to its properties and their values.

  Example:
      nodes = ["geoId/06", "country/USA"]
      props = ["typeOf", "name"]
      result = multiple_property_values(nodes, props)
      # Example result:
      # {
      #   "geoId/06": {"typeOf": ["State", "AdministrativeArea1], "name": ["California"]},
      #   "country/USA": {"typeOf": ["Country"], "name": ["United States of America"]}
      # }
  """
  props_expression = f"[{', '.join(props)}]"
  resp = dc.v2node(nodes, '{}{}'.format('->' if out else '<-',
                                        props_expression))

  # Parse response into a structured dictionary
  result = {}
  for node in nodes:
    resp_node_arcs = resp.get('data', {}).get(node).get('arcs', {})
    result[node] = {}
    for prop in props:
      prop_nodes = resp_node_arcs.get(prop, {}).get('nodes', [])
      result[node][prop] = [p.get('dcid') or p.get('value') for p in prop_nodes]
  return result


def raw_property_values(nodes, prop, out=True, constraints=''):
  """Returns full property values data out of REST API response.

  The response is the following format:
  {
    <node_dcid>: [
      {
        'dcid':
        'value':
        'name':
        'types': []
      },
      ...
    ]
  }

  """
  resp = dc.v2node(nodes, '{}{}{}'.format('->' if out else '<-', prop,
                                          constraints))
  result = {}
  for node, node_arcs in resp.get('data', {}).items():
    result[node] = node_arcs.get('arcs', {}).get(prop, {}).get('nodes', [])
  return result


def triples(nodes, out=True):
  """Fetch triples for given nodes.

  The response is the following format:
  {
    <node_dcid>: {
      <prop>: [
        {
          'dcid':
          'value':
          'name':
          'types': []
        },
        ...
      ]
    }
  }

  """
  resp = dc.v2node(nodes, '->*' if out else '<-*')
  result = {}
  for node, arcs in resp.get('data', {}).items():
    result[node] = {}
    for prop, val in arcs.get('arcs', {}).items():
      result[node][prop] = val.get('nodes', [])
  return result


def descendent_places(nodes, descendent_type):
  # When the only node being requested is also the descendent_type, fetch all nodes of that type.
  if nodes and len(nodes) == 1 and nodes[0] == descendent_type:
    return property_values(nodes, "typeOf", out=False)
  return property_values(
      nodes,
      "containedInPlace+",
      out=False,
      constraints="{{typeOf:{}}}".format(descendent_type),
  )


def raw_descendent_places(nodes, descendent_type):
  return raw_property_values(
      nodes,
      'containedInPlace+',
      out=False,
      constraints='{{typeOf:{}}}'.format(descendent_type))


def resolve_id(nodes, in_prop, out_prop):
  """Resolves ids given nodes input and output property.

  Args:
      nodes: A list of input ids.
      in_prop: The input property.
      out_prop: The output property.

  The response is the following format:
  {
    <node_dcid>: [list of resolved ids]
  }

  """
  resp = dc.resolve(nodes, '<-{}->{}'.format(in_prop, out_prop))
  result = {}
  for entity in resp.get('entities', []):
    result[entity['node']] = entity['candidates']
  return result


def resolve_coordinates(coordinates):
  """Resolves a list of coordinates.

  Args:
      coordinates: a list of { longitude: number, latitude: number }.
  Returns:
      {
        <lat#long>: [list of resolved ids]
      }

  """
  nodes = []
  for coord in coordinates:
    nodes.append('{}#{}'.format(coord['latitude'], coord['longitude']))
  resp = dc.resolve(nodes, '<-geoCoordinate->dcid')
  result = {}
  for entity in resp.get('entities', []):
    result[entity['node']] = entity.get('candidates', [])
  return result


def event_collection(event_type,
                     affected_place,
                     date,
                     filter_prop=None,
                     filter_unit=None,
                     filter_upper_limit=None,
                     filter_lower_limit=None):
  """Gets all the events for a specified event type, affected place, date, and
      filter information (filter prop, unit, lower limit, and upper limit).

  Args:
      event_type: type of events to get
      affected_place: affected place of events to get
      date: date of events to get
  """
  return dc.v2event(node=affected_place,
                    prop='<-location{{typeOf:{},date:{}, {}:{}#{}#{}}}'.format(
                        event_type, date, filter_prop, filter_lower_limit,
                        filter_upper_limit, filter_unit))


def event_collection_date(event_type, affected_place):
  """Gets all the dates of events for a specified event type and affected place

  Args:
      event_type: type of event to get the dates for
      affected_place: affected place of events to include dates of
  """
  return dc.v2event(node=affected_place,
                    prop='<-location{{typeOf:{}}}->date'.format(event_type))
