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
 * Component for rendering a subject page.
 */

import React from "react";

import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";
import { SubjectPageConfigSummary } from "../../types/subject_page_types";
import { MainPane } from "./main_pane";
import { Sidebar } from "./sidebar";

export interface SubjectPagePropType {
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  /**
   * The topic of the current page.
   */
  topic: string;
  /**
   * Config of the page
   */
  pageConfig: SubjectPageConfig;
  /**
   * Summary for all available page configs
   */
  allConfigsSummary: SubjectPageConfigSummary;
}

export function SubjectPage(props: SubjectPagePropType): JSX.Element {
  return (
    <div id="subject-page" className="row">
      <div id="sidebar" className="col-md-3x col-lg-2 order-last order-lg-0">
        <Sidebar categories={props.pageConfig.categories} />
      </div>
      <div className="col-md-9x col-lg-10">
        <div id="main-pane" className="row">
          <MainPane
            place={props.place}
            topic={props.topic}
            pageConfig={props.pageConfig}
            allConfigsSummary={props.allConfigsSummary}
          />
        </div>
      </div>
    </div>
  );
}
