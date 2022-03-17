/**
 * Copyright 2021 Google LLC
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
 * Main app component for map explorer.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { RawIntlProvider } from "react-intl";
import { Button, Card, Container, Input, InputGroup, Row } from "reactstrap";

import { PageData } from "../../chart/types";
import { intl } from "../../i18n/i18n";
import { SearchBar } from "../timeline/search";
import {
  addToken,
  getPlaceNames,
  getTokensFromUrl,
  placeSep,
  removeToken,
  setTokensToUrl,
} from "../timeline/util";
import { ChartsPropType, MemoCharts } from "./charts";

interface AppPropType {
  query: string;
  setQuery: (string) => void;
  places: string[];
  addPlace: (string) => void;
  removePlace: (string) => void;
  loading: boolean;
  onClickSearch: () => void;
  inputInvalid: boolean;
  chartsData: ChartsPropType;
}

function getPlaceTypes(places: string[]): Promise<{ [key: string]: string }> {
  //TODO: Should we make this a single call.
  return Promise.all(
    places.map((dcid) =>
      axios.get(`/api/place/type/${dcid}`).then((resp) => [dcid, resp.data])
    )
  ).then((entries) => {
    const result = {};
    entries.forEach((pair) => {
      result[pair[0]] = pair[1];
    });
    return result;
  });
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
          <Row>
            <Card>
              <RawIntlProvider value={intl}>
                <div id="main" className="col-md-9x col-lg-10">
                  {chartsData && !loading && <MemoCharts {...chartsData} />}
                </div>
              </RawIntlProvider>
            </Card>
          </Row>
          <div id="screen" style={{ display: loading ? "block" : "none" }}>
            <div id="spinner"></div>
          </div>
        </Container>
      </div>
    </>
  );
}

async function getLandingPageData(
  dcids: string[],
  query: string,
  locale: string
): Promise<PageData> {
  //TODO: Incorporate the query into the API.
  return axios
    .get(`/api/landingpage/data/${dcids[0]}?category=Health&hl=${locale}`)
    .then((resp) => resp.data);
}

function getQueryFromUrl(): string {
  return [...Array.from(getTokensFromUrl("query", placeSep)), ""][0]
}

function getPlacesFromUrl(): string[] {
  return [...Array.from(getTokensFromUrl("place", placeSep))]
}

export function AppWithContext(): JSX.Element {
  const [query, setQuery] = useState(getQueryFromUrl());
  const [places, setPlaces] = useState(getPlacesFromUrl());
  const [loading, setLoading] = useState(false);
  const [inputInvalid, setInputInvalid] = useState(false);
  const [chartsData, setChartsData] = useState<ChartsPropType | undefined>();
  window.onhashchange = () => {
    // Minimize state updates to preven unnecessary re-renders.
    const q = getQueryFromUrl();
    if (q !== query) setQuery(q);
    const p = getPlacesFromUrl();
    if (!_.isEqual(places, p)) setPlaces(p);
    if (inputInvalid) setInputInvalid(false);
  };

  const search = () => {
    const locale = document.getElementById("locale").dataset.lc;
    const q = getQueryFromUrl();
    const p = getPlacesFromUrl();
    if (q && p.length) {
      setLoading(true);
      setChartsData(null);
      Promise.all([
        getLandingPageData(p, q, locale),
        getPlaceTypes(p),
      ]).then(([pageData, placeTypes]) => {
        setChartsData({ pageData, placeTypes, places: p });
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
