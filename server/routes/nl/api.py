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
  threshold_override: float | None = Field(alias="thresholdOverride",
                                           default=None)


class Indicator(ApiBaseModel):
  dcid: str
  name: str | None = None
  description: str | None = None
  # This is the discriminator field. It must be a string in the base model.
  type_of: str | None = Field(alias="typeOf", default=None)
  score: float
  search_descriptions: list[str] = Field(
      default_factory=list,
      description=
      "A list of matching sentences from the embeddings index that have a score greater than or equal to the acting threshold."
  )


class IndexResult(ApiBaseModel):
  index: str
  default_threshold: float | None = Field(alias="defaultThreshold")
  results: list[Indicator] = Field(default_factory=list)


class QueryResult(ApiBaseModel):
  query: str
  results: list[IndexResult] = Field(alias="indexResults", default_factory=list)


class SearchVariablesResponse(ApiBaseModel):
  results: list[QueryResult] = Field(
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


def _get_property_value(sv_data: dict,
                        prop: str,
                        *,
                        by_name: bool = False) -> str | None:
  """Safely extracts a property value from a v2/node response item."""
  prop_arcs = sv_data.get("arcs", {})
  prop_nodes = prop_arcs.get(prop, {}).get("nodes", [])

  selector = "name" if by_name else "value"
  return prop_nodes[0].get(selector) if prop_nodes else None


@bp.route("/search-indicators", methods=["GET"])
def search_indicators():
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
        limit_per_index (int, optional): The max number of results
            to return per index.
        skip_topics (bool, optional): Whether to skip topic-based indicators.

    Returns:
        A JSON response structured like the following example:
        {
          "queryResults": [
            {
              "query": "population of california",
              "indexes": [
                {
                  "index": "medium_ft",
                  "defaultThreshold": 0.75,
                  "results": [
                    {
                      "dcid": "Count_Person",
                      "name": "Person Count",
                      "description": "The total number of individuals...",
                      "typeOf": "StatisticalVariable",
                      "score": 0.95,
                      "search_descriptions": [
                        "population of",
                        "number of people"
                      ]
                    }
                  ]
                }
              ]
            }
          ],
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

  limit_per_index = None
  if "limit_per_index" in request.args:
    try:
      limit_per_index = int(request.args["limit_per_index"])
    except ValueError:
      flask.abort(400,
                  "The `limit_per_index` parameter must be a valid integer.")

  skip_topics = False
  include_types = request.args.getlist("include_types")
  if include_types and 'Topic' not in include_types:
    skip_topics = True

  # Step 1: Get search results from the NL server in parallel.
  #
  nl_results_by_index = dc.nl_search_vars_in_parallel(queries,
                                                      indices,
                                                      skip_topics=skip_topics)

  # Step 2: Collect all candidate DCIDs that pass the threshold for enrichment.
  all_dcids_to_enrich: set[str] = set()
  # This map stores the truncated list of (dcid, score) tuples for each query and index.
  truncated_results: dict[str, dict[str, list[tuple[str, float]]]] = {}
  for query in queries:
    truncated_results[query] = {}
    for index in indices:
      nl_result = nl_results_by_index.get(index)
      if not nl_result or "queryResults" not in nl_result or query not in nl_result[
          "queryResults"]:
        continue

      truncated_results[query][index] = []
      threshold = threshold_override if threshold_override else nl_result.get(
          "scoreThreshold", 0.0)

      ranked_indicators = zip(
          nl_result["queryResults"][query].get("SV", []),
          nl_result["queryResults"][query].get("CosineScore", []))
      for dcid, score in ranked_indicators:
        # Filter by score.
        if score < threshold:
          continue
        all_dcids_to_enrich.add(dcid)
        truncated_results[query][index].append((dcid, score))

        if limit_per_index and len(
            truncated_results[query][index]) >= limit_per_index:
          break

  # Step 3: Enrich all the valid candidates with a single batch call.
  sv_info_map = {}
  if all_dcids_to_enrich:
    sv_info_data = dc.v2node(list(all_dcids_to_enrich),
                             "->[name,description,typeOf]")
    for dcid, sv_data in sv_info_data.get("data", {}).items():
      sv_info_map[dcid] = {
          "name": _get_property_value(sv_data, "name"),
          "description": _get_property_value(sv_data, "description"),
          "type_of": _get_property_value(sv_data, "typeOf", by_name=True)
      }

  # Step 4: Assemble the final response using the enriched data.
  query_results = []
  for query in queries:
    index_results = []
    for index in indices:
      candidates = []
      nl_result = nl_results_by_index.get(index, {})
      if not nl_result:
        continue

      sv_to_sentences = nl_result.get("queryResults",
                                      {}).get(query,
                                              {}).get("SV_to_Sentences", {})
      threshold = threshold_override if threshold_override else nl_result.get(
          "scoreThreshold", 0.0)

      for dcid, score in truncated_results[query].get(index, []):
        sv_info = sv_info_map.get(dcid, {})
        sentences = [
            s['sentence']
            for s in sv_to_sentences.get(dcid, [])
            if s['score'] >= threshold
        ]
        if include_types and sv_info.get("type_of") not in include_types:
          continue

        candidates.append(
            Indicator(dcid=dcid,
                      name=sv_info.get("name"),
                      description=sv_info.get("description"),
                      type_of=sv_info.get("type_of"),
                      score=score,
                      search_descriptions=sentences))

      index_results.append(
          IndexResult(index=index,
                      default_threshold=nl_result.get("scoreThreshold"),
                      results=candidates))

    query_results.append(QueryResult(query=query, results=index_results))
  # Build the final SearchVariablesResponse object
  try:
    response_metadata = ResponseMetadata(threshold_override=threshold_override,)
    final_response = SearchVariablesResponse(
        results=query_results, response_metadata=response_metadata)
    return final_response.model_dump_json(by_alias=True)
  except Exception as e:
    # If there is a validation error, it's a 500 because the server
    # is producing an invalid response.
    flask.abort(500, f"Response validation failed: {e}")
