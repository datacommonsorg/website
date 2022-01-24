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

import { NamedTypedPlace } from "../shared/types";
import { randDomId } from "../shared/util";
import { StatVarMetadata } from "../types/stat_var";
import { BarTile } from "./bar_tile";
import { BivariateTile } from "./bivariate_tile";
import { HighlightTile } from "./highlight_tile";
import { LineTile } from "./line_tile";
import { MapTile } from "./map_tile";
import { RankingTile } from "./ranking_tile";
import { ScatterTile } from "./scatter_tile";
import { Tile } from "./tile";

export interface BlockPropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title: string;
  description: string;
  leftTiles: Tile[];
  rightTiles: Tile[];
  statVarMetadata: StatVarMetadata[];
}

export function Block(props: BlockPropType): JSX.Element {
  return (
    <section className="block subtopic col-12">
      {props.title && <h2 className="block-title">{props.title}</h2>}
      {props.description && <p className="block-desc">{props.description}</p>}
      <div className="block-body row">
        <div className="left-tiles col-6">
          {renderTiles(props.leftTiles, props)}
        </div>
        <div className="right-tiles col-6">
          {renderTiles(props.rightTiles, props)}
        </div>
      </div>
    </section>
  );
}

function renderTiles(tiles: Tile[], props: BlockPropType): JSX.Element {
  const tilesJsx = tiles.map((tile) => {
    const id = randDomId();
    switch (tile.type) {
      case "HIGHLIGHT":
        return (
          <HighlightTile
            key={id}
            description={tile.description}
            place={props.place}
            statVarMetadata={tile.statVarOverride ? tile.statVarOverride : props.statVarMetadata}
          />
        );
      case "MAP":
        return (
          <MapTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={props.enclosedPlaceType}
            statVarMetadata={tile.statVarOverride ? tile.statVarOverride : props.statVarMetadata}
          />
        );
      case "LINE":
        return (
          <LineTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            statVarMetadata={tile.statVarOverride ? tile.statVarOverride : props.statVarMetadata}
          />
        );
      case "RANKING":
        return (
          <RankingTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={props.enclosedPlaceType}
            statVarMetadata={tile.statVarOverride ? tile.statVarOverride : props.statVarMetadata}
            rankingMetadata={tile.rankingMetadata}
          />
        );
      case "BAR":
        return (
          <BarTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={props.enclosedPlaceType}
            statVarMetadata={tile.statVarOverride ? tile.statVarOverride : props.statVarMetadata}
          />
        );
      case "SCATTER":
        return (
          <ScatterTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={props.enclosedPlaceType}
            statVarMetadata={tile.statVarOverride ? tile.statVarOverride : props.statVarMetadata}
          />
        );
      case "BIVARIATE":
        return (
          <BivariateTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={props.enclosedPlaceType}
            statVarMetadata={tile.statVarOverride ? tile.statVarOverride : props.statVarMetadata}
          />
        );
      default:
        console.log("Tile type not supported:" + tile.type);
    }
  });
  return <>{tilesJsx}</>;
}
