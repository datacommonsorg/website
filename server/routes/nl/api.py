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
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

import flask
from flask import Blueprint, request
from pydantic import BaseModel, Field

from server.services import datacommons as dc

bp = Blueprint("nl_api", __name__, url_prefix="/api/nl")


class IndexInfo(BaseModel):
    model_threshold: float = Field(alias="modelThreshold")


class ResponseMetadata(BaseModel):
    index_info: Dict[str, IndexInfo] = Field(alias="indexInfo", default_factory=dict)
    threshold_override: Optional[float] = Field(alias="thresholdOverride", default=None)


class SentenceScore(BaseModel):
    sentence: str
    score: float


class StatVarResult(BaseModel):
    dcid: str
    name: Optional[str] = None
    description: Optional[str] = None
    scores: List[SentenceScore]


class SearchVariablesResponse(BaseModel):
    results: Dict[str, Dict[str, List[StatVarResult]]] = Field(
        alias="queryResults",
        description="A dictionary where the key is the search string and the value is a dictionary from index name to a list of StatVarResult.",
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

    return dc.nl_search_vars(
        queries, idx.split(","), skip_topics=request.args.get("skip_topics", "")
    )


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
    # `max_candidates_per_index` is an optional int that limits candidates from each index.
    max_candidates_per_index = request.args.get("max_candidates_per_index", type=int)
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
    # For holding all SVs to perform place filtering.
    all_sv_dcids = set()

    def search_for_index(index):
        return index, dc.nl_search_vars(queries, [index], skip_topics=skip_topics_arg)

    with ThreadPoolExecutor() as executor:
        results = executor.map(search_for_index, indices_to_run)

    for index, nl_result in results:
        if not nl_result or "queryResults" not in nl_result:
            continue

        model_threshold = nl_result.get("scoreThreshold")
        if model_threshold is not None:
            index_info[index] = IndexInfo(model_threshold=model_threshold)

        for query, q_result in nl_result.get("queryResults", {}).items():
            query_results_by_index.setdefault(query, {})[index] = q_result
            all_sv_dcids.update(q_result.get("SV", []))

    # TODO: filter by threshold(s) first, then filter by place

    # Filter by place if place_dcids are provided
    filtered_sv_dcids = all_sv_dcids
    if place_dcids and all_sv_dcids:
        # Filter stat vars by place
        filtered_result = dc.filter_statvars(list(all_sv_dcids), place_dcids)
        filtered_sv_dcids = {sv["dcid"] for sv in filtered_result.get("statVars", [])}

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
            ranked_svs = q_result.get("SV", [])

            for sv_dcid in ranked_svs:
                if sv_dcid not in filtered_sv_dcids:
                    continue

                sentences_data = sv_sentences_map.get(sv_dcid, [])
                if not sentences_data:
                    continue

                # Filter sentences by threshold
                filtered_sentences = []
                threshold_to_use = threshold_override
                if threshold_to_use is None and index in index_info:
                    threshold_to_use = index_info[index].model_threshold

                for s in sentences_data:
                    if threshold_to_use is None or s["score"] >= threshold_to_use:
                        filtered_sentences.append(SentenceScore(**s))

                if not filtered_sentences:
                    continue

                filtered_sentences.sort(key=lambda s: s.score, reverse=True)

                info = sv_info_map.get(sv_dcid, {})
                sv_results_for_index.append(
                    StatVarResult(
                        dcid=sv_dcid,
                        name=info.get("name"),
                        description=info.get("description"),
                        scores=filtered_sentences,
                    )
                )

            if max_candidates_per_index:
                sv_results_for_index = sv_results_for_index[:max_candidates_per_index]

            if sv_results_for_index:
                response_query_results[query][index] = sv_results_for_index

    # Build the final SearchVariablesResponse object
    response_metadata = ResponseMetadata(
        index_info=index_info,
        threshold_override=threshold_override,
    )
    final_response = SearchVariablesResponse(
        results=response_query_results, response_metadata=response_metadata
    )

    try:
        return final_response.model_dump_json(by_alias=True)
    except Exception as e:
        flask.abort(500, f"Response validation failed: {e}")
