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
import { getStatVarInfo, StatVarInfo } from "../shared/stat_var";
import {
  addToken,
  getTokensFromUrl,
  placeSep,
  removeToken,
  setTokensToUrl,
} from "../tools/timeline/util";
import { getPlaceNames } from "../utils/place_utils";
import { StatVars, StatVarsPropType } from "./stat_vars";

interface AppPropType {
  query: string;
  places: string[];
  addPlace: (string) => void;
  removePlace: (string) => void;
  loading: boolean;
  onSearch: (string) => void;
  chartsData: StatVarsPropType;
}

interface TextSearchBarPropType {
  onSearch: (string) => void;
  initialValue: string;
  placeholder: string;
}

const memoizedGetPlaceNames = _.memoize(getPlaceNames);

function TextSearchBar({
  onSearch,
  initialValue,
  placeholder,
}: TextSearchBarPropType): JSX.Element {
  const [invalid, setInvalid] = useState(false);
  const [value, setValue] = useState(initialValue);
  const callback = () => (value ? onSearch(value) : setInvalid(true));
  return (
    <div className="input-query">
      <InputGroup>
        <Input
          invalid={invalid}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
          }}
          onKeyPress={(e) => e.key === "Enter" && callback()}
          className="pac-target-input"
        />
        <Button onClick={callback}>
          <span className="material-icons search rich-search-icon">search</span>
        </Button>
      </InputGroup>
    </div>
  );
}

function App({
  query,
  places,
  addPlace,
  removePlace,
  loading,
  onSearch,
  chartsData,
}: AppPropType): JSX.Element {
  const [placeNames, setPlaceNames] = useState({});
  useEffect(() => {
    places.length
      ? memoizedGetPlaceNames(places).then(setPlaceNames)
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
                  <TextSearchBar
                    onSearch={onSearch}
                    initialValue={query}
                    placeholder='For example "People with Doctorate Degrees"'
                  />
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
                  <StatVars {...chartsData} />
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
): Promise<[string[], { [key: string]: StatVarInfo }]> {
  const params = new URLSearchParams({ query });
  for (const place of dcids) {
    params.append("place", place);
  }
  return axios
    .get(`/api/stats/stat-var-search-ai?${params.toString()}`)
    .then((resp) => (resp.data.statVars || []).map((v) => v.dcid).slice(0, 6))
    .then((vars) => Promise.all([Promise.resolve(vars), getStatVarInfo(vars)]));
}

function getQueryFromUrl(): string {
  return [...Array.from(getTokensFromUrl("query", placeSep)), ""][0];
}

function getPlacesFromUrl(): string[] {
  return [...Array.from(getTokensFromUrl("place", placeSep))];
}

export function AppWithContext(): JSX.Element {
  const [places, setPlaces] = useState(getPlacesFromUrl());
  const [loading, setLoading] = useState(false);
  const [chartsData, setChartsData] = useState<StatVarsPropType | undefined>();

  window.onhashchange = () => {
    const p = getPlacesFromUrl();
    if (!_.isEqual(places, p)) {
      setPlaces(p);
    }
  };

  const search = () => {
    const q = getQueryFromUrl();
    const p = getPlacesFromUrl();
    if (q && p.length) {
      setLoading(true);
      setChartsData(null);
      Promise.all([getStatVars(p, q), memoizedGetPlaceNames(p)]).then(
        ([[statVarOrder, statVarInfo], placeName]) => {
          setChartsData({ statVarOrder, statVarInfo, placeName });
          setLoading(false);
        }
      );
    }
  };
  useEffect(search, []);

  return (
    <App
      query={getQueryFromUrl()}
      places={places}
      addPlace={(p) => addToken("place", placeSep, p)}
      removePlace={(p) => removeToken("place", placeSep, p)}
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
