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
 * Main app component for rich search which renders a search box and graphics
 * for the resulting statistical variables and locations.
 */

import axios from "axios";
import React, { useEffect, useState } from "react";
import { Card, Container, Row } from "reactstrap";

import { TextSearchBar } from "../components/text_search_bar";
import { getStatVarInfo } from "../shared/stat_var";
import {
  getTokensFromUrl,
  placeSep,
  setTokensToUrl,
} from "../tools/timeline/util";
import {
  getPlaceDcids,
  getPlaceIdsFromNames,
  getPlaceNames,
} from "../utils/place_utils";
import { StatVarResults, StatVarResultsPropType } from "./stat_vars";

interface AppPropType {
  query: string;
  loading: boolean;
  onSearch: (string) => void;
  chartsData: StatVarResultsPropType;
}

function App({
  query,
  loading,
  onSearch,
  chartsData,
}: AppPropType): JSX.Element {
  return (
    <>
      <div id="plot-container">
        <Container fluid={true}>
          <Row>
            <Card className="place-options-card">
              <Container className="place-options" fluid={true}>
                <div className="place-options-section">
                  <TextSearchBar
                    inputId="query-search-input"
                    onSearch={onSearch}
                    initialValue={query}
                    placeholder='For example "doctorate degrees in the USA"'
                  />
                </div>
              </Container>
            </Card>
          </Row>
          {chartsData && !loading && (
            <Row>
              <Card>
                <div id="main" className="col-md-9x col-lg-10">
                  <StatVarResults {...chartsData} />
                </div>
              </Card>
            </Row>
          )}
          <div id="screen" style={{ display: loading ? "block" : "none" }}>
            <div id="spinner"></div>
          </div>
        </Container>
      </div>
    </>
  );
}

/**
 * Queries the search API and fetched the data to render the graphics.
 */
async function fetchChartsData(query: string): Promise<StatVarResultsPropType> {
  const params = new URLSearchParams({ query });
  return axios
    .get(`/api/stats/stat-var-search-ai?${params.toString()}`)
    .then((resp) => {
      const vars = (resp.data.statVars || [])
        .map((v) => v.dcid)
        .filter((dcid) => !!dcid)
        .slice(0, 6);
      const debug = resp.data.debug || [];
      const placeName = getPlaceIdsFromNames(
        resp.data.places.map((p) => p.name)
      )
        .then(Object.values)
        .then(getPlaceDcids)
        .then(Object.values)
        .then(getPlaceNames);
      const statVarInfo = vars.length
        ? getStatVarInfo(vars)
        : Promise.resolve({});
      return Promise.all([
        Promise.resolve(vars),
        Promise.resolve(debug),
        statVarInfo,
        placeName,
      ]);
    })
    .then(([statVarOrder, debug, statVarInfo, placeName]) => ({
      statVarOrder,
      statVarInfo,
      placeName,
      debug,
    }));
}

function getQueryFromUrl(): string {
  return [...Array.from(getTokensFromUrl("query", placeSep)), ""][0];
}

export function AppWithContext(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [chartsData, setChartsData] = useState<
    StatVarResultsPropType | undefined
  >();

  const search = () => {
    const q = getQueryFromUrl();
    if (!q) {
      return;
    }
    setLoading(true);
    setChartsData(null);
    fetchChartsData(q).then((cd) => {
      setChartsData(cd);
      setLoading(false);
    });
  };
  useEffect(search, []);

  return (
    <App
      query={getQueryFromUrl()}
      onSearch={(q) => {
        setTokensToUrl([
          { name: "query", sep: placeSep, tokens: new Set([q]) },
        ]);
        search();
      }}
      loading={loading}
      chartsData={chartsData}
    />
  );
}
