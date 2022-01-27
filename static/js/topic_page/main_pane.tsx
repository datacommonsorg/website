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
import _ from "lodash";
import React from "react";

import { ErrorBoundary } from "../shared/error_boundary";
import { NamedTypedPlace } from "../shared/types";
import { randDomId } from "../shared/util";
import { DEFAULT_PAGE_PLACE_TYPE } from "./constants";
import { PageSelector } from "./page_selector";
import { TopicsSummary } from "./topic_page";
import { Category } from "./category";

export interface PageMetadata {
  topicId: string;
  topicName: string;
  // Map of parent type to child place type.
  containedPlaceTypes: Record<string, string>;
}

export interface PageConfig {
  metadata: PageMetadata;
  categories: Category[];
}

interface MainPanePropType {
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
  pageConfig: PageConfig;
  /**
   * Summary for all topic page configs
   */
  topicsSummary: TopicsSummary;
}

export function MainPane(props: MainPanePropType): JSX.Element {
  const placeType = props.place.types
    ? props.place.types[0]
    : DEFAULT_PAGE_PLACE_TYPE;
  const enclosedPlaceType =
    props.pageConfig.metadata.containedPlaceTypes[placeType];
  return (
    <>
      <PageSelector
        selectedPlace={props.place}
        selectedTopic={props.topic}
        topicsSummary={props.topicsSummary}
      />
      {!_.isEmpty(props.pageConfig) &&
        props.pageConfig.categories.map((category) => {
          const id = randDomId();
          return (
            <ErrorBoundary key={id}>
              <Category
                place={props.place}
                enclosedPlaceType={enclosedPlaceType}
                config={category}
              />
            </ErrorBoundary>
          );
        })}
    </>
  );
}
