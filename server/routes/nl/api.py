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
from typing import Annotated, Dict, List, Literal, Union

import flask
from flask import Blueprint, request
from pydantic import BaseModel, ConfigDict, Field

from server.services import datacommons as dc

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')


class ApiBaseModel(BaseModel):
  # Enables Pydantic models to be initialized using either the field's name
  # or its alias.
  model_config = ConfigDict(populate_by_name=True)


class ResponseMetadata(ApiBaseModel):
  threshold_override: float | None = Field(alias="thresholdOverride",
                                           default=None)


class IndicatorResult(ApiBaseModel):
  dcid: str
  name: str | None = None
  description: str | None = None
  # This is the discriminator field. It must be a string in the base model.
  indicator_type: str = Field(alias="indicatorType")
  score: float
  sentences: list[str] = Field(
      default_factory=list,
      description=
      "A list of matching sentences from the embeddings index that have a score greater than or equal to the acting threshold."
  )


class StatVarResult(IndicatorResult):
  """Statistical Variable Result"""
  indicator_type: Literal["StatisticalVariable"] = Field(
      alias="indicatorType", default="StatisticalVariable")


class TopicResult(IndicatorResult):
  """Topic Result"""
  indicator_type: Literal["Topic"] = Field(alias="indicatorType",
                                           default="Topic")


# Define the discriminated union type.
IndicatorResult = Annotated[Union[StatVarResult, TopicResult],
                            Field(discriminator="indicator_type")]


class IndexResponse(ApiBaseModel):
  model_threshold: float = Field(alias="modelThreshold")
  candidates: List[IndicatorResult] = Field(default_factory=list)


class SearchVariablesResponse(ApiBaseModel):
  results: dict[str, dict[str, IndexResponse]] = Field(
      alias="queryResults",
      description=
      "A dictionary where the key is the search string and the value is a dictionary from index name to an IndexResponse object.",
  )
  response_metadata: ResponseMetadata = Field(alias="responseMetadata")


@bp.route('/encode-vector', methods=['POST'])
def encode_vector():
  """Retrieves the embedding vector for a given query and model."""
  model = request.args.get('model')
  queries = request.json.get('queries', [])
  return json.dumps(dc.nl_encode(model, queries))


def _get_property_value(sv_data: dict, prop: str) -> str | None:  
    """Safely extracts a property value from a v2/node response item."""  
    prop_arcs = sv_data.get("arcs", {})  
    prop_nodes = prop_arcs.get(prop, {}).get("nodes", [])  
    return prop_nodes[0].get("value") if prop_nodes else None  

@bp.route('/search-vector', methods=['POST'])
def search_vector():
  """Performs vector search for a given query and embedding index."""
  idx = request.args.get('idx')
  if not idx:
    flask.abort(400, 'Must provide an `idx`')
  queries = request.json.get('queries')
  if not queries:
    flask.abort(400, 'Must provide a `queries` in POST data')

  return dc.nl_search_vars(queries,
                           idx.split(','),
                           skip_topics=request.args.get('skip_topics', ''))


@bp.route("/search-variables", methods=["GET"])
def search_variables():
  """Performs variable search for given queries, with optional filtering.

    **Disclaimer:** This endpoint is designated as experimental and corresponds
    to the Alpha stability level as defined by Google's AIP-181
    (https://aip.dev/181). It is not guaranteed to be stable, is subject to
    change or removal without notice, and should not be relied upon for
    long-term production use.

    This endpoint orchestrates a multi-step process:
    1.  Searches for indicators (statistical variables and topics) across one or more
        embedding indices based on the provided natural language queries.
    2.  Filters the resulting indicators based on a cosine score threshold. An
        indicator is kept if its highest-scoring sentence meets the threshold.
    3.  Enriches the final indicators with metadata like name and description.

    The final output is a nested dictionary mapping from query to index name
    to an `IndexResponse` object. This object contains a list of filtered,
    ranked, and enriched `IndicatorResult` objects (StatVarResult or TopicResult).
    For each of these results, the `sentences` list will only contain the
    original matching sentences that also met or exceeded the threshold.

    Args (from query string):
        queries (str, repeated): The natural language queries to search for.
        index (str, repeated, optional): The embedding indices to query.
            Defaults to the server's default indices if not provided.
        threshold (float, optional): A score threshold to override the
            model's default.
        max_candidates_per_index (int, optional): The max number of results
            to return per index.
        skip_topics (bool, optional): Whether to skip topic-based indicators.

    Returns:
        A JSON response structured like the following example:
        {
          "queryResults": {
            "population of california": {
              "medium_ft": {
                "modelThreshold": 0.75,
                "candidates": [
                  {
                    "dcid": "Count_Person",
                    "name": "Person Count",
                    "description": "The total number of individuals...",
                    "indicatorType": "StatisticalVariable",
                    "score": 0.95,
                    "sentences": [
                      "population of",
                      "number of people"
                    ]
                  },
                  {
                    "dcid": "dc/topic/Race",
                    "name": "Population by Race",
                    "description": "...",
                    "indicatorType": "Topic",
                    "score": 0.88,
                    "sentences": [
                      "population broken down by race"
                    ]
                  }
                ],
              }
            }
          },
          "responseMetadata": {
            "thresholdOverride": null
          }
        }
  """
  #
  # Step 0: Process inputs and fetch default indices if needed
  #
  queries = request.args.getlist("queries")
  if not queries:
    flask.abort(400, "`queries` is a required parameter")
  indices = request.args.getlist("index")
  if not indices:
    server_config = dc.nl_server_config()
    indices = server_config.get("default_indexes", [])

  threshold_override = None
  if "threshold" in request.args:
    value_exception = False
    try:
      threshold_override = float(request.args["threshold"])
    except ValueError:
      value_exception = True
    
    if value_exception:
      flask.abort(400, "The `threshold` parameter must be a valid float.")
    

  max_candidates_per_index = None
  if "max_candidates_per_index" in request.args:
    try:
      max_candidates_per_index = int(request.args["max_candidates_per_index"])
    except ValueError:
      flask.abort(
          400,
          "The `max_candidates_per_index` parameter must be a valid integer.")

  skip_topics = request.args.get(
      "skip_topics",
      default=False,
      type=lambda v: v.lower() in ["true", "1"],
  )

  # Step 1: Get search results from the NL server in parallel.
  #
  nl_results_by_index = dc.nl_search_vars_in_parallel(queries,
                                                      indices,
                                                      skip_topics=skip_topics)

  # Step 2: Collect all candidate DCIDs that pass the threshold for enrichment.
  all_dcids_to_enrich: set[str] = set()
  for index, nl_result in nl_results_by_index.items():
    if not nl_result or "queryResults" not in nl_result:
      continue

    threshold = threshold_override if threshold_override else nl_result.get(
        "scoreThreshold", 0.0)
    indicators_above_threshold = 0
    for query, q_result in nl_result.get("queryResults", {}).items():
      ranked_indicators = zip(q_result.get("SV", []),
                              q_result.get("CosineScore", []))
      for dcid, score in ranked_indicators:
        if score >= threshold:
          all_dcids_to_enrich.add(dcid)
          indicators_above_threshold += 1
          if max_candidates_per_index and indicators_above_threshold >= max_candidates_per_index:
            break

  # Step 3: Enrich the valid candidates with names and descriptions.
  sv_info_map = {}
  if all_dcids_to_enrich:
    sv_info_data = dc.v2node(list(all_dcids_to_enrich), "->[name,description]")
    for dcid, sv_data in sv_info_data.get("data", {}).items():
      sv_info_map[dcid] = {"name": _get_property_value(sv_data, "name"),
                           "description": _get_property_value(sv_data, "description")}

  # Step 4: Assemble the final response, preserving original ranking and using
  # the Pydantic models for validation and serialization.
  response_query_results: dict[str, dict[str, IndexResponse]] = {}
  for query in queries:
    response_query_results[query] = {}
    for index in indices:
      nl_result = nl_results_by_index.get(index)
      if not nl_result or "queryResults" not in nl_result or query not in nl_result[
          "queryResults"]:
        continue

      threshold = threshold_override if threshold_override else nl_result.get(
          "scoreThreshold", 0.0)

      q_result = nl_result["queryResults"][query]
      sv_to_sentences = q_result.get("SV_to_Sentences", {})

      # This list will hold the validated StatVarResult and TopicResult objects.
      candidates: List[IndicatorResult] = []
      ranked_indicators = zip(q_result.get("SV", []),
                              q_result.get("CosineScore", []))
      for dcid, score in ranked_indicators:
        # Filter by score.
        if score < threshold:
          continue

        sv_info = sv_info_map.get(dcid, {})
        # Get the top matching sentences for context, also filtered by score.
        sentences = [
            s['sentence']
            for s in sv_to_sentences.get(dcid, [])
            if s['score'] >= threshold
        ]

        # Based on the DCID, create either a TopicResult or a StatVarResult.
        # Pydantic will validate the structure.
        if "/topic/" in dcid:
          indicator = TopicResult(dcid=dcid,
                                  name=sv_info.get("name"),
                                  description=sv_info.get("description"),
                                  score=score,
                                  sentences=sentences)
        else:
          indicator = StatVarResult(dcid=dcid,
                                    name=sv_info.get("name"),
                                    description=sv_info.get("description"),
                                    score=score,
                                    sentences=sentences)
        candidates.append(indicator)

        if max_candidates_per_index and len(
            candidates) >= max_candidates_per_index:
          break

      if candidates:
        response_query_results[query][index] = IndexResponse(
            model_threshold=nl_result.get("scoreThreshold"),
            candidates=candidates)

  # Build the final SearchVariablesResponse object
  try:
    response_metadata = ResponseMetadata(threshold_override=threshold_override,)
    final_response = SearchVariablesResponse(
        results=response_query_results, response_metadata=response_metadata)
    return final_response.model_dump_json(by_alias=True)
  except Exception as e:
    # If there is a validation error, it's a 500 because the server
    # is producing an invalid response.
    flask.abort(500, f"Response validation failed: {e}")
