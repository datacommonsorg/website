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
 * Main component for the disaster dashboard.
 */

import React from "react";

import { ParentBreadcrumbs } from "../../components/disaster_dashboard/parent_breadcrumbs";
import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SubjectPageSidebar } from "../../components/subject_page/sidebar";
import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

interface AppPropType {
  /**
   * The place to show the dashboard for.
   */
  place: NamedTypedPlace;
  /**
   * Config of the page
   */
  dashboardConfig: SubjectPageConfig;
}

export function App(props: AppPropType): JSX.Element {
  return (
    <>
      <div className="row">
        <SubjectPageSidebar categories={props.dashboardConfig.categories} />
        <div className="col-md-9x col-lg-10">
          <h1 id="place-name">{props.place.name}</h1>
          <ParentBreadcrumbs place={props.place}></ParentBreadcrumbs>
          <SubjectPageMainPane
            place={props.place}
            pageConfig={props.dashboardConfig}
          />
        </div>
      </div>
    </>
  );
}
