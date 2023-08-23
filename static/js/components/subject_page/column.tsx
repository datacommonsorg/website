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
 * Component for rendering a column in a disaster type block.
 */

import React from "react";

import { NL_NUM_TILES_SHOWN } from "../../constants/app/nl_interface_constants";
import { HIDE_TILE_CLASS } from "../../constants/subject_page_constants";
import { ColumnConfig } from "../../types/subject_page_proto_types";
import { isNlInterface } from "../../utils/nl_interface_utils";

export interface ColumnPropType {
  // id for the column
  id: string;
  // config for the column
  config: ColumnConfig;
  // width of the column
  width: string;
  // tiles to render within the column
  tiles: JSX.Element;
  className?: string;
}

export function Column(props: ColumnPropType): JSX.Element {
  return (
    <div
      key={props.id}
      id={props.id}
      className={`${props.className} block-column`}
      style={{ width: props.width }}
    >
      {props.tiles}
      {isNlInterface() && props.config.tiles.length > NL_NUM_TILES_SHOWN && (
        <a className="expando" onClick={expandoCallback}>
          Show more
        </a>
      )}
    </div>
  );
}

const expandoCallback = function (e) {
  // Callback to remove HIDE_TILE_CLASS from all sibling elements. Assumes
  // target link is the child of the container with elements to toggle.
  const selfEl = e.target as HTMLAnchorElement;
  const parentEl = selfEl.parentElement;
  const tiles = parentEl.getElementsByClassName(
    HIDE_TILE_CLASS
  ) as HTMLCollectionOf<HTMLElement>;
  for (let i = 0; i < tiles.length; i++) {
    tiles[i].classList.remove(HIDE_TILE_CLASS);
  }
  selfEl.hidden = true;
  e.preventDefault();
};
