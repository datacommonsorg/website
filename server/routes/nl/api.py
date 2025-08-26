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

import json
from typing import Any, Dict, List, Optional

import flask
from flask import Blueprint
from flask import request
from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from server.services import datacommons as dc

bp = Blueprint("nl_api", __name__, url_prefix="/api/nl")


class ApiBaseModel(BaseModel):
  # Enables Pydantic models to be initialized using either the field's name
  # or its alias.
  model_config = ConfigDict(populate_by_name=True)


class IndexInfo(ApiBaseModel):
  model_threshold: float = Field(alias="modelThreshold")


class ResponseMetadata(ApiBaseModel):
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
  scores: List[SentenceScore]


class SearchVariablesResponse(ApiBaseModel):
  results: Dict[str, Dict[str, List[StatVarResult]]] = Field(
      alias="queryResults",
      description=
      "A dictionary where the key is the search string and the value is a dictionary from index name to a list of StatVarResult.",
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
  """Performs variable search for given queries, with optional filtering.

    This endpoint orchestrates a multi-step process:
    1.  Searches for statistical variables (SVs) across one or more
        embedding indices based on the provided natural language queries.
    2.  Filters the resulting SVs based on a cosine score threshold.
    3.  If place DCIDs are provided, it further filters SVs to only those
        that have data for at least one of the specified places.
    4.  Enriches the final SVs with metadata like name and description.

    The final output is a nested dictionary mapping from query to index name
    to a list of filtered, ranked, and enriched StatVarResult objects.

    Args (from query string):
        queries (str, repeated): The natural language queries to search for.
        index (str, repeated, optional): The embedding indices to query.
            Defaults to the server's default indices if not provided.
        place_dcids (str, repeated, optional): A list of place DCIDs to
            filter the search results.
        threshold (float, optional): A score threshold to override the
            model's default.
        max_candidates_per_index (int, optional): The max number of results
            to return per index.
        skip_topics (bool, optional): Whether to skip topic-based SVs.

    Returns:
        A JSON response structured like the following example:
        {
          "queryResults": {
            "population of california": {
              "medium_ft": [
                {
                  "dcid": "Count_Person",
                  "name": "Person Count",
                  "description": "The total number of individuals...",
                  "scores": [
                    {"sentence": "population of", "score": 0.95},
                    {"sentence": "number of people", "score": 0.92}
                  ]
                }
              ]
            }
          },
          "responseMetadata": {
            "indexInfo": {
              "medium_ft": {
                "modelThreshold": 0.75
              }
            },
            "thresholdOverride": null
          }
        }
    """
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
  # `max_candidates_per_index` is an optional int that limits candidates from each index.
  max_candidates_per_index = request.args.get("max_candidates_per_index",
                                              type=int)
  # `skip_topics` is an optional bool
  skip_topics = request.args.get(
      "skip_topics",
      default=False,
      type=lambda v: v.lower() in ["true", "1"],
  )
  skip_topics_arg = "true" if skip_topics else ""

  indices_to_run = indices
  if not indices_to_run:
    server_config = dc.nl_server_config()
    indices_to_run = server_config.get("default_indexes", [])

  # This will hold all query results keyed by query and index.
  # query -> index -> nl_result
  query_results_by_index: Dict[str, Dict[str, Any]] = {}
  # For response metadata
  index_info: Dict[str, IndexInfo] = {}

  # The new call encapsulates the parallelism.
  # The result is a dict: index -> nl_result
  nl_results_by_index = dc.nl_search_vars_in_parallel(
      queries, indices_to_run, skip_topics=skip_topics_arg)

  for index, nl_result in nl_results_by_index.items():
    if not nl_result or "queryResults" not in nl_result:
      continue

    model_threshold = nl_result.get("scoreThreshold")
    if model_threshold is not None:
      index_info[index] = IndexInfo(model_threshold=model_threshold)

    for query, q_result in nl_result.get("queryResults", {}).items():
      query_results_by_index.setdefault(query, {})[index] = q_result

  # Filter by threshold and collect good sentences at the same time.
  # This map will be: query -> index -> sv_dcid -> List[SentenceScore]
  sv_sentences_after_threshold: Dict[str, Dict[str,
                                               Dict[str,
                                                    List[SentenceScore]]]] = {}
  for query, index_results in query_results_by_index.items():
    sv_sentences_after_threshold[query] = {}
    for index, q_result in index_results.items():
      sv_sentences_after_threshold[query][index] = {}
      sv_sentences_map = q_result.get("SV_to_Sentences", {})
      ranked_svs = q_result.get("SV", [])

      threshold_to_use = threshold_override
      if threshold_to_use is None and index in index_info:
        threshold_to_use = index_info[index].model_threshold

      for sv_dcid in ranked_svs:
        sentences_data = sv_sentences_map.get(sv_dcid, [])
        if not sentences_data:
          continue

        # Check if any sentence for this SV meets the threshold.
        passes_threshold = False
        if threshold_to_use is None:
          passes_threshold = True
        else:
          for s in sentences_data:
            if s["score"] >= threshold_to_use:
              passes_threshold = True
              break

        if passes_threshold:
          # If it passes, collect all sentences and sort them.
          all_sentences = [SentenceScore(**s) for s in sentences_data]
          all_sentences.sort(key=lambda s: s.score, reverse=True)
          sv_sentences_after_threshold[query][index][sv_dcid] = all_sentences

  # Now get all unique SVs to do the place check
  all_sv_dcids_to_check = set()
  for query_map in sv_sentences_after_threshold.values():
    for index_map in query_map.values():
      all_sv_dcids_to_check.update(index_map.keys())

  # Filter by place if place_dcids are provided
  filtered_sv_dcids = all_sv_dcids_to_check
  if place_dcids and all_sv_dcids_to_check:
    # Filter stat vars by place
    filtered_result = dc.filter_statvars(list(all_sv_dcids_to_check),
                                         place_dcids)
    filtered_sv_dcids = {
        sv["dcid"] for sv in filtered_result.get("statVars", [])
    }

  # Batch fetch stat var info for all SVs that made it through filtering
  sv_info_map = {}
  if filtered_sv_dcids:
    sv_info_data = dc.variable_info(list(filtered_sv_dcids))
    for sv_data in sv_info_data.get("data", []):
      dcid = sv_data.get("node")
      if dcid:
        sv_info_map[dcid] = {
            "name": sv_data.get("name"),
            "description": sv_data.get("description"),
        }

  # Construct the final response by building Pydantic objects
  response_query_results: Dict[str, Dict[str, List[StatVarResult]]] = {}
  for query, index_results in query_results_by_index.items():
    response_query_results[query] = {}
    for index, q_result in index_results.items():
      sv_results_for_index: List[StatVarResult] = []
      sv_sentences_map = q_result.get("SV_to_Sentences", {})
      # Need to maintain original ranking from the NL server
      ranked_svs = q_result.get("SV", [])

      for sv_dcid in ranked_svs:
        if sv_dcid not in filtered_sv_dcids:
          continue

        # Get the pre-filtered sentences
        filtered_sentences = (sv_sentences_after_threshold.get(query, {}).get(
            index, {}).get(sv_dcid))
        if not filtered_sentences:
          # This can happen if the SV was present in another query/index combo
          # and made it into filtered_sv_dcids, but for *this* query/index,
          # it had no sentences that passed the threshold.
          continue

        info = sv_info_map.get(sv_dcid, {})
        sv_results_for_index.append(
            StatVarResult(
                dcid=sv_dcid,
                name=info.get("name"),
                description=info.get("description"),
                scores=filtered_sentences,
            ))

      if max_candidates_per_index:
        sv_results_for_index = sv_results_for_index[:max_candidates_per_index]

      if sv_results_for_index:
        response_query_results[query][index] = sv_results_for_index

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
