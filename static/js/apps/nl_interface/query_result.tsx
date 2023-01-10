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
import React, { createRef, memo, useEffect, useState } from "react";
import { Container } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SearchResult } from "../../types/app/nl_interface_types";
import { BUILD_OPTIONS, DebugInfo } from "./debug_info";

const SVG_CHART_HEIGHT = 160;

export interface QueryResultProps {
  query: string;
  queryIdx: number;
  contextHistory: any[];
  addContextCallback: (any, number) => void;
}

export const QueryResult = memo(function QueryResult(
  props: QueryResultProps
): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [selectedBuild, setSelectedBuild] = useState(BUILD_OPTIONS[0].value);
  const [isLoading, setIsLoading] = useState(true);
  const [debugData, setDebugData] = useState<any>();
  const scrollRef = createRef<HTMLDivElement>();

  useEffect(() => {
    // Scroll to the top (assuming this is the last query to render, and other queries are memoized).
    // HACK: use a longer timeout to correct scroll errors after charts have rendered.
    const timer = setTimeout(() => {
      console.log(`self-scrolling to top: ${props.query}`);
      scrollRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    fetchData(props.query, selectedBuild);
  }, [props.query, selectedBuild]);

  function fetchData(query: string, build: string): void {
    setIsLoading(true);
    console.log("context:", props.query, props.contextHistory);
    axios
      .post(`/nl/data?q=${query}&build=${build}`, {
        contextHistory: props.contextHistory,
      })
      .then((resp) => {
        if (
          resp.data["context"] === undefined ||
          resp.data["config"] === undefined
        ) {
          setIsLoading(false);
          props.addContextCallback(undefined, props.queryIdx);
          return;
        }
        const context: any = resp.data["context"];
        props.addContextCallback(context, props.queryIdx);

        setChartsData({
          place: {
            types: [context["place_type"]],
            name: context["place_name"],
            dcid: context["place_dcid"],
          },
          config: resp.data["config"],
        });
        if (context["debug"] === undefined) {
          setIsLoading(false);
          return;
        }
        setDebugData(context["debug"]);
        setIsLoading(false);
      });
  }
  return (
    <>
      <div className="nl-query" ref={scrollRef}>
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
              svgChartHeight={SVG_CHART_HEIGHT}
            />
          )}
          {isLoading && (
            <div className="dot-loading-stage">
              <div className="dot-flashing"></div>
            </div>
          )}
        </Container>
      </div>
    </>
  );
});
