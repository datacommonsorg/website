/**
 * Copyright 2021 Google LLC
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
 * Component for rendering a block.
 */

import React from "react";

import { NamedTypedPlace } from "../../shared/types";
import { randDomId } from "../../shared/util";
import {
  ColumnConfig,
  EventTypeSpec,
  TileConfig,
} from "../../types/subject_page_proto_types";
import { isNlInterface } from "../../utils/nl_interface_utils";
import { BarTile } from "../tiles/bar_tile";
import { BivariateTile } from "../tiles/bivariate_tile";
import { DisasterEventMapTile } from "../tiles/disaster_event_map_tile";
import { HighlightTile } from "../tiles/highlight_tile";
import { HistogramTile } from "../tiles/histogram_tile";
import { LineTile } from "../tiles/line_tile";
import { MapTile } from "../tiles/map_tile";
import { PlaceOverviewTile } from "../tiles/place_overview_tile";
import { RankingTile } from "../tiles/ranking_tile";
import { ScatterTile } from "../tiles/scatter_tile";
import { StatVarProvider } from "./stat_var_provider";

// Either provide (place, enclosedPlaceType) or provide (places)
export interface BlockPropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title?: string;
  description: string;
  columns: ColumnConfig[];
  statVarProvider: StatVarProvider;
  eventTypeSpec: Record<string, EventTypeSpec>;
  // Height, in px, for the tile SVG charts.
  svgChartHeight: number;
}

const NUM_TILES_SHOWN = 6; // for NL: show 2 rows (3 tiles per row).
const HIDE_TILE_CLASS = "tile-hidden";

export function Block(props: BlockPropType): JSX.Element {
  const columnWidth = props.columns
    ? `${(100 / props.columns.length).toFixed(2)}%`
    : "0";
  // HACK for NL. Assumes all charts are in a single column.
  const showExpando = isNlInterface();
  const minIdxToHide = showExpando ? NUM_TILES_SHOWN : -1;
  return (
    <section
      className={`block subtopic ${props.title ? "" : "notitle"}`}
      id={props.id}
    >
      {props.title && <h3>{props.title}</h3>}
      {props.description && <p className="block-desc">{props.description}</p>}
      <div className="block-body row">
        {props.columns &&
          props.columns.map((column, idx) => {
            const parentId = `${props.id}-col-${idx}`;
            return (
              <div
                key={parentId}
                id={parentId}
                className="block-column"
                style={{ width: columnWidth }}
              >
                {renderTiles(column.tiles, props, minIdxToHide)}
                {showExpando && column.tiles.length > NUM_TILES_SHOWN && (
                  <a className="expando" onClick={expandoCallback}>
                    Show more
                  </a>
                )}
              </div>
            );
          })}
      </div>
    </section>
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

function renderTiles(
  tiles: TileConfig[],
  props: BlockPropType,
  minIdxToHide: number
): JSX.Element {
  if (!tiles) {
    return <></>;
  }
  const tilesJsx = tiles.map((tile, i) => {
    const id = randDomId();
    const enclosedPlaceType = props.enclosedPlaceType;
    const className = i >= minIdxToHide ? HIDE_TILE_CLASS : "";
    switch (tile.type) {
      case "HIGHLIGHT":
        return (
          <HighlightTile
            key={id}
            description={tile.description}
            place={props.place}
            statVarSpec={props.statVarProvider.getSpec(tile.statVarKey[0])}
          />
        );
      case "MAP":
        return (
          <MapTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpec(tile.statVarKey[0])}
            svgChartHeight={props.svgChartHeight}
            className={className}
          />
        );
      case "LINE":
        return (
          <LineTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey)}
            svgChartHeight={props.svgChartHeight}
            className={className}
          />
        );
      case "RANKING":
        return (
          <RankingTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey)}
            rankingMetadata={tile.rankingTileSpec}
            className={className}
          />
        );
      case "BAR":
        return (
          <BarTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            comparisonPlaces={tile.comparisonPlaces}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey)}
            svgChartHeight={props.svgChartHeight}
            className={className}
          />
        );
      case "SCATTER":
        return (
          <ScatterTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey)}
            svgChartHeight={props.svgChartHeight}
            className={className}
          />
        );
      case "BIVARIATE":
        return (
          <BivariateTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey)}
            svgChartHeight={props.svgChartHeight}
            className={className}
          />
        );
      case "DESCRIPTION":
        return (
          <p key={id} className="description-tile">
            {tile.description}
          </p>
        );
      case "DISASTER_EVENT_MAP": {
        const eventTypeSpec = {};
        tile.disasterEventMapTileSpec.eventTypeKeys.forEach(
          (eventKey) =>
            (eventTypeSpec[eventKey] = props.eventTypeSpec[eventKey])
        );
        return (
          <DisasterEventMapTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={enclosedPlaceType}
            eventTypeSpec={eventTypeSpec}
          />
        );
      }
      case "HISTOGRAM":
        return (
          <HistogramTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey)}
            svgChartHeight={props.svgChartHeight}
            className={className}
          />
        );
      case "PLACE_OVERVIEW":
        return <PlaceOverviewTile key={id} place={props.place} />;
      default:
        console.log("Tile type not supported:" + tile.type);
    }
  });
  return <>{tilesJsx}</>;
}
