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
"""Endpoints for Datacommons NL Experimentation"""

from concurrent.futures import ThreadPoolExecutor
import json
from typing import Any, Dict, List, Optional

import flask
from flask import Blueprint
from flask import request
from pydantic import BaseModel
from pydantic import Field

from server.services import datacommons as dc

bp = Blueprint("nl_api", __name__, url_prefix="/api/nl")


class IndexInfo(BaseModel):
  model_threshold: float = Field(alias="modelThreshold")


class ResponseMetadata(BaseModel):
  index_info: Dict[str, IndexInfo] = Field(alias="indexInfo",
                                           default_factory=dict)
  threshold_override: Optional[float] = Field(alias="thresholdOverride",
                                              default=None)


class SentenceScore(BaseModel):
  sentence: str
  score: float


class StatVarResult(BaseModel):
  dcid: str
  name: Optional[str] = None
  description: Optional[str] = None
  scores: Dict[str, List[SentenceScore]] = Field(
      description=
      "A dictionary where the key is the embeddings index name and the value is a list of sentence scores."
  )


class SearchVariablesResponse(BaseModel):
  results: Dict[str, List[StatVarResult]] = Field(
      alias="queryResults",
      description=
      "A dictionary where the key is the search string and the value is a list of StatVarResult.",
  )
  response_metadata: ResponseMetadata = Field(alias="responseMetadata")


@bp.route("/encode-vector", methods=["POST"])
def encode_vector():
  """Retrieves the embedding vector for a given query and model."""
  model = request.args.get("model")
  queries = request.json.get("queries", [])
  return json.dumps(dc.nl_encode(model, queries))


@bp.route("/search-vector", methods=["POST"])
def search_vector():
  """Performs vector search for a given query and embedding index."""
  idx = request.args.get("idx")
  if not idx:
    flask.abort(400, "Must provide an `idx`")
  queries = request.json.get("queries")
  if not queries:
    flask.abort(400, "Must provide a `queries` in POST data")

  return dc.nl_search_vars(queries,
                           idx.split(","),
                           skip_topics=request.args.get("skip_topics", ""))


@bp.route("/search-variables", methods=["GET"])
def search_variables():
  """Performs variable search for given queries."""
  # `queries` is a required repeated input
  queries = request.args.getlist("queries")
  if not queries:
    flask.abort(400, "`queries` is a required parameter")
  # `index` is an optional repeated input
  indices = request.args.getlist("index")
  # `place_dcids` is an optional repeated input
  place_dcids = request.args.getlist("place_dcids")
  # `threshold` is an optional float input
  threshold_override = request.args.get("threshold", type=float)
  # `max_matches` is an optional int
  max_matches = request.args.get("max_matches", type=int)
  # `skip_topics` is an optional bool
  skip_topics = request.args.get(
      "skip_topics",
      default=False,
      type=lambda v: v.lower() in ["true", "1"],
  )
  skip_topics_arg = "true" if skip_topics else ""

  # Use default indices if none are provided.
  indices_to_run = indices
  if not indices_to_run:
    server_config = dc.nl_server_config()
    indices_to_run = server_config.get("default_indexes", [])

  # This will hold merged results.
  # query -> sv -> list of augmented SentenceScore dicts
  merged_sv_sentences: Dict[str, Dict[str, List[Dict]]] = {}
  # For response metadata
  index_info: Dict[str, IndexInfo] = {}

  def search_for_index(index):
    return index, dc.nl_search_vars(queries, [index],
                                    skip_topics=skip_topics_arg)

  with ThreadPoolExecutor() as executor:
    results = executor.map(search_for_index, indices_to_run)

  for index, nl_result in results:
    if not nl_result or "queryResults" not in nl_result:
      continue

    model_threshold = nl_result.get("scoreThreshold")
    if model_threshold is not None:
      index_info[index] = IndexInfo(model_threshold=model_threshold)

    for query, q_result in nl_result.get("queryResults", {}).items():
      merged_sv_sentences.setdefault(query, {})
      for sv, sentences in q_result.get("SV_to_Sentences", {}).items():
        merged_sv_sentences[query].setdefault(sv, [])
        for s in sentences:
          s["index"] = index
          merged_sv_sentences[query][sv].append(s)

  # For each query, filter sentences and rank SVs by score
  final_query_sv_scores: Dict[str, List[tuple[str, float]]] = {}
  for query, sv_sentences_map in merged_sv_sentences.items():
    sv_score_tuples = {}
    for sv, sentences in sv_sentences_map.items():
      if not sentences:
        continue

      # Filter sentences by threshold. The threshold depends on the sentence's index or the override.
      filtered_sentences = []
      for s in sentences:
        threshold_to_use = threshold_override
        if threshold_to_use is None:
          if s["index"] in index_info:
            threshold_to_use = index_info[s["index"]].model_threshold

        if threshold_to_use is None or s["score"] >= threshold_to_use:
          filtered_sentences.append(s)

      if not filtered_sentences:
        continue

      # Update sentences for this SV with the filtered list
      sv_sentences_map[sv] = filtered_sentences

      # Get score tuples for sorting
      sv_scores_by_index = {}
      for s in filtered_sentences:
        idx = s["index"]
        score = s["score"]
        if idx not in sv_scores_by_index or score > sv_scores_by_index[idx]:
          sv_scores_by_index[idx] = score

      score_tuple = []
      for index_name in indices_to_run:
        # Negate for descending sort
        score = sv_scores_by_index.get(index_name, -1.0)
        score_tuple.append(-score)
      sv_score_tuples[sv] = tuple(score_tuple)

    # Sort SVs by the tuple of scores, then by dcid.
    sorted_svs = sorted(sv_score_tuples.items(),
                        key=lambda item: (item[1], item[0]))

    # Re-create the list of (sv, score) tuples with the top score
    ranked_sv_scores = []
    for sv_dcid, _ in sorted_svs:
      filtered_sentences = sv_sentences_map[sv_dcid]
      top_score = max(s["score"] for s in filtered_sentences)
      ranked_sv_scores.append((sv_dcid, top_score))
    final_query_sv_scores[query] = ranked_sv_scores

  # Filter by place if place_dcids are provided
  all_sv_dcids = set()
  for sv_scores in final_query_sv_scores.values():
    for sv, _ in sv_scores:
      all_sv_dcids.add(sv)

  filtered_sv_dcids = all_sv_dcids
  if place_dcids and all_sv_dcids:
    # Filter stat vars by place
    filtered_result = dc.filter_statvars(list(all_sv_dcids), place_dcids)
    filtered_sv_dcids = {
        sv["dcid"] for sv in filtered_result.get("statVars", [])
    }

  # Apply place filtering and max_matches
  final_sv_dcids_to_fetch_info = set()
  for query, sv_scores in final_query_sv_scores.items():
    filtered_sv_scores = [
        (sv, score) for sv, score in sv_scores if sv in filtered_sv_dcids
    ]
    # Apply max_matches
    final_query_sv_scores[query] = filtered_sv_scores[:max_matches]
    for sv_dcid, _ in final_query_sv_scores[query]:
      final_sv_dcids_to_fetch_info.add(sv_dcid)

  # Batch fetch stat var info for all SVs that made it through filtering
  sv_info_map = {}
  if final_sv_dcids_to_fetch_info:
    sv_info_data = dc.variable_info(list(final_sv_dcids_to_fetch_info))
    for sv_data in sv_info_data.get("data", []):
      dcid = sv_data.get("node")
      if dcid:
        sv_info_map[dcid] = {
            "name": sv_data.get("name"),
            "description": sv_data.get("description"),
        }

  # Second pass: construct the final response by building Pydantic objects
  response_query_results: Dict[str, List[StatVarResult]] = {}
  for query, sv_scores in final_query_sv_scores.items():
    response_query_results[query] = []
    sv_sentences_map = merged_sv_sentences.get(query, {})

    for sv_dcid, _ in sv_scores:
      sentences_data = sv_sentences_map.get(sv_dcid, [])
      scores_by_index: Dict[str, List[SentenceScore]] = {}
      for s_data in sentences_data:
        index_name = s_data["index"]
        sentence_score_obj = SentenceScore(**s_data)
        scores_by_index.setdefault(index_name, []).append(sentence_score_obj)

      for index_name in scores_by_index:
        scores_by_index[index_name].sort(key=lambda s: s.score, reverse=True)

      info = sv_info_map.get(sv_dcid, {})
      stat_var_result = StatVarResult(
          dcid=sv_dcid,
          name=info.get("name"),
          description=info.get("description"),
          scores=scores_by_index,
      )
      response_query_results[query].append(stat_var_result)

  # Build the final SearchVariablesResponse object
  response_metadata = ResponseMetadata(
      index_info=index_info,
      threshold_override=threshold_override,
  )
  final_response = SearchVariablesResponse(results=response_query_results,
                                           response_metadata=response_metadata)

  try:
    return final_response.model_dump_json(by_alias=True)
  except Exception as e:
    flask.abort(500, f"Response validation failed: {e}")
