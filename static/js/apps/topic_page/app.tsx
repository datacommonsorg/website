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
 * Main component for topic pages.
 */

import React, { useState } from "react";
import { RawIntlProvider } from "react-intl";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import {
  SdgSubjectPageSidebar,
  SubjectPageSidebar,
} from "../../components/subject_page/sidebar";
import { intl } from "../../i18n/i18n";
import { SdgContext } from "../../shared/context";
import { NamedTypedPlace } from "../../shared/types";
import { TopicsSummary } from "../../types/app/topic_page_types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";
import { PageSelector } from "./page_selector";

interface AppPropType {
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  /**
   * A list of additional places for the topic page.
   */
  morePlaces: string[];
  /**
   * The topic of the current page.
   */
  topic: string;
  /**
   * Config of the page
   */
  pageConfig: SubjectPageConfig;
  /**
   * Summary of all available page configs
   */
  topicsSummary: TopicsSummary;
}

const PAGE_ID = "topic";

const SHOW_WEB_COMPONENTS_URL_PARAM = "wc";
export function App(props: AppPropType): JSX.Element {
  const [sdgIndex, setSdgIndex] = useState(props.topic === "sdg" ? 0 : null);
  const value = { sdgIndex, setSdgIndex };
  const searchParams = new URLSearchParams(location.search);
  const showWebComponents = !!searchParams.get(SHOW_WEB_COMPONENTS_URL_PARAM);
  return (
    <RawIntlProvider value={intl}>
      <SdgContext.Provider value={value}>
        <div className="row">
          {props.topic === "sdg" && (
            <div>
              <img src="/images/un.jpg" className="col-12" />
            </div>
          )}
          <div className="col-md-3x col-lg-3 order-last order-lg-0">
            {props.topic === "sdg" && (
              <SdgSubjectPageSidebar
                id={PAGE_ID}
                categories={props.pageConfig.categories}
              />
            )}
            {props.topic !== "sdg" && (
              <SubjectPageSidebar
                id={PAGE_ID}
                categories={props.pageConfig.categories}
              />
            )}
          </div>
          <div className="row col-md-9x col-lg-9">
            <PageSelector
              selectedPlace={props.place}
              morePlaces={props.morePlaces}
              selectedTopic={props.topic}
              topicsSummary={props.topicsSummary}
            />
            <SubjectPageMainPane
              id={PAGE_ID}
              place={props.place}
              pageConfig={props.pageConfig}
              showWebComponents={showWebComponents}
            />
          </div>
        </div>
      </SdgContext.Provider>
    </RawIntlProvider>
  );
}
