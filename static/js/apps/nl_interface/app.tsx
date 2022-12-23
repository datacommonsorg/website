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

export function App(): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [paramsStr, setParamsStr] = useState<string>();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramsStr = params.toString();
    if (paramsStr.length > 0) {
      fetchData(paramsStr);
    }
  }, [paramsStr]);

  function fetchData(paramsStr: string): void {
    setLoading(true);
    setParamsStr(paramsStr);
    axios.get(`/nl/data?${paramsStr}`).then((resp) => {
      setChartsData({
        place: {
          types: [resp.data["place_type"]],
          name: resp.data["place_name"],
          dcid: resp.data["place_dcid"],
        },
        config: resp.data.config,
      });
      setLoading(false);
    });
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
                    fetchData(q);
                  }}
                  initialValue={""}
                  placeholder='For example "doctorate degrees in the USA"'
                />
              </div>
            </Container>
          </div>
        </Row>
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
