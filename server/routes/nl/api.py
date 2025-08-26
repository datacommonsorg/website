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
from flask import Blueprint, request
from pydantic import BaseModel, ConfigDict, Field

from server.services import datacommons as dc

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')


class ApiBaseModel(BaseModel):
  # Enables Pydantic models to be initialized using either the field's name
  # or its alias.
  model_config = ConfigDict(populate_by_name=True)


class ResponseMetadata(ApiBaseModel):
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


class IndexResponse(ApiBaseModel):
  model_threshold: float = Field(alias="modelThreshold")
  variables: List[StatVarResult] = Field(default_factory=list)
  topics: List[StatVarResult] = Field(default_factory=list)


class SearchVariablesResponse(ApiBaseModel):
  results: Dict[str, Dict[str, IndexResponse]] = Field(
      alias="queryResults",
      description=
      "A dictionary where the key is the search string and the value is a dictionary from index name to a list of StatVarResult.",
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
              "medium_ft": {
                "modelThreshold": 0.75,
                "variables": [
                  {
                    "dcid": "Count_Person",
                    "name": "Person Count",
                    "description": "The total number of individuals...",
                    "scores": [
                      {"sentence": "population of", "score": 0.95},
                      {"sentence": "number of people", "score": 0.92},
                    ]
                  }
                ],
                "topics": [
                  {
                    "dcid": "dc/topic/Race",
                    "name": "Population by Race",
                    "scores": [
                      {"sentence": "population broken down by race", "score": 0.88}
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
  # Step 0: Process inputs
  #

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

  if not indices:
    server_config = dc.nl_server_config()
    indices = server_config.get("default_indexes", [])

  #
  # Step 1: Get search results from the NL server in parallel.
  #
  nl_results_by_index = dc.nl_search_vars_in_parallel(
      queries, indices, skip_topics=skip_topics_arg)

  #
  # Step 2: Process raw results into a list of candidates that pass the
  # score threshold.
  #
  # This will hold all query results keyed by query and index.
  # query -> index -> variables
  vars_by_query_by_index: Dict[str, Dict[str, Any]] = {}

  for index, nl_result in nl_results_by_index.items():
    if not nl_result or "queryResults" not in nl_result:
      continue

    threshold = threshold_override if threshold_override else nl_result.get(
        "scoreThreshold")

    for query, q_result in nl_result.get("queryResults", {}).items():
      # Store the original q_result for final assembly.
      vars_by_query_by_index.setdefault(query, {}).setdefault(index, [])

      ranked_svs = zip(q_result.get("SV", []), q_result.get("CosineScore", []))
      for sv in ranked_svs:
        if threshold is not None and sv[1] < threshold:
          continue

        vars_by_query_by_index[query][index].append(sv[0])

  # Flatten all svs into separate variable and topic lists
  variable_dcids = set()
  topic_dcids = set()
  for index in vars_by_query_by_index.values():
    for variables in index.values():
      for var in variables:
        if "/topic/" in var:
          topic_dcids.add(var)
        else:
          variable_dcids.add(var)

  #
  # Step 3: Perform place filtering on regular (non-topic) variables.
  #
  place_filtered_svs = variable_dcids
  if place_dcids and variable_dcids:
    filtered_result = dc.filter_statvars([{
        "dcid": sv
    } for sv in variable_dcids], place_dcids)
    place_filtered_svs = {
        sv["dcid"] for sv in filtered_result.get("statVars", [])
    }

  #
  # Step 4: Enrich the valid candidates with names and descriptions.
  #
  sv_dcids_to_enrich = place_filtered_svs.union(topic_dcids)
  sv_info_map = {}
  if sv_dcids_to_enrich:
    sv_info_data = dc.v2node(list(sv_dcids_to_enrich), "->[name,description]")
    for dcid, sv_data in sv_info_data.get("data", {}).items():
      name_nodes = sv_data.get("arcs", {}).get("name", {}).get("nodes", [])
      name = name_nodes[0].get("value") if name_nodes else None
      desc_nodes = (sv_data.get("arcs", {}).get("description",
                                                {}).get("nodes", []))
      description = desc_nodes[0].get("value") if desc_nodes else None
      sv_info_map[dcid] = {"name": name, "description": description}

  #
  # Step 5: Assemble the final response, preserving original ranking.
  #
  response_query_results: Dict[str, Dict[str, IndexResponse]] = {}
  for query, vars_by_index in vars_by_query_by_index.items():
    response_query_results[query] = {}
    for index, variables in vars_by_index.items():
      nl_index_result = nl_results_by_index[index]
      sv_to_sentences = nl_index_result.get("queryResults",
                                            {}).get(query, {}).get(
                                                "SV_to_Sentences", {})
      index_response = IndexResponse(
          model_threshold=nl_index_result.get("scoreThreshold"))
      
      for sv_dcid in variables:
        if sv_dcid not in sv_dcids_to_enrich:
          continue
        sv_info = sv_info_map.get(sv_dcid, {})
        sv_result = StatVarResult(
            dcid=sv_dcid,
            name=sv_info.get("name"),
            description=sv_info.get("description"),
            scores=[SentenceScore(**s) for s in sv_to_sentences[sv_dcid][:3]])
        if sv_dcid in topic_dcids:
          index_response.topics.append(sv_result)
        else:
          index_response.variables.append(sv_result)

        if max_candidates_per_index and len(index_response.variables) + len(
            index_response.topics) >= max_candidates_per_index:
          break

      response_query_results[query][index] = index_response

  # Build the final SearchVariablesResponse object
  response_metadata = ResponseMetadata(threshold_override=threshold_override,)
  final_response = SearchVariablesResponse(results=response_query_results,
                                           response_metadata=response_metadata)

  try:
    return final_response.model_dump_json(by_alias=True)
  except Exception as e:
    flask.abort(500, f"Response validation failed: {e}")
