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
 * Component for rendering a text tile.
 */

import React from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";

export interface TextTilePropType {
  // url to link to under "see more"
  link?: string;
}

export function TextTile(props: TextTilePropType): JSX.Element {
  return (
    <div
      className={`chart-container text-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
      {...{ part: "container" }}
    >
      <div className="text-header" {...{ part: "heading" }}>
        <slot name="heading" />
      </div>
      <div className="text-body" {...{ part: "text" }}>
        <slot name="text" />
      </div>
      {props.link && (
        <div className="text-link" {...{ part: "link" }}>
          <a href={props.link} target="_blank" rel="noreferrer">
            See more
          </a>
        </div>
      )}
    </div>
  );
}
