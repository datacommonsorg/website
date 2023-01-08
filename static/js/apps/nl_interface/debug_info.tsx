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

export const BUILD_OPTIONS = [
  {
    value: "combined_all",
    text: "---- Choose an Embeddings Build option (default: Combined All) -------",
  },
  { value: "demographics300", text: "Demographics only (300 SVs)" },
  {
    value: "demographics300-withpalmalternatives",
    text: "Demographics only (300 SVs) with PaLM Alternatives",
  },
  // { value: "uncurated3000", text: "Uncurated 3000 SVs" },
  { value: "curatedJan2022", text: "Curated 3.5k+ SVs (Jan2022)" },
  { value: "combined_all", text: "Combined All of the Above (Default)" },
];

const matchScoresElement = (svScores: SVScores): JSX.Element => {
  const svs = Object.values(svScores.SV);
  const scores = Object.values(svScores.CosineScore);
  return (
    <div id="sv-scores-list">
      <table>
        <thead>
          <tr>
            <th>SV</th>
            <th>Cosine Score [0, 1]</th>
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
  selectedBuild: string;
  setSelectedBuild: (string) => void;
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
    embeddingsBuild: props.debugData["embeddings_build"],
    rankingClassification: props.debugData["ranking_classification"],
    temporalClassification: props.debugData["temporal_classification"],
    containedInClassification: props.debugData["contained_in_classification"],
  };

  const handleEmbeddingsBuildChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const build = event.target.value;
    props.setSelectedBuild(build);
  };

  const toggleShowDebug = () => {
    setShowDebug(!showDebug);
  };

  return (
    <>
      {!showDebug && (
        <a className="debug-info-toggle show" onClick={toggleShowDebug}>
          Show debug info
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
            <label>Embeddings build:</label>
          </Row>
          <div className="embeddings-build-options">
            <select
              value={props.selectedBuild}
              onChange={handleEmbeddingsBuildChange}
            >
              {BUILD_OPTIONS.map((option, idx) => (
                <option key={idx} value={option.value}>
                  {option.text}
                </option>
              ))}
            </select>
          </div>
          <Row>
            <b>Execution Status: </b> {debugInfo.status}
          </Row>
          <Row>
            <b>Embeddings Build: </b> {debugInfo.embeddingsBuild}
          </Row>
          <Row>
            <b>Original Query: </b> {debugInfo.originalQuery}
          </Row>
          <Row>
            <b>Query used for SV detection: </b>
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
              Temporal classification: {debugInfo.temporalClassification}
            </Col>
          </Row>
          <Row>
            <Col>
              ContainedIn classification: {debugInfo.containedInClassification}
            </Col>
          </Row>
          <Row>
            <b>SVs Matched (with scores):</b>
          </Row>
          {matchScoresElement(debugInfo.svScores)}
        </div>
      )}
    </>
  );
}
