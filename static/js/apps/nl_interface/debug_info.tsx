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

import { DebugInfo, SVScores } from "../../types/app/nl_interface_types";

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

const matchScoresElement = (svScores: SVScores): JSX.Element => {
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
export interface DebugInfoProps {
  debugData: any; // from the server response
}

export function DebugInfo(props: DebugInfoProps): JSX.Element {
  const [showDebug, setShowDebug] = useState(false);

  if (_.isEmpty(props.debugData)) {
    return <></>;
  }

  const debugInfo = {
    status: props.debugData["status"],
    originalQuery: props.debugData["original_query"],
    placesDetected: props.debugData["places_detected"],
    mainPlaceDCID: props.debugData["main_place_dcid"],
    mainPlaceName: props.debugData["main_place_name"],
    queryWithoutPlaces: props.debugData["query_with_places_removed"],
    svScores: props.debugData["sv_matching"],
    svSentences: props.debugData["svs_to_sentences"],
    rankingClassification: props.debugData["ranking_classification"],
    overviewClassification: props.debugData["overview_classification"],
    sizeTypeClassification: props.debugData["size_type_classification"],
    timeDeltaClassification: props.debugData["time_delta_classification"],
    comparisonClassification: props.debugData["comparison_classification"],
    containedInClassification: props.debugData["contained_in_classification"],
    correlationClassification: props.debugData["correlation_classification"],
    eventClassification: props.debugData["event_classification"],
    counters: props.debugData["counters"],
    dataSpec: props.debugData["data_spec"],
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
            <Col>
              Main Place Inferred: {debugInfo.mainPlaceName} (dcid:{" "}
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
              Size Type (generic) classification:{" "}
              {debugInfo.sizeTypeClassification}
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
            <b>All Variables Matched (with scores):</b>
          </Row>
          <Row>Note: Variables with scores less than 0.5 are not used.</Row>
          <Row>
            <Col>{matchScoresElement(debugInfo.svScores)}</Col>
          </Row>
          <Row>
            <b>Variable Sentences Matched (with scores):</b>
          </Row>
          <Row>
            <Col>
              {svToSentences(debugInfo.svScores, debugInfo.svSentences)}
            </Col>
          </Row>
          <Row>
            <b>Debug Counters</b>
          </Row>
          <Row>
            <Col>
              <pre>{JSON.stringify(debugInfo.counters, null, 2)}</pre>
            </Col>
          </Row>
          <Row>
            <b>Utterances</b>
          </Row>
          <Row>
            <Col>
              <pre>{JSON.stringify(debugInfo.dataSpec, null, 2)}</pre>
            </Col>
          </Row>
        </div>
      )}
    </>
  );
}
