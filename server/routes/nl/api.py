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
from flask import Response
from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from server.services import datacommons as dc

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')

# Constants for request parameters
PARAM_QUERIES = "queries"
PARAM_INDEX = "index"
PARAM_THRESHOLD = "threshold"
PARAM_LIMIT_PER_INDEX = "limit_per_index"
PARAM_INCLUDE_TYPES = "include_types"
TYPE_TOPIC = "Topic"

# Type alias for a DCID string
Dcid = str


class IndicatorScore(BaseModel):
  dcid: str
  score: float


# Type alias for the nested dictionary: {query: {index: [(dcid, score), ...]}}
TruncatedResults = dict[str, dict[str, list[IndicatorScore]]]


class SearchIndicatorsRequest(BaseModel):
  """A dataclass to hold all parsed request arguments for a search."""
  queries: list[str]
  indices: list[str]
  threshold_override: float | None = None
  limit_per_index: int | None = None
  include_types: list[str]
  skip_topics: bool


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
                        by_dcid: bool = False) -> str | None:
  """Safely extracts a property value from a v2/node response item."""
  prop_arcs = sv_data.get("arcs", {})
  prop_nodes = prop_arcs.get(prop, {}).get("nodes", [])

  selector = "dcid" if by_dcid else "value"
  return prop_nodes[0].get(selector) if prop_nodes else None


def _filter_and_truncate_results(
    queries: list[str], indices: list[str],
    nl_results_by_index: dict[str, dict], threshold_by_index: dict[str, float],
    limit_per_index: int | None) -> tuple[TruncatedResults, set[Dcid]]:
  """Filters NL search results by score, truncates, and collects unique DCIDs.

  This function processes the raw results from the NL server, applies score
  thresholding and optional limits, and prepares two key outputs for subsequent
  processing steps.

  Returns:
      A tuple containing:
      1.  A `TruncatedResults` dictionary, which has the following structure:
          {
              "query1": {
                  "index1": [("dcid_A", 0.95), ("dcid_B", 0.92)],
                  "index2": [("dcid_C", 0.88)]
              },
              "query2": { ... }
          }
      2.  A set of all unique DCIDs that passed the filtering, to be used for
          metadata enrichment.
  """
  all_dcids_to_enrich: set[str] = set()
  truncated_results: TruncatedResults = {}

  for query in queries:
    truncated_results[query] = {}
    for index in indices:
      nl_result = nl_results_by_index.get(index)
      if not nl_result or "queryResults" not in nl_result or query not in nl_result.get(
          "queryResults", {}):
        continue

      truncated_results[query][index] = []
      threshold = threshold_by_index.get(index, 0.0)

      query_nl_result = nl_result["queryResults"][query]
      ranked_indicators = zip(query_nl_result.get("SV", []),
                              query_nl_result.get("CosineScore", []))

      for dcid, score in ranked_indicators:
        # Filter by score.
        if score < threshold:
          continue

        # If we are here, the indicator is a candidate.
        all_dcids_to_enrich.add(dcid)
        truncated_results[query][index].append(
            IndicatorScore(dcid=dcid, score=score))

        # Stop if we've reached the per-index limit.
        if limit_per_index and len(
            truncated_results[query][index]) >= limit_per_index:
          break

  return truncated_results, all_dcids_to_enrich


def _get_indicator_metadata(dcids: set[str]) -> dict[str, dict]:
  """Gets name, description, and typeOf for a set of indicator DCIDs."""
  if not dcids:
    return {}

  indicator_info_map = {}
  sv_info_data = dc.v2node(list(dcids), "->[name,description,typeOf]")
  for dcid, sv_data in sv_info_data.get("data", {}).items():
    indicator_info_map[dcid] = {
        "name": _get_property_value(sv_data, "name"),
        "description": _get_property_value(sv_data, "description"),
        "type_of": _get_property_value(sv_data, "typeOf", by_dcid=True)
    }
  return indicator_info_map


def _build_final_response(queries: list[str], indices: list[str],
                          nl_results_by_index: dict[str, dict],
                          threshold_by_index: dict[str, float],
                          truncated_results: TruncatedResults,
                          indicator_info_map: dict[str, dict],
                          response_metadata: ResponseMetadata,
                          include_types: list[str]) -> SearchVariablesResponse:
  """Builds the final JSON response from processed search and enrichment data."""
  query_results = []
  for query in queries:
    index_results = []
    for index in indices:
      candidates = []
      nl_result = nl_results_by_index.get(index, {})
      if not nl_result:
        index_results.append(
            IndexResult(index=index, default_threshold=None,
                        results=candidates))
        continue

      sv_to_sentences = nl_result.get("queryResults",
                                      {}).get(query,
                                              {}).get("SV_to_Sentences", {})
      threshold = threshold_by_index.get(index, 0.0)

      for indicator in truncated_results.get(query, {}).get(index, []):
        sv_info = indicator_info_map.get(indicator.dcid, {})
        sentences = [
            s['sentence']
            for s in sv_to_sentences.get(indicator.dcid, [])
            if s['score'] >= threshold
        ]
        if include_types and sv_info.get("type_of") not in include_types:
          continue

        candidates.append(
            Indicator(dcid=indicator.dcid,
                      name=sv_info.get("name"),
                      description=sv_info.get("description"),
                      type_of=sv_info.get("type_of"),
                      score=indicator.score,
                      search_descriptions=sentences))

      index_results.append(
          IndexResult(index=index,
                      default_threshold=nl_result.get("scoreThreshold"),
                      results=candidates))

    query_results.append(QueryResult(query=query, results=index_results))

  final_response = SearchVariablesResponse(results=query_results,
                                           response_metadata=response_metadata)
  return final_response


def _parse_request_args() -> SearchIndicatorsRequest:
  """Parses and validates all query string arguments for the search."""
  queries = request.args.getlist(PARAM_QUERIES)
  if not queries:
    flask.abort(400, f"`{PARAM_QUERIES}` is a required parameter")

  threshold_override = None
  if PARAM_THRESHOLD in request.args:
    try:
      threshold_override = float(request.args[PARAM_THRESHOLD])
    except ValueError:
      flask.abort(400,
                  f"The `{PARAM_THRESHOLD}` parameter must be a valid float.")

  limit_per_index = None
  if PARAM_LIMIT_PER_INDEX in request.args:
    try:
      limit_per_index = int(request.args[PARAM_LIMIT_PER_INDEX])
    except ValueError:
      flask.abort(
          400,
          f"The `{PARAM_LIMIT_PER_INDEX}` parameter must be a valid integer.")

  indices = request.args.getlist(PARAM_INDEX)
  if not indices:
    server_config = dc.nl_server_config()
    indices = server_config.get("default_indexes", [])

  include_types = request.args.getlist(PARAM_INCLUDE_TYPES)
  skip_topics = False
  if include_types and TYPE_TOPIC not in include_types:
    skip_topics = True

  return SearchIndicatorsRequest(queries=queries,
                                 indices=indices,
                                 threshold_override=threshold_override,
                                 limit_per_index=limit_per_index,
                                 include_types=include_types,
                                 skip_topics=skip_topics)


@bp.route("/search-indicators", methods=["GET"])
async def search_indicators():
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

    The final output is a list of `QueryResult` objects, one for each input
    query. Each `QueryResult` contains a list of `IndexResult` objects (one for
    each index searched), which in turn hold the filtered and ranked indicators.
    For each of these results, the `sentences` list will only contain the
    original matching sentences that also met or exceeded the acting threshold.

    Args (from query string):
        queries (str, repeated): The natural language queries to search for.
        index (str, repeated, optional): The embedding indices to query.
            Defaults to the server's default indices if not provided.
        threshold (float, optional): A score threshold to override the
            model's default for all indices.
        limit_per_index (int, optional): The max number of results
            to return per index.
        include_types (str, repeated, optional): A list of indicator types
            (e.g., "StatisticalVariable", "Topic") to include. If provided,
            only indicators of these types will be returned. If "Topic" is
            omitted, the search will be optimized to skip topic indices.

    Returns:
        A JSON response structured like the following example:
        {
          "queryResults": [
            {
              "query": "population of california",
              "indexResults": [
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
  req_args = _parse_request_args()

  response_metadata = ResponseMetadata(
      threshold_override=req_args.threshold_override)

  #
  # Step 1: Get search results from the NL server in parallel.
  #
  nl_results_by_index = await dc.nl_search_vars_in_parallel(
      req_args.queries, req_args.indices, skip_topics=req_args.skip_topics)

  # Pre-calculate the effective threshold for each index.
  threshold_by_index: dict[str, float] = {}
  for index in req_args.indices:
    if req_args.threshold_override is not None:
      threshold_by_index[index] = req_args.threshold_override
    else:
      threshold_by_index[index] = nl_results_by_index.get(index, {}).get(
          "scoreThreshold", 0.0)

  #
  # Step 2: Collect all candidate DCIDs that pass the threshold for enrichment.
  #
  truncated_results, all_dcids_to_enrich = _filter_and_truncate_results(
      req_args.queries, req_args.indices, nl_results_by_index,
      threshold_by_index, req_args.limit_per_index)

  #
  # Step 3: Enrich all the valid candidates with a single batch call.
  #
  indicator_info_map = _get_indicator_metadata(all_dcids_to_enrich)

  #
  # Step 4: Assemble the final response using the enriched data.
  #
  try:
    final_response_obj = _build_final_response(
        req_args.queries, req_args.indices, nl_results_by_index,
        threshold_by_index, truncated_results, indicator_info_map,
        response_metadata, req_args.include_types)
    resp = final_response_obj.model_dump_json(by_alias=True)
    return Response(resp, 200, mimetype='application/json')
  except Exception as e:
    # If there is a validation error, it's a 500 because the server
    # is producing an invalid response.
    flask.abort(500, f"Response validation failed: {e}")
