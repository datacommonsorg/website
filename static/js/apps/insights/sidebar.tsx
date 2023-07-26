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

import { NamedTypedNode } from "../../shared/types";
import { randDomId } from "../../shared/util";
import { CategoryConfig } from "../../types/subject_page_proto_types";

interface SidebarPropType {
  id: string;
  currentTopicDcid: string;
  places: string[];
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
          let url = `/insights/#t=${topic.dcid}`;
          for (const p of props.places) {
            url += `&p=${p}`;
          }
          return (
            <div key={idx} className="topic-item">
              <a className="nav-item category" key={idx} href={url}>
                {topic.name}
              </a>
              <div className="sub-topic-group">
                {topic.dcid == props.currentTopicDcid &&
                  props.categories &&
                  props.categories.map((category) => {
                    let url = `/insights/#t=${category.dcid}`;
                    for (const p of props.places) {
                      url += `&p=${p}`;
                    }
                    return (
                      <a key={randDomId()} className={"nav-item"} href={url}>
                        {category.title}
                      </a>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </ul>
    </div>
  );
}
