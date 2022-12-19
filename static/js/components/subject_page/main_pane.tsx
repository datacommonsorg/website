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

/**
 * Component for rendering the main pane of a subject page.
 */

import _ from "lodash";
import React from "react";

import { DEFAULT_PAGE_PLACE_TYPE } from "../../constants/subject_page_constants";
import { NamedTypedPlace } from "../../shared/types";
import { randDomId } from "../../shared/util";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";
import { ErrorBoundary } from "../error_boundary";
import { Category } from "./category";

interface SubjectPageMainPanePropType {
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  /**
   * Config of the page
   */
  pageConfig: SubjectPageConfig;
}

export function SubjectPageMainPane(
  props: SubjectPageMainPanePropType
): JSX.Element {
  const placeType = props.place.types
    ? props.place.types[0]
    : DEFAULT_PAGE_PLACE_TYPE;
  const enclosedPlaceType =
    props.pageConfig.metadata.containedPlaceTypes[placeType];
  return (
    <div id="subject-page-main-pane">
      {!_.isEmpty(props.pageConfig) &&
        props.pageConfig.categories.map((category) => {
          const id = randDomId();
          return (
            <ErrorBoundary key={id}>
              <Category
                place={props.place}
                enclosedPlaceType={enclosedPlaceType}
                config={category}
                eventTypeSpec={props.pageConfig.metadata.eventTypeSpec}
              />
            </ErrorBoundary>
          );
        })}
    </div>
  );
}
