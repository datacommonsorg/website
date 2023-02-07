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

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";

import { NamedTypedPlace } from "../../shared/types";
import { randDomId } from "../../shared/util";
import {
  CategoryConfig,
  EventTypeSpec,
} from "../../types/subject_page_proto_types";
import { getRelLink } from "../../utils/subject_page_utils";
import { ErrorBoundary } from "../error_boundary";
import { Block } from "./block";
import { DisasterEventBlock } from "./disaster_event_block";
import { StatVarProvider } from "./stat_var_provider";

export interface CategoryPropType {
  id: string;
  config: CategoryConfig;
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  eventTypeSpec: Record<string, EventTypeSpec>;
  // Height, in px, for the tile SVG charts.
  svgChartHeight: number;
}

export const Category = memo(function Category(
  props: CategoryPropType
): JSX.Element {
  const svProvider = new StatVarProvider(props.config.statVarSpec);
  return (
    <article
      className="category col-12"
      id={props.config.title ? getRelLink(props.config.title) : randDomId()}
    >
      {props.config.title && (
        <h2 className="block-title">{props.config.title}</h2>
      )}
      {props.config.description && (
        <ReactMarkdown>{props.config.description}</ReactMarkdown>
      )}
      {renderBlocks(props, svProvider)}
    </article>
  );
});

function renderBlocks(
  props: CategoryPropType,
  svProvider: StatVarProvider
): JSX.Element {
  if (!props.config.blocks) {
    return <></>;
  }
  const blocksJsx = props.config.blocks.map((block, i) => {
    const id = block.title ? getRelLink(block.title) : `${props.id}blk${i}`;
    switch (block.type) {
      case "DISASTER_EVENT":
        return (
          <ErrorBoundary key={id}>
            <DisasterEventBlock
              id={id}
              place={props.place}
              enclosedPlaceType={props.enclosedPlaceType}
              title={block.title}
              description={block.description}
              footnote={block.footnote}
              columns={block.columns}
              eventTypeSpec={props.eventTypeSpec}
            />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary key={id}>
            <Block
              id={id}
              place={props.place}
              enclosedPlaceType={props.enclosedPlaceType}
              title={block.title}
              description={block.description}
              footnote={block.footnote}
              columns={block.columns}
              statVarProvider={svProvider}
              svgChartHeight={props.svgChartHeight}
            />
          </ErrorBoundary>
        );
    }
  });
  return <>{blocksJsx}</>;
}
