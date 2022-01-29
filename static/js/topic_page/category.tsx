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
 * Component for rendering a section (a container for blocks).
 */

import React from "react";

import { ErrorBoundary } from "../shared/error_boundary";
import { NamedTypedPlace } from "../shared/types";
import { randDomId } from "../shared/util";
import { Block, BlockPropType } from "./block";
import { getRelLink } from "./string_utils";

export interface Category {
  title: string;
  description?: string;
  blocks: BlockPropType[];
}

export interface CategoryPropType {
  config: Category;
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  enclosedPlaceType: string;
}

export function Category(props: CategoryPropType): JSX.Element {
  return (
    <article className="category col-12" id={getRelLink(props.config.title)}>
      <h2 className="block-title">{props.config.title}</h2>
      {props.config.description && <p>props.description</p>}
      {props.config.blocks.map((block) => {
        const id = randDomId();
        return (
          <ErrorBoundary key={id}>
            <Block
              id={getRelLink(block.title)}
              place={props.place}
              enclosedPlaceType={props.enclosedPlaceType}
              title={block.title}
              description={block.description}
              leftTiles={block.leftTiles}
              rightTiles={block.rightTiles}
              statVarMetadata={block.statVarMetadata}
            />
          </ErrorBoundary>
        );
      })}
    </article>
  );
}
