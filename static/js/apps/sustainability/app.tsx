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
 * Main component for sustainability explorer.
 */

import React from "react";
import { RawIntlProvider } from "react-intl";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SubjectPageSidebar } from "../../components/subject_page/sidebar";
import { intl } from "../../i18n/i18n";
import { ChildPlaces } from "../../shared/child_places";
import { ParentBreadcrumbs } from "../../shared/parent_breadcrumbs";
import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

const PAGE_ID = "subject_page";

interface AppPropType {
  /**
   * The place to show the dashboard for.
   */
  place: NamedTypedPlace;
  /**
   * Config of the page
   */
  dashboardConfig: SubjectPageConfig;
  /**
   * parent places of the place we are showing the dashboard for.
   */
  parentPlaces: NamedTypedPlace[];
}

export function App(props: AppPropType): JSX.Element {
  return (
    <RawIntlProvider value={intl}>
      <div className="row">
        <div className="col-md-3x col-lg-2 order-last order-lg-0">
          <SubjectPageSidebar
            id={PAGE_ID}
            categories={props.dashboardConfig.categories}
          />
          <ChildPlaces parentPlace={props.place}></ChildPlaces>
        </div>
        <div className="col-md-9x col-lg-10">
          <h1 id="place-name">{props.place.name}</h1>
          <ParentBreadcrumbs
            place={props.place}
            parentPlaces={props.parentPlaces}
          ></ParentBreadcrumbs>
          <SubjectPageMainPane
            id={PAGE_ID}
            place={props.place}
            pageConfig={props.dashboardConfig}
            parentPlaces={props.parentPlaces}
          />
        </div>
      </div>
    </RawIntlProvider>
  );
}
