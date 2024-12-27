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

import { BLOCK_ID_PREFIX } from "../../constants/subject_page_constants";
import { NamedPlace, NamedTypedPlace, StatVarSpec } from "../../shared/types";
import {
  CategoryConfig,
  EventTypeSpec,
} from "../../types/subject_page_proto_types";
import { getId } from "../../utils/subject_page_utils";
import { formatString, ReplacementStrings } from "../../utils/tile_utils";
import { ErrorBoundary } from "../error_boundary";
import { Block } from "./block";
import { BlockContainer } from "./block_container";
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
  parentPlaces?: NamedPlace[];
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // Whether to render tiles as web components
  showWebComponents?: boolean;
}

export const Category = memo(function Category(
  props: CategoryPropType
): JSX.Element {
  const svProvider = new StatVarProvider(props.config.statVarSpec || {});
  const rs: ReplacementStrings = {
    placeName: props.place.name,
    placeDcid: props.place ? props.place.dcid : "",
  };
  const title = props.config.title ? formatString(props.config.title, rs) : "";
  const description = props.config.description
    ? formatString(props.config.description, rs)
    : "";
  return (
    <article className="category col-12" id={props.id}>
      {title && (
        <h2 className="block-title">
          {props.config.url && <a href={props.config.url}>{title}</a>}
          {!props.config.url && <span>{title}</span>}
        </h2>
      )}
      {globalThis.viaGoogle && (
        <p>
          This data was imported by the Google DataCommons team. For more info,
          see <a href="https://datacommons.org">Datacommons.org</a>.
        </p>
      )}
      {description && <ReactMarkdown>{description}</ReactMarkdown>}
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
  const visitedSV: Set<string> = new Set();
  const blocksJsx = props.config.blocks.map((block, i) => {
    const id = getId(props.id, BLOCK_ID_PREFIX, i);
    const commonSVSpec: StatVarSpec[] = [];
    for (const column of block.columns) {
      for (const tile of column.tiles) {
        if (!tile.statVarKey) {
          continue;
        }
        for (const k of tile.statVarKey) {
          const svSpec = svProvider.getSpec(k, { blockDenom: block.denom });
          if (visitedSV.has(svSpec.statVar)) {
            continue;
          }
          visitedSV.add(svSpec.statVar);
          commonSVSpec.push(svSpec);
        }
      }
    }
    switch (block.type) {
      case "DISASTER_EVENT":
        return (
          <ErrorBoundary key={id} customError={<></>}>
            <BlockContainer
              id={id}
              title={block.title}
              description={block.description}
              footnote={block.footnote}
              place={props.place}
            >
              <DisasterEventBlock
                id={id}
                place={props.place}
                enclosedPlaceType={props.enclosedPlaceType}
                title={block.title}
                description={block.description}
                columns={block.columns}
                eventTypeSpec={props.eventTypeSpec}
                showExploreMore={props.showExploreMore}
                disasterBlockMetadata={block.disasterBlockSpec || {}}
              />
            </BlockContainer>
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary key={id} customError={<></>}>
            <BlockContainer
              id={id}
              title={block.title}
              description={block.description}
              place={props.place}
              commonSVSpec={commonSVSpec}
              infoMessage={block.infoMessage}
            >
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
                showExploreMore={props.showExploreMore}
                parentPlaces={props.parentPlaces}
                denom={block.denom}
                startWithDenom={block.startWithDenom}
                showWebComponents={props.showWebComponents}
              />
            </BlockContainer>
          </ErrorBoundary>
        );
    }
  });
  return <>{blocksJsx}</>;
}
