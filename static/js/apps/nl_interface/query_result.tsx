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
 * A single query for the NL interface
 */

import axios from "axios";
import React, { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { Col, Container, Row } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SubjectPageSidebar } from "../../components/subject_page/sidebar";
import { TextSearchBar } from "../../components/text_search_bar";
import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

const contextHistoryAge = 3600; // Seconds
const maxContextHistoryEntry = 10;

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

export interface QueryResultProps {
  query: string;
  build_option: string;
}

export function QueryResult(props: QueryResultProps): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | undefined>();
  const [loading, setLoading] = useState(false);
  const [cookies, setCookie] = useCookies();

  console.log(`hello again: ${props.query}`);

  const showDebugInfo = true;

  useEffect(() => {
    fetchData(props.query);
  }, []);

  function fetchData(query: string): void {
    setLoading(true);
    axios
      .post(`/nl/data?q=${query}&build=${props.build_option}`, {
        contextHistory: cookies["context_history"],
      })
      .then((resp) => {
        if (
          resp.data["context"] === undefined ||
          resp.data["config"] === undefined
        ) {
          setLoading(false);
          return;
        }
        const context: any = resp.data["context"];
        // TODO: Move this logic out to app.tsx
        // Set cookies with the new context.
        const contextHistory: any[] = cookies["context_history"] || [];
        if (contextHistory.length === maxContextHistoryEntry) {
          contextHistory.shift();
        }
        contextHistory.push(context);
        setCookie("context_history", contextHistory, {
          maxAge: contextHistoryAge,
          path: "/nl",
        });
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
        setLoading(false);
      });
  }

  const matchScoresElement = (svScores: SVScores): JSX.Element => {
    const svs = Object.values(svScores.SV);
    const scores = Object.values(svScores.CosineScore);
    return (
      <div id="sv-scores-list">
        <table>
          <tr>
            <th>SV</th>
            <th>Cosine Score [0, 1]</th>
          </tr>
          {svs.length === scores.length &&
            svs.map((sv, i) => {
              return (
                <tr key={i}>
                  <td>{sv}</td>
                  <td>{scores[i]}</td>
                </tr>
              );
            })}
        </table>
      </div>
    );
  };

  return (
    <div className="nl-query-result">
      <Container fluid={true}>
        <Row>
          <Col>
            <h2>Q: {props.query}</h2>
          </Col>
        </Row>
        {showDebugInfo && (
          <div className="nl-query-result-debug-info">
            <Row>
              <b>DEBUGGING OPTIONS/INFO: </b>
              <br></br>
            </Row>
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
                </Row>
                {matchScoresElement(debugInfo.svScores)}
              </>
            )}
          </div>
        )}
        {chartsData && chartsData.config && (
          <Row>
            <div className="row col-md-9x col-lg-10">
              <SubjectPageMainPane
                place={chartsData.place}
                pageConfig={chartsData.config}
              />
            </div>
          </Row>
        )}
        <div id="screen" style={{ display: loading ? "block" : "none" }}>
          <div id="spinner"></div>
        </div>
      </Container>
    </div>
  );
}
