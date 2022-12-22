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

import React from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

interface AppPropType {
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  /**
   * Config of the page
   */
  pageConfig: SubjectPageConfig;
}

export function App(props: AppPropType): JSX.Element {
  return (
    <div id="dc-nl-interface">
      <h1>Data Commons NL Interface</h1>
      <div className="row">
        <SubjectPageMainPane
          place={props.place}
          pageConfig={props.pageConfig}
        />
      </div>
    </div>
  );
}
