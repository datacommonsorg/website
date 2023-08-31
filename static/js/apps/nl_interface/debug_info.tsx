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
import React, { useState } from "react";
import { Col, Row } from "reactstrap";

import {
  DebugInfo,
  MultiSVCandidate,
  QueryResult,
  SVScores,
} from "../../types/app/nl_interface_types";

const svToSentences = (
  svScores: SVScores,
  svSentences: Map<string, Array<string>>
): JSX.Element => {
  const svs = Object.values(svScores.SV);
  return (
    <div id="sv-sentences-list">
      <table>
        <thead>
          <tr>
            <th>SV_DCID</th>
            <th>Sentences</th>
          </tr>
        </thead>
        <tbody>
          {svs.length === Object.keys(svSentences).length &&
            svs.map((sv) => {
              return (
                <tr key={sv}>
                  <td>{sv}</td>
                  <td>
                    <ul>
                      {svSentences[sv].map((sentence) => {
                        return <li key={sentence}>{sentence}</li>;
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

const monoVarScoresElement = (svScores: SVScores): JSX.Element => {
  const svs = Object.values(svScores.SV);
  const scores = Object.values(svScores.CosineScore);
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
          {svs.length === scores.length &&
            svs.map((sv, i) => {
              return (
                <tr key={i}>
                  <td>{sv}</td>
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
  const hideDebug =
    document.getElementById("metadata").dataset.hideDebug === "True";
  if (_.isEmpty(props.debugData) || hideDebug) {
    return <></>;
  }
  const [showDebug, setShowDebug] = useState(false);

  const debugInfo = {
    status: props.debugData["status"],
    originalQuery: props.debugData["original_query"],
    detectionType: props.debugData["detection_type"],
    placeDetectionType: props.debugData["place_detection_type"],
    placesDetected: props.debugData["places_detected"],
    placesResolved: props.debugData["places_resolved"],
    mainPlaceDCID: props.debugData["main_place_dcid"],
    mainPlaceName: props.debugData["main_place_name"],
    queryWithoutPlaces: props.debugData["query_with_places_removed"],
    queryDetectionDebugLogs: props.debugData["query_detection_debug_logs"],
    svScores: props.debugData["sv_matching"],
    svSentences: props.debugData["svs_to_sentences"],
    rankingClassification: props.debugData["ranking_classification"],
    overviewClassification: props.debugData["overview_classification"],
    superlativeClassification: props.debugData["superlative_classification"],
    timeDeltaClassification: props.debugData["time_delta_classification"],
    comparisonClassification: props.debugData["comparison_classification"],
    containedInClassification: props.debugData["contained_in_classification"],
    correlationClassification: props.debugData["correlation_classification"],
    eventClassification: props.debugData["event_classification"],
    quantityClassification: props.debugData["quantity_classification"],
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
            <b>Execution Status: </b> {debugInfo.status}
          </Row>
          <Row>
            <b>Detection Type: </b> {debugInfo.detectionType}
          </Row>
          <Row>
            <b>Place Detection Type: </b>{" "}
            {debugInfo.placeDetectionType.toUpperCase()}
          </Row>
          <Row>
            <b>Original Query: </b> {debugInfo.originalQuery}
          </Row>
          <Row>
            <b>Query used for variable detection: </b>
            {debugInfo.queryWithoutPlaces}
          </Row>
          <Row>
            <b>Place Detection:</b>
          </Row>
          <Row>
            <Col>Places Detected: {debugInfo.placesDetected.join(", ")}</Col>
          </Row>
          <Row>
            <Col>Places Resolved: {debugInfo.placesResolved}</Col>
          </Row>
          <Row>
            <Col>
              Main Place: {debugInfo.mainPlaceName} (dcid:{" "}
              {debugInfo.mainPlaceDCID})
            </Col>
          </Row>
          <Row>
            <b>Query Type Detection:</b>
          </Row>
          <Row>
            <Col>Ranking classification: {debugInfo.rankingClassification}</Col>
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
            <Col>
              Overview classification: {debugInfo.overviewClassification}
            </Col>
          </Row>
          <Row>
            <Col>
              Quantity classification: {debugInfo.quantityClassification}
            </Col>
          </Row>
          <Row>
            <b>Single Variables Matches:</b>
          </Row>
          <Row>Note: Variables with scores less than 0.5 are not used.</Row>
          <Row>
            <Col>{monoVarScoresElement(debugInfo.svScores)}</Col>
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
              {svToSentences(debugInfo.svScores, debugInfo.svSentences)}
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
                Place Fallback: &quot;{props.queryResult.placeFallback.origStr}
                &quot; to &quot;{props.queryResult.placeFallback.newStr}&quot;
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
        </div>
      )}
    </>
  );
}
