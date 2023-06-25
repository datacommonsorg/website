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
import React, { useContext } from "react";

import {
  BLOCK_ID_PREFIX,
  CATEGORY_ID_PREFIX,
} from "../../constants/subject_page_constants";
import { SdgContext } from "../../shared/context";
import { randDomId } from "../../shared/util";
import { CategoryConfig } from "../../types/subject_page_proto_types";
import { getId } from "../../utils/subject_page_utils";

const SDG_ICON_URL_PREFIX =
  "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-";

const SDG_TEXT = [
  "No Poverty",
  "Zero Hunger",
  "Good Health and Well-being",
  "Quality Education",
  "Gender Equality",
  "Clean Water and Sanitation",
  "Affordable and Clean Energy",
  "Decent Work and Economic Growth",
  "Industry Innovation and Infrastructure",
  "Reduced Inequality",
  "Sustainable Cities and Communities",
  "Responsible Consumption and Production",
  "Climate Action",
  "Life Below Water",
  "Life on Land",
  "Peace and Justice Strong Institutions",
  "Partnerships to achieve the Goal<",
];

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
      onClick={() => window.open(`#${redirectItemId}`, "_self")}
    >
      {title}
    </li>
  );
}

export function SdgSubjectPageSidebar(
  props: SubjectPageSidebarPropType
): JSX.Element {
  const { setSdgIndex } = useContext(SdgContext);
  return (
    <div id="subject-page-sidebar">
      <div id="accordionMenu" className="accordion">
        {!_.isEmpty(props.categories) &&
          props.categories.map((category, idx) => {
            const categoryId = getId(props.id, CATEGORY_ID_PREFIX, idx);
            const num = (idx + 1).toString().padStart(2, "0");
            return (
              <div key={categoryId} className="accordion-item">
                <h2 className="accordion-header" id={`heading${idx}`}>
                  <div
                    className="accordion-button collapsed"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapse${idx}`}
                    aria-expanded="false"
                    aria-controls={`collapse${idx}`}
                    onClick={() => setSdgIndex(idx)}
                  >
                    <div className="sidebar-link">
                      <div className="sidebar-link-icon">
                        <img src={`${SDG_ICON_URL_PREFIX}${num}.jpg`} />
                      </div>
                      <div className="sidebar-link-text">{SDG_TEXT[idx]}</div>
                    </div>
                  </div>
                </h2>
                <div
                  id={`collapse${idx}`}
                  className="accordion-collapse collapse"
                  aria-labelledby={`heading${idx}`}
                  data-bs-parent="#accordionMenu"
                >
                  <div className="accordion-body">
                    <ul className="list-unstyled">
                      {category.blocks.map((block, idx) => {
                        const blockId = getId(categoryId, BLOCK_ID_PREFIX, idx);
                        return <li key={blockId}>{block.title}</li>;
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
