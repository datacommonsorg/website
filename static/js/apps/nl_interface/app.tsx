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
import { useCookies } from "react-cookie";
import { Col, Container, Row } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SubjectPageSidebar } from "../../components/subject_page/sidebar";
import { TextSearchBar } from "../../components/text_search_bar";
import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

export function App(): JSX.Element {
  return (
    <div id="dc-nl-interface">

      <Container id="results-thread-container" fluid={true}>
      </Container>

      <Container id="query-container" fluid={true}>
        <div className="place-options-section">
          <TextSearchBar
          onSearch={(q) => {}}
          initialValue="search here"
            // onSearch={(q) => {
            //   const urlParamsString = `q=${q}&build=${selectedBuild}`;
            //   history.pushState({}, null, "/nl?" + urlParamsString);
            //   fetchData(urlParamsString);
            // }}
            // initialValue={searchText}
            placeholder='For example "family earnings in california"'
          />
        </div>
      </Container>
    </div>
  );
}