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

import React from "react";
import ReactDOM from "react-dom";

import { Page, RankingPagePropType } from "./ranking_page";

/**
 * Export the component so this can be used as a library in a static page.
 *
 * Note this is also used to render the "ranking" page directly.
 *
 * @param element DOM element to render the chart
 * @param props ranking component properties
 */
export const renderRankingComponent = (
  element: HTMLElement,
  props: RankingPagePropType
): void => {
  ReactDOM.render(React.createElement(Page, props), element);
};
