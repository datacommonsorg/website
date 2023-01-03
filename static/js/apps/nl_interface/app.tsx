/**
 * Copyright 2022 Google LLC
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
 * Main component for NL interface.
 */

import axios from "axios";
import React, { useEffect, useState } from "react";
import { Col, Container, Row } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { TextSearchBar } from "../../components/text_search_bar";
import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

interface SearchResult {
  place: NamedTypedPlace;
  config: SubjectPageConfig;
}

interface SVScores {
  SV: Map<number, string>;
  CosineScore: Map<number, number>;
}

interface DebugInfo {
  status: string;
  originalQuery: string;
  placesDetected: Array<string>;
  mainPlaceDCID: string;
  mainPlaceName: string;
  queryWithoutPlaces: string;
  svScores: SVScores;
  embeddingsBuild: string;
  rankingClassification: string;
  temporalClassification: string;
  containedInClassification: string;
}

const buildOptions = [
  {
    value: "combined_all",
    text: "---- Choose an Embeddings Build option (default: Combined All) -------",
  },
  { value: "demographics300", text: "Demographics only (300 SVs)" },
  {
    value: "demographics300-withpalmalternatives",
    text: "Demographics only (300 SVs) with PaLM Alternatives",
  },
  { value: "uncurated3000", text: "Uncurated 3000 SVs" },
  { value: "combined_all", text: "Combined All of the Above (Default)" },
];

export function App(): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [urlParams, setUrlParams] = useState<string>();
  const [searchText, setSearchText] = useState<string>();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | undefined>();
  const [selectedBuild, setSelectedBuild] = useState(buildOptions[0].value);
  const showDebugInfo = true;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParams = params.toString();
    if (urlParams.length > 0) {
      setSearchText(params.get("q"));
      fetchData(urlParams);
    }
  }, [urlParams]);

  function fetchData(urlParams: string): void {
    setLoading(true);
    setUrlParams(urlParams);
    axios.get(`/nl/data?${urlParams}`).then((resp) => {
      if (
        resp.data["context"] === undefined ||
        resp.data["config"] === undefined
      ) {
        setLoading(false);
        return;
      }
      const context = resp.data["context"];
      setChartsData({
        place: {
          types: [context["place_type"]],
          name: context["place_name"],
          dcid: context["place_dcid"],
        },
        config: resp.data["config"],
      });
      if (context["debug"] === undefined) {
        setLoading(false);
        return;
      }
      const debugData = context["debug"];
      setDebugInfo({
        status: debugData["status"],
        originalQuery: debugData["original_query"],
        placesDetected: debugData["places_detected"],
        mainPlaceDCID: debugData["main_place_dcid"],
        mainPlaceName: debugData["main_place_name"],
        queryWithoutPlaces: debugData["query_with_places_removed"],
        svScores: debugData["sv_matching"],
        embeddingsBuild: debugData["embeddings_build"],
        rankingClassification: debugData["ranking_classification"],
        temporalClassification: debugData["temporal_classification"],
        containedInClassification: debugData["contained_in_classification"],
      });
      setSelectedBuild(debugData["embeddings_build"]);
      setLoading(false);
    });
  }

  function displaySVMatchScores(svScores: SVScores) {
    const svs = new Array<string>();
    Object.keys(svScores.SV).forEach((key) => {
      svs.push(svScores.SV[key]);
    });

    const scores = new Array<number>();
    Object.keys(svScores.CosineScore).forEach((key) => {
      scores.push(svScores.CosineScore[key]);
    });
    let table = '<table border="1">';
    table += `<tr><th>SV</th><th>Cosine Score [0, 1]</th></tr>`;
    if (svs.length == scores.length) {
      for (let i = 0; i < svs.length; i++) {
        table = table + `<tr>`;
        table = table + `<td>${svs[i]}</td>`;
        table = table + `<td>${scores[i]}</td>`;
      }
    }
    table += "</table>";
    document.getElementById("sv-scores-list").innerHTML = table;
  }

  function handleEmbeddingsBuildChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setSelectedBuild(event.target.value);
  }

  return (
    <div id="dc-nl-interface">
      <Container fluid={true}>
        <Row>
          <div className="place-options-card">
            <Container className="place-options" fluid={true}>
              <div className="place-options-section">
                <TextSearchBar
                  onSearch={(q) => {
                    history.pushState(
                      {},
                      null,
                      `/nl?q=${q}&build=${selectedBuild}`
                    );
                    fetchData(`q=${q}`);
                  }}
                  initialValue={searchText}
                  placeholder='For example "family earnings in california"'
                />
              </div>
            </Container>
          </div>
        </Row>
        {showDebugInfo && (
          <>
            <Row>
              <b>DEBUGGING OPTIONS/INFO: </b>
              <br></br>
            </Row>
            <Row>
              <label>Embeddings build:</label>
            </Row>
            <div id="embeddings-build-options">
              <select
                value={selectedBuild}
                onChange={handleEmbeddingsBuildChange}
              >
                {buildOptions.map((option, idx) => (
                  <option key={idx} value={option.value}>
                    {option.text}
                  </option>
                ))}
              </select>
            </div>
            {debugInfo && (
              <>
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
                  <Col>
                    Places Detected: {debugInfo.placesDetected.join(", ")}
                  </Col>
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
                  <Col>
                    Ranking classification: {debugInfo.rankingClassification}
                  </Col>
                </Row>
                <Row>
                  <Col>
                    Temporal classification: {debugInfo.temporalClassification}
                  </Col>
                </Row>
                <Row>
                  <Col>
                    ContainedIn classification:{" "}
                    {debugInfo.containedInClassification}
                  </Col>
                </Row>

                <Row>
                  <b>SVs Matched (with scores):</b>
                  {displaySVMatchScores(debugInfo.svScores)}
                </Row>
              </>
            )}
          </>
        )}
        <div id="sv-scores-list"></div>
        {chartsData && chartsData.config && (
          <Row>
            <SubjectPageMainPane
              place={chartsData.place}
              pageConfig={chartsData.config}
            />
          </Row>
        )}
        <div id="screen" style={{ display: loading ? "block" : "none" }}>
          <div id="spinner"></div>
        </div>
      </Container>
    </div>
  );
}
