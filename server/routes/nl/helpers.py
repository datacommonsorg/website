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

import asyncio
import json
import logging
import time
from typing import Dict, List

import flask
from flask import current_app
from google.protobuf.json_format import MessageToJson
from markupsafe import escape

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.explore import params
from server.lib.explore.params import QueryMode
from server.lib.nl.common import bad_words
from server.lib.nl.common import commentary
from server.lib.nl.common import serialize
import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.common.debug_utils as dbg
import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_utterance
import server.lib.nl.config_builder.base as builder_base
from server.lib.nl.config_builder.builder import BuilderResult
import server.lib.nl.config_builder.builder as config_builder
from server.lib.nl.detection import utils as dutils
import server.lib.nl.detection.context as context
import server.lib.nl.detection.detector as detector
from server.lib.nl.detection.place import get_place_from_dcids
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import LlmApiType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetectorType
from server.lib.nl.detection.types import RequestedDetectorType
from server.lib.nl.detection.utils import create_utterance
import server.lib.nl.fulfillment.fulfiller as fulfillment
import server.lib.nl.fulfillment.utils as futils
from server.lib.translator import detect_lang_and_translate
from server.lib.translator import translate_page_config
from server.lib.util import get_nl_disaster_config
from server.routes.nl import helpers
import server.services.bigtable as bt
from shared.lib.constants import EN_LANG_CODE
import shared.lib.utils as shared_utils

_SANITY_TEST = 'sanity'


# Get the default place to be used for fulfillment. If there is a place in the
# request, use that. Otherwise, use pre-chosen places.
def _get_default_place(request: Dict, is_special_dc: bool, debug_logs: Dict):
  default_place_dcid = request.args.get('default_place', default='', type=str)
  # If default place from request is earth, use the Earth place object
  if default_place_dcid == constants.EARTH.dcid:
    return constants.EARTH
  # If default place from request is something else, get the place object for
  # that dcid
  elif default_place_dcid:
    places, _ = get_place_from_dcids([default_place_dcid], debug_logs)
    if len(places) > 0:
      return places[0]
    else:
      return None
  # For SDG use Earth as the default place.
  elif is_special_dc:
    return constants.EARTH
  else:
    return constants.USA


#
# Given a request parses the query and other params and
# detects stuff into a Detection object.
#
def parse_query_and_detect(request: Dict, backend: str, client: str,
                           debug_logs: Dict):
  if not current_app.config.get('NL_BAD_WORDS'):
    logging.error('Missing NL_BAD_WORDS config!')
    flask.abort(404)
  nl_bad_words = current_app.config['NL_BAD_WORDS']

  test = request.args.get(params.Params.TEST.value, '')
  # i18n param
  i18n_str = request.args.get(params.Params.I18N.value, '')
  i18n = i18n_str and i18n_str.lower() == 'true'

  # Index-type default is in nl_server.
  embeddings_index_type = request.args.get('idx', '')
  original_query = request.args.get('q')
  if not original_query:
    err_json = helpers.abort(
        'Received an empty query, please type a few words :)',
        '', [],
        test=test,
        client=client)
    return None, err_json
  context_history = []
  if request.get_json():
    context_history = request.get_json().get('contextHistory', [])
  dc = request.get_json().get('dc', '')
  embeddings_index_type = params.dc_to_embedding_type(dc, embeddings_index_type)

  detector_type = request.args.get(
      'detector',
      default=RequestedDetectorType.HybridSafetyCheck.value,
      type=str)

  # mode param
  use_default_place = True
  mode = request.args.get(params.Params.MODE.value, '')
  if mode == QueryMode.STRICT:
    # Strict mode is compatible only with Heuristic Detector!
    detector_type = RequestedDetectorType.Heuristic.value
    use_default_place = False

  place_detector_type = request.args.get('place_detector',
                                         default='dc',
                                         type=str).lower()
  if place_detector_type not in [PlaceDetectorType.NER, PlaceDetectorType.DC]:
    logging.error(f'Unknown place_detector {place_detector_type}')
    place_detector_type = PlaceDetectorType.NER
  else:
    place_detector_type = PlaceDetectorType(place_detector_type)

  llm_api_type = request.args.get('llm_api',
                                  default=LlmApiType.Palm.value,
                                  type=str).lower()
  if llm_api_type not in [LlmApiType.Palm, LlmApiType.GeminiPro]:
    logging.error(f'Unknown place_detector {place_detector_type}')
    llm_api_type = LlmApiType.Palm
  else:
    llm_api_type = LlmApiType(llm_api_type)

  counters = ctr.Counters()

  i18n_lang = ''
  if i18n:
    start = time.time()
    i18n_lang, original_query = detect_lang_and_translate(
        original_query, counters)
    counters.timeit("detect_lang_and_translate", start)

  query = str(escape(shared_utils.remove_punctuations(original_query)))
  if not query:
    err_json = helpers.abort(
        'Received an empty query, please type a few words :)',
        original_query,
        context_history,
        test=test,
        client=client)
    return None, err_json

  #
  # Check offensive words
  #
  if (not bad_words.is_safe(original_query, nl_bad_words) or
      not bad_words.is_safe(query, nl_bad_words)):
    err_json = helpers.abort('Sorry, could not complete your request.',
                             original_query,
                             context_history,
                             test=test,
                             blocked=True,
                             client=client)
    return None, err_json

  debug_logs["original_query"] = query

  # Generate new utterance.
  prev_utterance = serialize.load_utterance(context_history)
  if prev_utterance:
    session_id = prev_utterance.session_id
  else:
    if current_app.config['LOG_QUERY']:
      session_id = utils.new_session_id(backend)
    else:
      session_id = constants.TEST_SESSION_ID

  # Query detection routine:
  # Returns detection for Place, SVs and Query Classifications.
  start = time.time()
  query_detection = detector.detect(detector_type, place_detector_type,
                                    original_query, query, prev_utterance,
                                    embeddings_index_type, llm_api_type,
                                    debug_logs, mode, counters)
  if not query_detection:
    err_json = helpers.abort('Sorry, could not complete your request.',
                             original_query,
                             context_history,
                             debug_logs,
                             counters,
                             test=test,
                             blocked=True,
                             client=client)
    return None, err_json
  counters.timeit('query_detection', start)

  utterance = create_utterance(query_detection,
                               prev_utterance,
                               counters,
                               session_id,
                               test=test,
                               client=client,
                               mode=mode)

  if utterance:
    utterance.i18n_lang = i18n_lang
    default_place = None
    if use_default_place:
      is_special_dc = params.is_special_dc_str(dc)
      default_place = _get_default_place(request, is_special_dc, debug_logs)
    context.merge_with_context(utterance, default_place)
    if not utterance.places:
      err_json = helpers.abort(
          'Sorry, could not complete your request. No place found in the query.',
          original_query,
          context_history,
          debug_logs,
          counters,
          test=test,
          client=client)
      return None, err_json

  return utterance, None


#
# Given an utterance constructed either from a query or from dcids,
# fulfills it into charts.
#
def fulfill_with_chart_config(utterance: nl_utterance.Utterance,
                              debug_logs: Dict) -> Dict:
  disaster_config = current_app.config['NL_DISASTER_CONFIG']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    disaster_config = get_nl_disaster_config()
  else:
    logging.info('Unable to load event configs!')

  cb_config = builder_base.Config(
      event_config=disaster_config,
      sv_chart_titles=current_app.config['NL_CHART_TITLES'],
      nopc_vars=current_app.config['NOPC_VARS'],
      sdg_percent_vars=set())

  start = time.time()
  state = fulfillment.fulfill(utterance, explore_mode=False)
  utterance = state.uttr
  utterance.counters.timeit('fulfillment', start)

  if utterance.rankedCharts:
    start = time.time()
    # Call chart config builder.
    builder_result = config_builder.build(state, cb_config)
    utterance.counters.timeit('build_page_config', start)
  else:
    builder_result = BuilderResult()

  return prepare_response(utterance,
                          builder_result.page_config,
                          utterance.detection,
                          debug_logs,
                          fulfill_user_msg=builder_result.page_msg)


def prepare_response(utterance: nl_utterance.Utterance,
                     chart_pb: SubjectPageConfig,
                     detection: Detection,
                     debug_logs: Dict,
                     related_things: Dict = {},
                     fulfill_user_msg: str = '') -> Dict:
  ret_places = []
  if chart_pb:
    page_config = json.loads(MessageToJson(chart_pb))
    if utterance.i18n_lang and not utterance.i18n_lang.lower().startswith(
        EN_LANG_CODE):
      start = time.time()
      page_config = translate_page_config(page_config, utterance.i18n_lang,
                                          utterance.counters)
      utterance.counters.timeit("translate_page_config", start)

    # Figure out the main place.
    fallback = utterance.place_fallback
    if (fallback and fallback.origPlace and fallback.newPlace and
        fallback.origPlace.dcid != fallback.newPlace.dcid):
      ret_places = [fallback.newPlace]
    elif utterance.answerPlaces and len(utterance.places) > 1:
      # If there are answer places, then we know the charts will have
      # data for that place.  However, important to not do this for queries
      # like [cities with highest poverty in US]. So we do this only when
      # we came in with comparison / answer-places, since in that
      # case we know the answer will be a subset of the input places.
      ret_places = utterance.answerPlaces
    else:
      ret_places = utterance.places
  else:
    page_config = {}
    utterance.place_source = nl_utterance.FulfillmentResult.UNRECOGNIZED
    ret_places = [Place(dcid='', name='', place_type='')]

  user_message = commentary.user_message(utterance)
  if fulfill_user_msg:
    user_message.msg_list.append(fulfill_user_msg)

  dbg_counters = utterance.counters.get()
  utterance.counters = None
  context_history = serialize.save_utterance(utterance)

  ret_places_dict = []
  for p in ret_places:
    ret_places_dict.append({
        'dcid': p.dcid,
        'name': p.name,
        'place_type': p.place_type
    })
  data_dict = {
      'place': ret_places_dict[0],
      'places': ret_places_dict,
      'config': page_config,
      'context': context_history,
      'placeFallback': context_history[0]['placeFallback'],
      'svSource': utterance.sv_source.value,
      'placeSource': utterance.place_source.value,
      'pastSourceContext': utterance.past_source_context,
      'relatedThings': related_things,
      'userMessages': user_message.msg_list
  }
  if user_message.show_form:
    data_dict['showForm'] = True
  status_str = "Successful"
  if utterance.rankedCharts:
    status_str = ""
  else:
    if not utterance.places:
      status_str += '**No Place Found**.'
    if not utterance.svs:
      status_str += '**No SVs Found**.'

  has_charts = True if page_config else False
  return prepare_response_common(data_dict, status_str, detection, dbg_counters,
                                 debug_logs, has_charts, utterance.test,
                                 utterance.client)


def prepare_response_common(data_dict: Dict,
                            status_str: str,
                            detection: Detection,
                            dbg_counters: Dict,
                            debug_logs: Dict,
                            has_data: bool,
                            test: str = '',
                            client: str = '') -> Dict:
  data_dict = dbg.result_with_debug_info(data_dict, status_str, detection,
                                         dbg_counters, debug_logs)
  # Convert data_dict to pure json.
  data_dict = utils.to_dict(data_dict)
  if test:
    data_dict['test'] = test
  if client:
    data_dict['client'] = client
  if (current_app.config['LOG_QUERY'] and (not test or test == _SANITY_TEST)):
    # Asynchronously log as bigtable write takes O(100ms)
    loop = asyncio.new_event_loop()
    session_info = futils.get_session_info(data_dict['context'], has_data)
    data_dict['session'] = session_info
    loop.run_until_complete(bt.write_row(session_info, data_dict, dbg_counters))

  return data_dict


#
# Preliminary abort with the given error message
#
def abort(error_message: str,
          original_query: str,
          context_history: List[Dict],
          debug_logs: Dict = None,
          counters: ctr.Counters = None,
          blocked: bool = False,
          test: str = '',
          client: str = '') -> Dict:
  query = str(escape(shared_utils.remove_punctuations(original_query)))
  escaped_context_history = []
  for ch in context_history:
    escaped_context_history.append(escape(ch))

  res = {
      'place': {
          'dcid': '',
          'name': '',
          'place_type': '',
      },
      'config': {},
      'context': escaped_context_history,
      'failure': error_message,
      'userMessage': {
          'msg': error_message
      },
  }

  if not counters:
    counters = ctr.Counters()
  if not debug_logs:
    debug_logs = {}
    debug_logs["original_query"] = query

  query_detection = Detection(original_query=original_query,
                              cleaned_query=query,
                              places_detected=dutils.empty_place_detection(),
                              svs_detected=dutils.create_sv_detection(
                                  query, dutils.empty_svs_score_dict()),
                              classifications=[],
                              llm_resp={})
  data_dict = dbg.result_with_debug_info(data_dict=res,
                                         status=error_message,
                                         query_detection=query_detection,
                                         debug_counters=counters.get(),
                                         query_detection_debug_logs=debug_logs)

  if test:
    data_dict['test'] = test
  if client:
    data_dict['client'] = client
  if blocked:
    _set_blocked(data_dict)

  logging.info('NL Data API: Empty Exit')
  if (current_app.config['LOG_QUERY'] and (not test or test == _SANITY_TEST)):
    # Asynchronously log as bigtable write takes O(100ms)
    loop = asyncio.new_event_loop()
    session_info = futils.get_session_info(context_history, False)
    data_dict['session'] = session_info
    loop.run_until_complete(bt.write_row(session_info, data_dict, debug_logs))

  return data_dict


def _set_blocked(err_json: Dict):
  err_json['blocked'] = True
  if err_json.get('debug'):
    err_json['debug']['blocked'] = True
