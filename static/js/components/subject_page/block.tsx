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
 * Component for rendering a default block (block with no type).
 */

import axios from "axios";
import React, { useEffect, useState } from "react";

import {
  COLUMN_ID_PREFIX,
  HIDE_TILE_CLASS,
  SELF_PLACE_DCID_PLACEHOLDER,
  TILE_ID_PREFIX,
} from "../../constants/subject_page_constants";
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { ColumnConfig, TileConfig } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { isNlInterface } from "../../utils/nl_interface_utils";
import {
  getColumnTileClassName,
  getColumnWidth,
  getId,
  getMinTileIdxToHide,
} from "../../utils/subject_page_utils";
import { BarTile } from "../tiles/bar_tile";
import { BivariateTile } from "../tiles/bivariate_tile";
import { DonutTile } from "../tiles/donut_tile";
import { GaugeTile } from "../tiles/gauge_tile";
import { HighlightTile } from "../tiles/highlight_tile";
import { LineTile } from "../tiles/line_tile";
import { MapTile } from "../tiles/map_tile";
import { PlaceOverviewTile } from "../tiles/place_overview_tile";
import { RankingTile } from "../tiles/ranking_tile";
import { ScatterTile } from "../tiles/scatter_tile";
import { Column } from "./column";
import { StatVarProvider } from "./stat_var_provider";

// Either provide (place, enclosedPlaceType) or provide (places)
export interface BlockPropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title?: string;
  description: string;
  footnote?: string;
  columns: ColumnConfig[];
  statVarProvider: StatVarProvider;
  // Height, in px, for the tile SVG charts.
  svgChartHeight: number;
  parentPlaces?: NamedPlace[];
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  denom?: string;
  startWithDenom?: boolean;
}

export function Block(props: BlockPropType): JSX.Element {
  const minIdxToHide = getMinTileIdxToHide();
  const columnWidth = getColumnWidth(props.columns);
  const [overridePlaceTypes, setOverridePlaceTypes] =
    useState<Record<string, NamedTypedPlace>>();
  const [useDenom, setUseDenom] = useState(props.startWithDenom);

  useEffect(() => {
    const overridePlaces = props.columns
      .map((c) => {
        return c.tiles.map((t) => t.placeDcidOverride);
      })
      .flat();

    if (!overridePlaces.length) {
      setOverridePlaceTypes({});
      return;
    }
    // TODO: Use getNamedTypedPlace and add support for multiple places there.
    axios
      .get("/api/place/named_typed", {
        params: {
          dcids: overridePlaces,
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        setOverridePlaceTypes(resp.data);
      });
  }, [props]);

  return (
    <>
      {props.denom && (
        <div className="block-per-capita-toggle">
          <span
            className={`material-icons-outlined ${
              useDenom ? "toggle-on" : "toggle-off"
            }`}
            onClick={() => setUseDenom(!useDenom)}
          >
            {useDenom ? "toggle_on" : "toggle_off"}
          </span>
          <span>Per Capita</span>
        </div>
      )}
      <div className="block-body row">
        {props.columns &&
          props.columns.map((column, idx) => {
            const id = getId(props.id, COLUMN_ID_PREFIX, idx);
            const columnTileClassName = getColumnTileClassName(column);
            return (
              <Column
                key={id}
                id={id}
                config={column}
                width={columnWidth}
                tiles={renderTiles(
                  column.tiles,
                  props,
                  id,
                  minIdxToHide,
                  overridePlaceTypes,
                  columnTileClassName,
                  useDenom ? props.denom : ""
                )}
              />
            );
          })}
      </div>
    </>
  );
}

function renderTiles(
  tiles: TileConfig[],
  props: BlockPropType,
  columnId: string,
  minIdxToHide: number,
  overridePlaces: Record<string, NamedTypedPlace>,
  tileClassName?: string,
  blockDenom?: string
): JSX.Element {
  if (!tiles || !overridePlaces) {
    return <></>;
  }
  const tilesJsx = tiles.map((tile, i) => {
    const id = getId(columnId, TILE_ID_PREFIX, i);
    const enclosedPlaceType = props.enclosedPlaceType;
    const classNameList = [];
    if (tileClassName) {
      classNameList.push(tileClassName);
    }
    if (i >= minIdxToHide) {
      classNameList.push(HIDE_TILE_CLASS);
    }
    const place = tile.placeDcidOverride
      ? overridePlaces[tile.placeDcidOverride]
      : props.place;
    const comparisonPlaces = tile.comparisonPlaces
      ? tile.comparisonPlaces.map((p) =>
          p == SELF_PLACE_DCID_PLACEHOLDER ? place.dcid : p
        )
      : undefined;
    const className = classNameList.join(" ");
    switch (tile.type) {
      case "HIGHLIGHT":
        return (
          <HighlightTile
            key={id}
            description={tile.description}
            place={place}
            statVarSpec={props.statVarProvider.getSpec(
              tile.statVarKey[0],
              blockDenom
            )}
          />
        );
      case "MAP":
        return (
          <MapTile
            key={id}
            id={id}
            title={tile.title}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpec(
              tile.statVarKey[0],
              blockDenom
            )}
            svgChartHeight={props.svgChartHeight}
            className={className}
            showExploreMore={props.showExploreMore}
            parentPlaces={props.parentPlaces}
          />
        );
      case "LINE":
        return (
          <LineTile
            key={id}
            id={id}
            title={tile.title}
            place={place}
            statVarSpec={props.statVarProvider.getSpecList(
              tile.statVarKey,
              blockDenom
            )}
            svgChartHeight={props.svgChartHeight}
            className={className}
            showExploreMore={props.showExploreMore}
            showTooltipOnHover={true}
            colors={tile.lineTileSpec?.colors}
          />
        );
      case "RANKING":
        return (
          <RankingTile
            key={id}
            id={id}
            title={tile.title}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(
              tile.statVarKey,
              blockDenom
            )}
            rankingMetadata={tile.rankingTileSpec}
            className={className}
            showExploreMore={props.showExploreMore}
          />
        );
      case "BAR":
        return (
          <BarTile
            key={id}
            id={id}
            title={tile.title}
            place={place}
            comparisonPlaces={comparisonPlaces}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(
              tile.statVarKey,
              blockDenom
            )}
            svgChartHeight={props.svgChartHeight}
            className={className}
            tileSpec={tile.barTileSpec}
            showExploreMore={props.showExploreMore}
          />
        );
      case "SCATTER":
        return (
          <ScatterTile
            key={id}
            id={id}
            title={tile.title}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(
              tile.statVarKey,
              blockDenom
            )}
            svgChartHeight={
              isNlInterface() ? props.svgChartHeight * 2 : props.svgChartHeight
            }
            className={className}
            scatterTileSpec={tile.scatterTileSpec}
            showExploreMore={props.showExploreMore}
          />
        );
      case "BIVARIATE":
        return (
          <BivariateTile
            key={id}
            id={id}
            title={tile.title}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpecList(
              tile.statVarKey,
              blockDenom
            )}
            svgChartHeight={props.svgChartHeight}
            className={className}
            showExploreMore={props.showExploreMore}
          />
        );
      case "GAUGE":
        return (
          <GaugeTile
            colors={tile.gaugeTileSpec?.colors}
            id={id}
            minSvgChartHeight={props.svgChartHeight}
            place={place}
            range={tile.gaugeTileSpec.range}
            statVarSpec={props.statVarProvider.getSpec(
              tile.statVarKey[0],
              blockDenom
            )}
            title={tile.title}
          ></GaugeTile>
        );
      case "DONUT":
        return (
          <DonutTile
            colors={tile.donutTileSpec?.colors}
            id={id}
            pie={tile.donutTileSpec?.pie}
            place={place}
            statVarSpec={props.statVarProvider.getSpecList(
              tile.statVarKey,
              blockDenom
            )}
            svgChartHeight={props.svgChartHeight}
            title={tile.title}
          ></DonutTile>
        );
      case "DESCRIPTION":
        return (
          <p key={id} className="description-tile">
            {tile.description}
          </p>
        );
      case "PLACE_OVERVIEW":
        return <PlaceOverviewTile key={id} place={place} />;
      default:
        console.log("Tile type not supported:" + tile.type);
    }
  });
  return <>{tilesJsx}</>;
}
