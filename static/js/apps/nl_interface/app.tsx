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
import { Container, Row } from "reactstrap";

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
  placeDCID: string;
  queryWithoutPlaces: string;
  svScores: SVScores;
}

export function App(): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [urlParams, setUrlParams] = useState<string>();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | undefined>();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramsStr = params.toString();
    if (paramsStr.length > 0) {
      fetchData(paramsStr);
    }
  }, [urlParams]);

  function fetchData(paramsStr: string): void {
    setLoading(true);
    setUrlParams(urlParams);
    axios.get(`/nl/data?${urlParams}`).then((resp) => {
      setChartsData({
        place: {
          types: [resp.data["place_type"]],
          name: resp.data["place_name"],
          dcid: resp.data["place_dcid"],
        },
        config: resp.data["config"],
      });
      setDebugInfo({
        status: resp.data["debug"]["status"],
        originalQuery: resp.data["debug"]["original_query"],
        placesDetected: resp.data["debug"]["places_detected"],
        placeDCID: resp.data["debug"]["place_dcid"],
        queryWithoutPlaces: resp.data["debug"]["query_with_places_removed"],
        svScores: resp.data["debug"]["sv_matching"],
      });
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

  return (
    <div id="dc-nl-interface">
      <Container fluid={true}>
        <Row>
          <div className="place-options-card">
            <Container className="place-options" fluid={true}>
              <div className="place-options-section">
                <TextSearchBar
                  onSearch={(q) => {
                    history.pushState({}, null, `/nl?q=${q}`);
                    fetchData(`q=${q}`);
                  }}
                  initialValue={""}
                  placeholder='For example "doctorate degrees in the USA"'
                />
              </div>
            </Container>
          </div>
        </Row>
        {debugInfo && (
          <Row>
            <b>DEBUGGING INFO: </b>
            <br></br>
          </Row>
        )}
        {debugInfo && (
          <Row>
            <b>Execution Status: </b> {debugInfo.status}
          </Row>
        )}
        {debugInfo && (
          <Row>
            <b>Original Query: </b> {debugInfo.originalQuery}
          </Row>
        )}
        {debugInfo && (
          <Row>
            <b>Places Detected: </b> {debugInfo.placesDetected.join(", ")}
          </Row>
        )}
        {debugInfo && (
          <Row>
            <b>Main Place DCID Inferred: </b>
            {debugInfo.placeDCID}
          </Row>
        )}
        {debugInfo && (
          <Row>
            <b>Query used for SV detection: </b>
            {debugInfo.queryWithoutPlaces}
          </Row>
        )}
        {debugInfo && (
          <Row>
            <b>SVs Matched (with scores):</b>
            {displaySVMatchScores(debugInfo.svScores)}
          </Row>
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
