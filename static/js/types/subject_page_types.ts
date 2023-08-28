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
import { NamedTypedNode } from "../shared/types";
import { SubjectPageConfig } from "../types/subject_page_proto_types";
import { ChildPlacesByType } from "./../shared/types";

export interface SubjectPageMetadata {
  /**
   * The place to show the dashboard for.
   */
  place: NamedTypedNode;
  /**
   * In cases where there are multiple places, this is used.
   * TODO: Switch over to this
   */
  places?: NamedTypedNode[];
  /**
   * Config of the page
   */
  pageConfig: SubjectPageConfig;
  /**
   * parent places of the place we are showing the dashboard for.
   */
  parentPlaces?: NamedTypedNode[];
  /**
   * child places of the place we are showing the dashboard for.
   */
  childPlaces?: ChildPlacesByType;

  peerPlaces?: NamedTypedNode[];

  parentTopics?: NamedTypedNode[];

  peerTopics?: NamedTypedNode[];
  childTopics?: NamedTypedNode[];
  exploreMore?: Record<string, Record<string, string[]>>;

  mainTopics?: NamedTypedNode[];
  sessionId?: string;
}
