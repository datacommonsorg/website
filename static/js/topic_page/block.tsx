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

import { randDomId } from "../shared/util";
import { StatVarMetadata } from "../types/stat_var";
import { BarTile } from "./bar_tile";
import { HighlightTile } from "./highlight_tile";
import { LineTile } from "./line_tile";
import { MapTile } from "./map_tile";
import { RankingTile } from "./ranking_tile";
import { Tile } from "./tile";

export interface BlockPropType {
  id: string;
  placeDcid: string;
  enclosedPlaceType: string;
  title: string;
  description: string;
  leftTiles: Tile[];
  rightTiles: Tile[];
  statVarMetadata: StatVarMetadata;
}

export function Block(props: BlockPropType): JSX.Element {
  return (
    <section className="block subtopic col-12">
      <h3 className="block-title">{props.title}</h3>
      <div className="block-body row">
        <div className="left-tiles col-6">{renderTiles(props.leftTiles, props)}</div>
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
            placeDcid={props.placeDcid}
            statVarMetadata={props.statVarMetadata}
          />
        );
      case "MAP":
        return (
          <MapTile
            key={id}
            id={id}
            title={tile.title}
            placeDcid={props.placeDcid}
            enclosedPlaceType={props.enclosedPlaceType}
            isUsaPlace={true}
            statVarMetadata={props.statVarMetadata}
          />
        );
      case "LINE":
        return (
          <LineTile
            key={id}
            id={id}
            title={tile.title}
            placeDcid={props.placeDcid}
            statVarMetadata={props.statVarMetadata}
          />
        );
      case "RANKING":
        return (
          <RankingTile
            key={id}
            id={id}
            title={tile.title}
            placeDcid={props.placeDcid}
            enclosedPlaceType={props.enclosedPlaceType}
            statVarMetadata={props.statVarMetadata}
            rankingMetadata={tile.rankingMetadata}
          />
        );
      case "BAR":
        return (
          <BarTile
            key={id}
            id={id}
            title={tile.title}
            placeDcid={props.placeDcid}
            enclosedPlaceType={props.enclosedPlaceType}
            statVarMetadata={props.statVarMetadata}
          />
        );
      default:
        console.log("Tile type not supported:" + tile.type);
    }
  });
  return <>{tilesJsx}</>;
}
