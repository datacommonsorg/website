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

import React, { useRef } from "react";

import { NL_NUM_TILES_SHOWN } from "../../constants/app/explore_constants";
import {
  HIDE_COLUMN_CLASS,
  HIDE_TILE_CLASS,
} from "../../constants/subject_page_constants";
import { ColumnConfig } from "../../types/subject_page_proto_types";
import { isNlInterface } from "../../utils/explore_utils";

export interface ColumnPropType {
  // id for the column
  id: string;
  // config for the column
  config: ColumnConfig;
  // width of the column
  width: string;
  // tiles to render within the column
  tiles: JSX.Element;
  shouldHideColumn?: boolean;
}

export function Column(props: ColumnPropType): JSX.Element {
  const expandoRef = useRef(null);
  const tileSectionRef = useRef(null);

  return (
    <div
      key={props.id}
      id={props.id}
      className={`${
        props.shouldHideColumn ? HIDE_COLUMN_CLASS : ""
      } block-column`}
      style={{ width: props.width }}
      ref={tileSectionRef}
    >
      {props.tiles}
      {isNlInterface() && props.config.tiles.length > NL_NUM_TILES_SHOWN && (
        <a
          className="show-more-expando"
          onClick={(e): void => {
            onShowMore();
            e.preventDefault();
          }}
          ref={expandoRef}
        >
          <span className="material-icons-outlined">expand_circle_down</span>
          <span className="expando-text">Show more</span>
        </a>
      )}
    </div>
  );

  // Removes HIDE_TILE_CLASS from all tiles in the column and hides the show
  // more button.
  function onShowMore(): void {
    const tiles = tileSectionRef.current.getElementsByClassName(
      HIDE_TILE_CLASS
    ) as HTMLCollectionOf<HTMLElement>;
    Array.from(tiles).forEach((tile) => {
      tile.classList.remove(HIDE_TILE_CLASS);
    });
    expandoRef.current.hidden = true;
  }
}
