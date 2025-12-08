import json

from flask import Response


def _create_dummy_response(data):
  return Response(json.dumps(data),
                  mimetype='application/json',
                  headers={'X-Webdriver-Dummy-Response': 'true'})


def _dummy_place_name_response(request):
  req_json = request.get_json(silent=True) or {}
  dcids = req_json.get('dcids', [])
  return _create_dummy_response({dcid: "" for dcid in dcids})


def _dummy_variable_info_response(request):
  dcids = request.args.get('dcids', '').split(',')
  return _create_dummy_response({dcid: {} for dcid in dcids if dcid})


def _dummy_observation_response(request):
  return _create_dummy_response({"data": {}, "facets": {}})


def _dummy_place_parent_response(request):
  return _create_dummy_response([])


def _dummy_observation_existence_response(request):
  req_json = request.get_json(silent=True) or {}
  entities = req_json.get('entities', [])
  variables = req_json.get('variables', [])
  return _create_dummy_response(
      {var: {
          entity: True for entity in entities
      } for var in variables})


def _dummy_choropleth_geojson_response(request):
  return _create_dummy_response({
      "type": "FeatureCollection",
      "features": [],
      "properties": {
          "current_geo": "06"
      }
  })


def _dummy_facets_response(request):
  return _create_dummy_response([])


def _dummy_facets_within_response(request):
  return _create_dummy_response({})


def _dummy_node_propvals_out_response(request):
  return _create_dummy_response({})


def _dummy_node_triples_out_response(request):
  return _create_dummy_response({})


def _dummy_place_name_i18n_response(request):
  return _create_dummy_response({})


def _dummy_stat_var_property_response(request):
  return _create_dummy_response({})


def _dummy_variable_group_info_response(request):
  return _create_dummy_response({
      "childStatVarGroups": [],
      "childStatVars": [],
      "descendentStatVarCount": 0
  })


def _dummy_disaster_event_data_response(request):
  return _create_dummy_response(
      {"eventCollection": {
          "events": [],
          "provenanceInfo": {}
      }})


# Register fallback responses
FALLBACK_RESPONSES = {
    '/api/place/name': _dummy_place_name_response,
    '/api/place/displayname': _dummy_place_name_response,
    '/api/place/parent': _dummy_place_parent_response,
    '/api/observations/point': _dummy_observation_response,
    '/api/observations/point/within': _dummy_observation_response,
    '/api/observations/series': _dummy_observation_response,
    '/api/variable/info': _dummy_variable_info_response,
    '/api/variable-group/info': _dummy_variable_group_info_response,
    '/api/observation/existence': _dummy_observation_existence_response,
    '/api/choropleth/geojson': _dummy_choropleth_geojson_response,
    '/api/facets': _dummy_facets_response,
    '/api/facets/within': _dummy_facets_within_response,
    '/api/node/propvals/out': _dummy_node_propvals_out_response,
    '/api/place/name/i18n': _dummy_place_name_i18n_response,
    '/api/stats/stat-var-property': _dummy_stat_var_property_response,
    '/api/disaster-dashboard/event-data': _dummy_disaster_event_data_response
}

# Prefix fallback responses
PREFIX_FALLBACK_RESPONSES = {
    '/api/node/triples/out/': _dummy_node_triples_out_response
}
