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
 * Component for rendering the side bar of a subject page.
 */

import React from "react";

import { CATEGORY_ID_PREFIX } from "../../constants/subject_page_constants";
import { NamedTypedNode } from "../../shared/types";
import { randDomId } from "../../shared/util";
import { CategoryConfig } from "../../types/subject_page_proto_types";
import { getId } from "../../utils/subject_page_utils";

interface SidebarPropType {
  id: string;
  currentTopicDcid: string;
  place: string;
  /**
   * Categories from the page config.
   */
  categories: CategoryConfig[];
  peerTopics: NamedTypedNode[];
}
export function Sidebar(props: SidebarPropType): JSX.Element {
  return (
    <div id="subject-page-sidebar">
      <ul id="nav-topics" className="nav flex-column accordion">
        {props.peerTopics.map((topic, idx) => {
          return (
            <div key={idx} className="topic-item">
              <a
                className="nav-item category"
                key={idx}
                href={`/insights/#p=${props.place}&t=${topic.dcid}`}
              >
                {topic.name}
              </a>
              <div className="sub-topic-group">
                {topic.dcid == props.currentTopicDcid &&
                  props.categories &&
                  props.categories.map((category, idx) => {
                    console.log(category);
                    const categoryId = getId(props.id, CATEGORY_ID_PREFIX, idx);
                    // Add child categories
                    return renderItem(category.title, categoryId);
                  })}
              </div>
            </div>
          );
        })}
      </ul>
    </div>
  );
}

function renderItem(title: string, categoryId: string): JSX.Element {
  if (!title) {
    return null;
  }
  return (
    <a
      key={randDomId()}
      className={"nav-item"}
      href={`/insights/#p=${"haha"}&t=${categoryId}`}
    >
      {title}
    </a>
  );
}
