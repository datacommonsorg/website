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
 * Main app component for rich search.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Button, Card, Container, Input, InputGroup, Row } from "reactstrap";

import { SearchBar } from "../shared/place_search_bar";
import { NamedNode } from "../shared/types";
import {
  addToken,
  getTokensFromUrl,
  placeSep,
  removeToken,
  setTokensToUrl,
} from "../tools/timeline/util";
import { getPlaceNames } from "../utils/place_utils";
import { MemoStatVars, StatVarsPropType } from "./stat_vars";

interface AppPropType {
  query: string;
  setQuery: (string) => void;
  places: string[];
  addPlace: (string) => void;
  removePlace: (string) => void;
  loading: boolean;
  onClickSearch: () => void;
  inputInvalid: boolean;
  chartsData: StatVarsPropType;
}

function App({
  query,
  setQuery,
  places,
  addPlace,
  removePlace,
  loading,
  onClickSearch,
  inputInvalid,
  chartsData,
}: AppPropType): JSX.Element {
  const [placeNames, setPlaceNames] = useState({});
  useEffect(() => {
    places.length
      ? getPlaceNames(places).then(setPlaceNames)
      : setPlaceNames({});
  }, [places]);
  return (
    <>
      <div id="plot-container">
        <Container fluid={true}>
          <Row>
            <h1 className="mb-4">Rich Search</h1>
          </Row>
          <Row>
            <Card className="place-options-card">
              <Container className="place-options" fluid={true}>
                <div className="place-options-section">
                  <div className="place-options-label">Question:</div>
                  <div className="input-query">
                    <InputGroup>
                      <Input
                        invalid={inputInvalid}
                        placeholder={
                          'For example "People with Doctorate Degrees"'
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && onClickSearch()}
                        className="pac-target-input"
                      />
                      <Button onClick={onClickSearch}>
                        <span className="material-icons search rich-search-icon">
                          search
                        </span>
                      </Button>
                    </InputGroup>
                  </div>
                </div>
                <div className="place-options-section">
                  <div className="place-options-label">Place:</div>
                  <div id="search">
                    <SearchBar
                      places={placeNames}
                      removePlace={removePlace}
                      addPlace={addPlace}
                      numPlacesLimit={1}
                    />
                  </div>
                </div>
              </Container>
            </Card>
          </Row>
          {chartsData && !loading && (
            <Row>
              <Card>
                <div id="main" className="col-md-9x col-lg-10">
                  <MemoStatVars {...chartsData} />
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

async function getStatVars(
  dcids: string[],
  query: string
): Promise<NamedNode[]> {
  const params = new URLSearchParams({ query });
  for (const place of dcids) {
    params.append("place", place);
  }
  return axios
    .get(`/api/stats/stat-var-search-ai?${params.toString()}`)
    .then((resp) => resp.data.statVars || []);
}

function getQueryFromUrl(): string {
  return [...Array.from(getTokensFromUrl("query", placeSep)), ""][0];
}

function getPlacesFromUrl(): string[] {
  return [...Array.from(getTokensFromUrl("place", placeSep))];
}

export function AppWithContext(): JSX.Element {
  const [query, setQuery] = useState(getQueryFromUrl());
  const [places, setPlaces] = useState(getPlacesFromUrl());
  const [loading, setLoading] = useState(false);
  const [inputInvalid, setInputInvalid] = useState(false);
  const [chartsData, setChartsData] = useState<StatVarsPropType | undefined>();
  window.onhashchange = () => {
    // Minimize state updates to preven unnecessary re-renders.
    const q = getQueryFromUrl();
    if (q !== query) {
      setQuery(q);
    }
    const p = getPlacesFromUrl();
    if (!_.isEqual(places, p)) {
      setPlaces(p);
    }
    if (inputInvalid) setInputInvalid(false);
  };

  const search = () => {
    const q = getQueryFromUrl();
    const p = getPlacesFromUrl();
    if (q && p.length) {
      setLoading(true);
      setChartsData(null);
      Promise.all([getStatVars(p, q)]).then(([statVars]) => {
        setChartsData({ statVars, places: p });
        setLoading(false);
      });
    }
  };
  useEffect(search, []);

  return (
    <App
      query={query}
      places={places}
      addPlace={(p) => addToken("place", placeSep, p)}
      removePlace={(p) => removeToken("place", placeSep, p)}
      onClickSearch={() => (query ? search() : setInputInvalid(true))}
      loading={loading}
      inputInvalid={inputInvalid}
      chartsData={chartsData}
      setQuery={(q) =>
        setTokensToUrl([{ name: "query", sep: placeSep, tokens: new Set([q]) }])
      }
    />
  );
}
