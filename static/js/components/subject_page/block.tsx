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
import { BarTile } from "../tiles/bar_tile";
import { BivariateTile } from "../tiles/bivariate_tile";
import { DisasterEventMapTile } from "../tiles/disaster_event_map_tile";
import { HighlightTile } from "../tiles/highlight_tile";
import { LineTile } from "../tiles/line_tile";
import { MapTile } from "../tiles/map_tile";
import { RankingTile } from "../tiles/ranking_tile";
import { ScatterTile } from "../tiles/scatter_tile";
import { StatVarProvider } from "./stat_var_provider";

export interface BlockPropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title?: string;
  description: string;
  columns: ColumnConfig[];
  statVarProvider: StatVarProvider;
  eventTypeSpec: Record<string, EventTypeSpec>;
}

export function Block(props: BlockPropType): JSX.Element {
  const columnWidth = props.columns
    ? `${(100 / props.columns.length).toFixed(2)}%`
    : "0";
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
            return (
              <div
                key={`${props.id}-col-${idx}`}
                className="block-column"
                style={{ width: columnWidth }}
              >
                {renderTiles(column.tiles, props)}
              </div>
            );
          })}
      </div>
    </section>
  );
}

function renderTiles(tiles: TileConfig[], props: BlockPropType): JSX.Element {
  const tilesJsx = tiles.map((tile) => {
    const id = randDomId();
    const enclosedPlaceType = props.enclosedPlaceType;
    const eventTypeSpec = {};

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
          />
        );
      case "BAR":
        return (
          <BarTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey)}
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
          />
        );
      case "DESCRIPTION":
        return (
          <p key={id} className="description-tile">
            {tile.description}
          </p>
        );
      case "DISASTER_EVENT_MAP":
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
      default:
        console.log("Tile type not supported:" + tile.type);
    }
  });
  return <>{tilesJsx}</>;
}
