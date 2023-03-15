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

import _ from "lodash";
import React from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SubjectPageSidebar } from "../../components/subject_page/sidebar";
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

export function App(props: AppPropType): JSX.Element {
  return (
    <>
      <div className="row">
        <div className="col-md-3x col-lg-2 order-last order-lg-0">
          <SubjectPageSidebar
            id={PAGE_ID}
            categories={props.pageConfig.categories}
          />
        </div>
        <div className="row col-md-9x col-lg-10">
          <PageSelector
            selectedPlace={props.place}
            selectedTopic={props.topic}
            topicsSummary={props.topicsSummary}
          />
          <SubjectPageMainPane
            id={PAGE_ID}
            place={props.place}
            pageConfig={props.pageConfig}
          />
        </div>
      </div>
    </>
  );
}
