/**
 * Copyright 2024 Google LLC
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
 * A container for any tile containing a chart.
 */

import React from "react";

import { Loading } from "../elements/loading";

/**
 * Header with loading indicator
 * @param props.isLoading true if the component is loading
 * @param props.title Header text
 * @returns
 */
export function LoadingHeader(props: {
  isLoading: boolean;
  title?: string;
}): JSX.Element {
  const { isLoading, title } = props;
  return <h4 {...{ part: "header" }}>{isLoading ? <Loading /> : title}</h4>;
}
