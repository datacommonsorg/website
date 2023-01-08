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
import { Container } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SearchResult } from "../../types/app/nl_interface_types";
import { BUILD_OPTIONS, DebugInfo } from "./debug_info";

const contextHistoryAge = 3600; // Seconds
const maxContextHistoryEntry = 10;

export interface QueryResultProps {
  query: string;
}

export function QueryResult(props: QueryResultProps): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [selectedBuild, setSelectedBuild] = useState(BUILD_OPTIONS[0].value);
  const [loading, setLoading] = useState(false);
  const [cookies, setCookie] = useCookies();
  const [debugData, setDebugData] = useState<any>();

  useEffect(() => {
    fetchData(props.query, selectedBuild);
  }, [props.query, selectedBuild]);

  function fetchData(query: string, build: string): void {
    setLoading(true);
    axios
      .post(`/nl/data?q=${query}&build=${build}`, {
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
        setDebugData(context["debug"]);
        setLoading(false);
      });
  }
  return (
    <>
      <div className="nl-query">
        <Container>
          <h2>Q: {props.query}</h2>
        </Container>
      </div>
      <div className="nl-result">
          <Container>
        {debugData && (
          <DebugInfo
            debugData={debugData}
            selectedBuild={selectedBuild}
            setSelectedBuild={setSelectedBuild}
          ></DebugInfo>
        )}
        {chartsData && chartsData.config && (
              <SubjectPageMainPane
                place={chartsData.place}
                pageConfig={chartsData.config}
              />
        )}
        <div id="screen" style={{ display: loading ? "block" : "none" }}>
          <div id="spinner"></div>
        </div>
          </Container>
      </div>
    </>
  );
}
