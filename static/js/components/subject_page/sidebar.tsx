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
 * Component for rendering the side bar of a subject page.
 */

import _ from "lodash";
import React from "react";

import {
  BLOCK_ID_PREFIX,
  CATEGORY_ID_PREFIX,
} from "../../constants/subject_page_constants";
import { randDomId } from "../../shared/util";
import { CategoryConfig } from "../../types/subject_page_proto_types";
import { getId } from "../../utils/subject_page_utils";

interface SubjectPageSidebarPropType {
  id: string;
  /**
   * Categories from the page config.
   */
  categories: CategoryConfig[];
}

export function SubjectPageSidebar(
  props: SubjectPageSidebarPropType
): JSX.Element {
  return (
    <div id="subject-page-sidebar">
      <ul id="nav-topics" className="nav flex-column accordion">
        {!_.isEmpty(props.categories) &&
          props.categories.map((category, idx) => {
            const categoryId = getId(props.id, CATEGORY_ID_PREFIX, idx);
            // Add the category
            const elements = [renderItem(category.title, true, categoryId)];
            // Add all child blocks
            category.blocks.forEach((block, idx) => {
              const blockId = getId(categoryId, BLOCK_ID_PREFIX, idx);
              if (block.title) {
                elements.push(renderItem(block.title, false, blockId));
              }
            });
            return elements;
          })}
      </ul>
    </div>
  );
}

function renderItem(
  title: string,
  isCategory: boolean,
  redirectItemId: string
): JSX.Element {
  if (!title) {
    return null;
  }
  return (
    <li
      key={randDomId()}
      className={`nav-item ${isCategory ? "category" : ""}`}
    >
      <a href={`#${redirectItemId}`}>{title}</a>
    </li>
  );
}
