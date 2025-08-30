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
from typing import Annotated, Dict, List, Literal, Optional, Union

import flask
from flask import Blueprint
from flask import request
from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from server.services import datacommons as dc

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')


class ApiBaseModel(BaseModel):
  # Enables Pydantic models to be initialized using either the field's name
  # or its alias.
  model_config = ConfigDict(populate_by_name=True)


class ResponseMetadata(ApiBaseModel):
  threshold_override: Optional[float] = Field(alias="thresholdOverride",
                                              default=None)


class IndicatorResult(ApiBaseModel):
  dcid: str
  name: Optional[str] = None
  description: Optional[str] = None
  # This is the discriminator field. It must be a string in the base model.
  indicator_type: str = Field(alias="indicatorType")
  score: float
  sentences: list[str] = Field(default_factory=list)


class StatVarResult(IndicatorResult):
  """Statistical Variable Result"""
  indicator_type: Literal["variable"] = Field(alias="indicatorType",
                                              default="variable")


class TopicResult(IndicatorResult):
  """Topic Result"""
  indicator_type: Literal["topic"] = Field(alias="indicatorType",
                                           default="topic")


# Define the discriminated union type.
Indicator = Annotated[Union[StatVarResult, TopicResult],
                      Field(discriminator="indicator_type")]


class IndexResponse(ApiBaseModel):
  model_threshold: float = Field(alias="modelThreshold")
  indicators: List[Indicator] = Field(default_factory=list)


class SearchVariablesResponse(ApiBaseModel):
  results: Dict[str, Dict[str, IndexResponse]] = Field(
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

    This endpoint orchestrates a multi-step process:
    1.  Searches for indicators (statistical variables and topics) across one or more
        embedding indices based on the provided natural language queries.
    2.  Filters the resulting indicators based on a cosine score threshold.
    3.  Enriches the final indicators with metadata like name and description.

    The final output is a nested dictionary mapping from query to index name
    to an `IndexResponse` object which contains a list of filtered, ranked,
    and enriched `IndicatorResult` objects (StatVarResult or TopicResult).

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
                "indicators": [
                  {
                    "dcid": "Count_Person",
                    "name": "Person Count",
                    "description": "The total number of individuals...",
                    "indicatorType": "variable",
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
                    "indicatorType": "topic",
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
    try:
      threshold_override = float(request.args["threshold"])
    except ValueError:
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
  skip_topics_arg = "true" if skip_topics else ""

  # Step 1: Get search results from the NL server in parallel.
  #
  nl_results_by_index = dc.nl_search_vars_in_parallel(
      queries, indices, skip_topics=skip_topics_arg)

  # Step 2: Collect all candidate DCIDs that pass the threshold for enrichment.
  all_dcids_to_enrich: set[str] = set()
  for index, nl_result in nl_results_by_index.items():
    if not nl_result or "queryResults" not in nl_result:
      continue

    threshold = threshold_override if threshold_override else nl_result.get(
        "scoreThreshold", 0.0)

    for query, q_result in nl_result.get("queryResults", {}).items():
      ranked_indicators = zip(q_result.get("SV", []),
                              q_result.get("CosineScore", []))
      for dcid, score in ranked_indicators:
        if score >= threshold:
          all_dcids_to_enrich.add(dcid)

  # Step 3: Enrich the valid candidates with names and descriptions.
  sv_info_map = {}
  if all_dcids_to_enrich:
    sv_info_data = dc.v2node(list(all_dcids_to_enrich), "->[name,description]")
    for dcid, sv_data in sv_info_data.get("data", {}).items():
      name_nodes = sv_data.get("arcs", {}).get("name", {}).get("nodes", [])
      name = name_nodes[0].get("value") if name_nodes else None
      desc_nodes = (sv_data.get("arcs", {}).get("description",
                                                {}).get("nodes", []))
      description = desc_nodes[0].get("value") if desc_nodes else None
      sv_info_map[dcid] = {"name": name, "description": description}

  # Step 4: Assemble the final response, preserving original ranking and using
  # the Pydantic models for validation and serialization.
  response_query_results: Dict[str, Dict[str, IndexResponse]] = {}
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
      indicators = []
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
            if threshold is None or s['score'] >= threshold
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
        indicators.append(indicator)

        if max_candidates_per_index and len(
            indicators) >= max_candidates_per_index:
          break

      if indicators:
        response_query_results[query][index] = IndexResponse(
            model_threshold=nl_result.get("scoreThreshold"),
            indicators=indicators)

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
