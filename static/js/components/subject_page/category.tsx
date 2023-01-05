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
 * Component for rendering a category (a container for blocks).
 */

import React from "react";

import { NamedTypedPlace } from "../../shared/types";
import { randDomId } from "../../shared/util";
import {
  CategoryConfig,
  EventTypeSpec,
} from "../../types/subject_page_proto_types";
import { getRelLink } from "../../utils/subject_page_utils";
import { ErrorBoundary } from "../error_boundary";
import { Block } from "./block";
import { StatVarProvider } from "./stat_var_provider";

export interface CategoryPropType {
  config: CategoryConfig;
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  eventTypeSpec: Record<string, EventTypeSpec>;
}

export function Category(props: CategoryPropType): JSX.Element {
  const svProvider = new StatVarProvider(props.config.statVarSpec);
  return (
    <article
      className="category col-12"
      id={props.config.title ? getRelLink(props.config.title) : randDomId()}
    >
      <h2 className="block-title">{props.config.title}</h2>
      {props.config.description && <p>{props.config.description}</p>}
      {props.config.blocks.map((block) => {
        const id = randDomId();
        return (
          <ErrorBoundary key={id}>
            <Block
              id={block.title ? getRelLink(block.title) : randDomId()}
              place={props.place}
              enclosedPlaceType={props.enclosedPlaceType}
              title={block.title}
              description={block.description}
              columns={block.columns}
              statVarProvider={svProvider}
              eventTypeSpec={props.eventTypeSpec}
            />
          </ErrorBoundary>
        );
      })}
    </article>
  );
}
