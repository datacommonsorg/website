/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Debug info for a single query for the NL interface
 */

import _ from "lodash";
import queryString from "query-string";
import React, { useState } from "react";
import { Col, Row } from "reactstrap";

import {
  DebugInfo,
  MultiSVCandidate,
  QueryResult,
  SentenceScore,
  SVScores,
} from "../../types/app/explore_types";

const DEBUG_PARAM = "dbg";

const svToSentences = (
  variables: string[],
  varSentences: Map<string, Array<SentenceScore>>
): JSX.Element => {
  return (
    <div id="sv-sentences-list">
      <table>
        <thead>
          <tr>
            <th>Variable DCID</th>
            <th>Sentences</th>
          </tr>
        </thead>
        <tbody>
          {variables.length === Object.keys(varSentences).length &&
            variables.map((variable) => {
              return (
                <tr key={variable}>
                  <td>{variable}</td>
                  <td>
                    <ul>
                      {varSentences[variable].map((sentence) => {
                        return (
                          <li key={sentence.score + sentence.sentence}>
                            {sentence.sentence} (cosine:
                            {sentence.score.toFixed(4)}
                            {sentence.rerank_score
                              ? " - rerank:" + sentence.rerank_score.toFixed(4)
                              : ""}
                            )
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

const monoVarScoresElement = (
  variables: string[],
  scores: string[]
): JSX.Element => {
  return (
    <div id="sv-scores-list">
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Cosine Score (Best/Max) [0, 1]</th>
          </tr>
        </thead>
        <tbody>
          {variables.length === scores.length &&
            variables.map((variable, i) => {
              return (
                <tr key={i}>
                  <td>{variable}</td>
                  <td>{scores[i]}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

const multiVarPartsElement = (c: MultiSVCandidate): JSX.Element => {
  return (
    <ul>
      {c.Parts.map((p) => {
        return (
          <li key={p.QueryPart}>
            [{p.QueryPart}]
            <ul>
              {p.SV.length === p.CosineScore.length &&
                p.SV.map((sv, i) => {
                  return (
                    <li key={i}>
                      {sv} ({p.CosineScore[i]})
                    </li>
                  );
                })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
};

const multiVarScoresElement = (svScores: SVScores): JSX.Element => {
  const monovarScores = Object.values(svScores.CosineScore);
  const maxMonovarScore = monovarScores.length > 0 ? monovarScores[0] : 0;
  const candidates = svScores.MultiSV.Candidates;
  return (
    <div id="multi-sv-scores-list">
      <table>
        <thead>
          <tr>
            <th>Number of Vars</th>
            <th>Avg Cosine Score</th>
            <th>Vars for query parts</th>
          </tr>
        </thead>
        <tbody>
          {candidates &&
            candidates.length > 0 &&
            candidates.map((c, i) => {
              return (
                <tr key={i}>
                  <td>
                    {c.Parts.length} {c.DelimBased ? " (delim)" : ""}
                  </td>
                  <td>
                    {c.AggCosineScore}{" "}
                    {c.AggCosineScore > maxMonovarScore
                      ? " (> best single var)"
                      : ""}
                  </td>
                  <td>{multiVarPartsElement(c)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export interface DebugInfoProps {
  debugData: any; // from the server response
  queryResult: QueryResult;
}

export function DebugInfo(props: DebugInfoProps): JSX.Element {
  const debugParam = queryString.parse(window.location.hash)[DEBUG_PARAM];
  const hideDebug =
    document.getElementById("metadata").dataset.hideDebug === "True" &&
    !debugParam;
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  if (_.isEmpty(props.debugData) || hideDebug) {
    return <></>;
  }

  const debugInfo = {
    status: props.debugData["status"],
    blocked: props.debugData["blocked"] || false,
    originalQuery: props.debugData["original_query"],
    detectionType: props.debugData["detection_type"],
    placeDetectionType: props.debugData["place_detection_type"],
    placesDetected: props.debugData["places_detected"],
    placesResolved: props.debugData["places_resolved"],
    entitiesDetected: props.debugData["entities_detected"] || [],
    entitiesResolved: props.debugData["entities_resolved"] || [],
    mainPlaceDCID: props.debugData["main_place_dcid"],
    mainPlaceName: props.debugData["main_place_name"],
    queryIndexTypes: props.debugData["query_index_types"],
    queryWithoutPlaces: props.debugData["query_with_places_removed"],
    queryWithoutStopWords: props.debugData["query_with_stop_words_removal"],
    queryDetectionDebugLogs: props.debugData["query_detection_debug_logs"],
    svScores: props.debugData["sv_matching"] || {},
    svSentences: props.debugData["svs_to_sentences"],
    propScores: props.debugData["props_matching"] || {},
    propSentences: props.debugData["props_to_sentences"],
    rankingClassification: props.debugData["ranking_classification"],
    generalClassification: props.debugData["general_classification"],
    superlativeClassification: props.debugData["superlative_classification"],
    timeDeltaClassification: props.debugData["time_delta_classification"],
    comparisonClassification: props.debugData["comparison_classification"],
    containedInClassification: props.debugData["contained_in_classification"],
    correlationClassification: props.debugData["correlation_classification"],
    eventClassification: props.debugData["event_classification"],
    quantityClassification: props.debugData["quantity_classification"],
    dateClassification: props.debugData["date_classification"],
    counters: props.debugData["counters"],
  };

  const toggleShowDebug = () => {
    setShowDebug(!showDebug);
  };

  return (
    <>
      {!showDebug && (
        <a className="debug-info-toggle show" onClick={toggleShowDebug}>
          <span className="material-icons">bug_report</span>
        </a>
      )}
      {showDebug && (
        <div className="nl-query-result-debug-info">
          <a className="debug-info-toggle hide" onClick={toggleShowDebug}>
            X
          </a>
          <Row>
            <b>DEBUGGING OPTIONS/INFO: </b>
            <br></br>
          </Row>
          <Row>
            <b>Execution Status: </b>{" "}
            <span className="highlight">{debugInfo.status}</span>
          </Row>
          <Row>
            <b>Detection Type: </b>
            <span className="highlight">{debugInfo.detectionType}</span>
          </Row>
          <Row>
            <b>Place Detection Type: </b>{" "}
            <span className="highlight">
              {debugInfo.placeDetectionType.toUpperCase()}
            </span>
          </Row>
          <Row>
            <b>Original Query: </b>
            <span className="highlight">{debugInfo.originalQuery}</span>
          </Row>
          <Row>
            <b>Blocked:</b>{" "}
            <span className="highlight">{debugInfo.blocked.toString()}</span>
          </Row>
          <Row>
            <b>Query index types: </b>
            <span className="highlight">
              {debugInfo.queryIndexTypes.join(", ")}
            </span>
          </Row>
          <Row>
            <b>Query without places: </b>
            <span className="highlight">{debugInfo.queryWithoutPlaces}</span>
          </Row>
          <Row>
            <b>Query without stop words: </b>
            <span className="highlight">
              {debugInfo.queryWithoutStopWords || ""}
            </span>
          </Row>
          <Row>
            <b>Place Detection:</b>
          </Row>
          <Row>
            <Col>
              Places Detected:{" "}
              <span className="highlight">
                {" "}
                {debugInfo.placesDetected
                  ? debugInfo.placesDetected.join(", ")
                  : ""}
              </span>
            </Col>
          </Row>
          <Row>
            <Col>
              Places Resolved:
              <span className="highlight">{debugInfo.placesResolved}</span>
            </Col>
          </Row>
          <Row>
            <Col>
              Main Place:
              <span className="highlight">
                {debugInfo.mainPlaceName} (dcid: {debugInfo.mainPlaceDCID})
              </span>
            </Col>
          </Row>
          <Row>
            <b>Entity Detection:</b>
          </Row>
          <Row>
            <Col>
              Entities Detected: {debugInfo.entitiesDetected.join(", ")}
            </Col>
          </Row>
          <Row>
            <Col>
              Entities Resolved:{" "}
              <span className="highlight">{debugInfo.entitiesResolved}</span>
            </Col>
          </Row>
          <Row>
            <b>Query Type Detection:</b>
          </Row>
          <Row>
            <Col>Ranking classification: </Col>
          </Row>
          <Row>
            <Col>
              Superlative type classification:{" "}
              {debugInfo.superlativeClassification}
            </Col>
          </Row>
          <Row>
            <Col>
              TimeDelta classification: {debugInfo.timeDeltaClassification}
            </Col>
          </Row>
          <Row>
            <Col>
              Comparison classification: {debugInfo.comparisonClassification}
            </Col>
          </Row>
          <Row>
            <Col>
              ContainedIn classification: {debugInfo.containedInClassification}
            </Col>
          </Row>
          <Row>
            <Col>
              Correlation classification: {debugInfo.correlationClassification}
            </Col>
          </Row>
          <Row>
            <Col>Event classification: {debugInfo.eventClassification}</Col>
          </Row>
          <Row>
            <Col>General classification: {debugInfo.generalClassification}</Col>
          </Row>
          <Row>
            <Col>
              Quantity classification: {debugInfo.quantityClassification}
            </Col>
          </Row>
          <Row>
            <Col>Date classification: {debugInfo.dateClassification}</Col>
          </Row>
          <Row>
            <b>Single Variables Matches:</b>
          </Row>
          <Row>
            Note: Variables with scores less than model threshold are not used.
          </Row>
          <Row>
            <Col>
              {monoVarScoresElement(
                Object.values(debugInfo.svScores.SV || {}),
                Object.values(debugInfo.svScores.CosineScore || {})
              )}
            </Col>
          </Row>
          <Row>
            <b>Multi-Variable Matches:</b>
          </Row>
          <Row>
            <Col>{multiVarScoresElement(debugInfo.svScores)}</Col>
          </Row>
          <Row>
            <b>Variable Sentences Matched:</b>
          </Row>
          <Row>
            <Col>
              {svToSentences(
                Object.values(debugInfo.svScores.SV || {}),
                debugInfo.svSentences
              )}
            </Col>
          </Row>
          <Row>
            <b>Property Matches:</b>
          </Row>
          <Row>Note: Properties with scores less than 0.5 are not used.</Row>
          <Row>
            <Col>
              {monoVarScoresElement(
                Object.values(debugInfo.propScores.PROP || {}),
                Object.values(debugInfo.propScores.CosineScore || {})
              )}
            </Col>
          </Row>
          <Row>
            <b>Property Sentences Matched:</b>
          </Row>
          <Row>
            <Col>
              {svToSentences(
                Object.values(debugInfo.propScores.PROP || {}),
                debugInfo.propSentences
              )}
            </Col>
          </Row>
          <Row>
            <b>Query Detection:</b>
          </Row>
          <Row>
            <Col>
              <pre>
                {JSON.stringify(debugInfo.queryDetectionDebugLogs, null, 2)}
              </pre>
            </Col>
          </Row>
          <Row>
            <b
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{ cursor: "pointer" }}
            >
              <h3>SHOW MORE: {isCollapsed ? "[+]" : "[-]"}</h3>
            </b>
          </Row>
          {!isCollapsed && (
            <>
              <Row>
                <b>Query Fulfillment:</b>
              </Row>
              {props.queryResult && (
                <Row>
                  <Col>
                    Place Query Source: {props.queryResult.placeSource}
                    {props.queryResult.pastSourceContext
                      ? "(" + props.queryResult.pastSourceContext + ")"
                      : ""}
                  </Col>
                </Row>
              )}
              {props.queryResult && (
                <Row>
                  <Col>Variable Query Source: {props.queryResult.svSource}</Col>
                </Row>
              )}
              {props.queryResult && props.queryResult.placeFallback && (
                <Row>
                  <Col>
                    Place Fallback: &quot;
                    {props.queryResult.placeFallback.origStr}
                    &quot; to &quot;{props.queryResult.placeFallback.newStr}
                    &quot;
                  </Col>
                </Row>
              )}
              <Row>
                <Col>
                  <b>Counters:</b>
                  <pre>{JSON.stringify(debugInfo.counters, null, 2)}</pre>
                </Col>
              </Row>
              <Row>
                <b>Page Config:</b>
              </Row>
              <Row>
                <Col>
                  <pre>
                    {JSON.stringify(
                      props.queryResult ? props.queryResult.config : null,
                      null,
                      2
                    )}
                  </pre>
                </Col>
              </Row>
            </>
          )}
        </div>
      )}
    </>
  );
}
