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

// Import web components
import "../../../library";

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Input, UncontrolledTooltip } from "reactstrap";

import { getVariableNameProcessingFn } from "../../../library/utils";
import { TimeScaleOption } from "../../chart/types";
import { NL_NUM_BLOCKS_SHOWN } from "../../constants/app/explore_constants";
import {
  COLUMN_ID_PREFIX,
  HIDE_COLUMN_CLASS,
  HIDE_TILE_CLASS,
  TILE_ID_PREFIX,
} from "../../constants/subject_page_constants";
import { intl } from "../../i18n/i18n";
import { tileMessages } from "../../i18n/i18n_tile_messages";
import { DATE_HIGHEST_COVERAGE, DATE_LATEST } from "../../shared/constants";
import { NamedPlace, NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { ColumnConfig, TileConfig } from "../../types/subject_page_proto_types";
import { highestCoverageDatesEqualLatestDates } from "../../utils/app/explore_utils";
import { stringifyFn } from "../../utils/axios";
import { isNlInterface } from "../../utils/explore_utils";
import {
  addPerCapitaToTitle,
  addPerCapitaToVersusTitle,
  convertToSortType,
  getColumnTileClassName,
  getColumnWidth,
  getId,
  getMinTileIdxToHide,
} from "../../utils/subject_page_utils";
import {
  getComparisonPlaces,
  getHighlightTileDescription,
} from "../../utils/tile_utils";
import { AnswerMessageTile } from "../tiles/answer_message_tile";
import { AnswerTableTile } from "../tiles/answer_table_tile";
import { BarTile } from "../tiles/bar_tile";
import { BivariateTile } from "../tiles/bivariate_tile";
import { DonutTile } from "../tiles/donut_tile";
import { EntityOverviewTile } from "../tiles/entity_overview_tile";
import { GaugeTile } from "../tiles/gauge_tile";
import { HighlightTile } from "../tiles/highlight_tile";
import { LineTile } from "../tiles/line_tile";
import { MapTile } from "../tiles/map_tile";
import { PlaceOverviewTile } from "../tiles/place_overview_tile";
import { RankingTile } from "../tiles/ranking_tile";
import { ScatterTile } from "../tiles/scatter_tile";
import { Column } from "./column";
import { StatVarProvider } from "./stat_var_provider";

// Lazy load tiles (except map) when they are within 1000px of the viewport
const EXPLORE_LAZY_LOAD_MARGIN = "1000px";

// Lazy load the map tile can be slow, so only load when it directly overlaps
// the viewport
const EXPLORE_LAZY_LOAD_MARGIN_MAP = "0px";

/**
 * Translates the line tile's timeScale enum to the TimeScaleOption type
 */
function getTimeScaleOption(timeScale?: string): TimeScaleOption | undefined {
  if (timeScale === "YEAR") {
    return "year";
  } else if (timeScale === "MONTH") {
    return "month";
  } else if (timeScale === "DAY") {
    return "day";
  }
  return;
}

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
  // Whether to render tiles as web components
  showWebComponents?: boolean;
}

const NO_MAP_TOOL_PLACE_TYPES = new Set(["UNGeoRegion", "GeoRegion"]);

/**
 * Helper for determining if we should snap the charts in this block to the
 * best available coverage
 *
 * Only show the checkbox if:
 * (1) No date is set in the chart config columns (meaning date is "LATEST")
 * (2) Chart types are map and/or ranking
 * @returns boolean
 */
function eligibleForSnapToHighestCoverage(
  columns: ColumnConfig[],
  statVarProvider: StatVarProvider
): boolean {
  const tiles = _.flatten(_.flatten(columns.map((c) => c.tiles)));
  const statVarKeys = _.flatten(tiles.map((tile) => tile.statVarKey));
  const tileTypes = _.flatten(
    _.flatten(columns.map((c) => c.tiles.map((tile) => tile.type)))
  );
  const statVarSpecs = statVarProvider.getSpecList(statVarKeys);

  const isEligibleForSnapToHighestCoverage =
    !_.find<StatVarSpec>(statVarSpecs, (statVarSpec) => !!statVarSpec.date) &&
    !_.find(
      tileTypes,
      (tileType) => tileType !== "MAP" && tileType !== "RANKING"
    );
  return isEligibleForSnapToHighestCoverage;
}

/**
 * Helper for determining if we should enable the "Snap to highest coverage"
 * checkbox.
 *
 * Only enable the checkbox if the observations returned from highest coverage
 * are different from those returned by the latest observation date
 * (when date=LATEST)
 * @returns boolean
 */
async function shouldEnableSnapToHighestCoverage(
  placeDcid: string,
  enclosedPlaceType: string,
  columns: ColumnConfig[],
  statVarProvider: StatVarProvider
): Promise<boolean> {
  // Check if highest coverage & latest date observations are the same
  const tiles = _.flatten(_.flatten(columns.map((c) => c.tiles)));
  const statVarKeys = _.flatten(tiles.map((tile) => tile.statVarKey));
  const statVarSpecs = statVarProvider.getSpecList(statVarKeys);
  const variableDcids = statVarSpecs.map((svs) => svs.statVar);
  const isHighestCoverageDateEqualToLatestDates =
    await highestCoverageDatesEqualLatestDates(
      placeDcid,
      enclosedPlaceType,
      variableDcids
    );

  // Only enable the snap to highest coverage checkbox if the highest coverage
  // and latest date observations are different
  return !isHighestCoverageDateEqualToLatestDates;
}

export function Block(props: BlockPropType): JSX.Element {
  const minIdxToHide = getMinTileIdxToHide();
  const columnWidth = getColumnWidth(props.columns);
  const [overridePlaceTypes, setOverridePlaceTypes] =
    useState<Record<string, NamedTypedPlace>>();
  const [useDenom, setUseDenom] = useState(props.startWithDenom);
  const isEligibleForSnapToHighestCoverage = eligibleForSnapToHighestCoverage(
    props.columns,
    props.statVarProvider
  );
  const [snapToHighestCoverage, setSnapToHighestCoverage] = useState(
    isEligibleForSnapToHighestCoverage
  );
  const [
    showSnapToHighestCoverageCheckbox,
    setShowSnapToHighestCoverageCheckbox,
  ] = useState(false);
  const [enableSnapToLatestData, setEnableSnapToLatestData] = useState(true);
  const columnSectionRef = useRef(null);
  const expandoRef = useRef(null);
  const snapToLatestDataInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overridePlaces = props.columns
      .map((c) => {
        return c.tiles.map((t) => t.placeDcidOverride);
      })
      .flat()
      .filter((name) => !!name);

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

  useEffect(() => {
    if (!isEligibleForSnapToHighestCoverage) {
      return;
    }
    (async () => {
      const enableSnapToHighestCoverage =
        await shouldEnableSnapToHighestCoverage(
          props.place.dcid,
          props.enclosedPlaceType,
          props.columns,
          props.statVarProvider
        );
      setEnableSnapToLatestData(enableSnapToHighestCoverage);
      setShowSnapToHighestCoverageCheckbox(true);
    })();
  }, [props]);

  return (
    <>
      <div className="block-controls">
        {props.denom && (
          <span className="block-toggle">
            <label>
              <Input
                type="checkbox"
                checked={useDenom}
                onChange={() => setUseDenom(!useDenom)}
              />
              <span data-testid="see-per-capita">
                {intl.formatMessage(tileMessages.seePerCapita)}
              </span>
            </label>
          </span>
        )}
        {showSnapToHighestCoverageCheckbox && (
          <span className="block-toggle">
            <label>
              <Input
                checked={snapToHighestCoverage}
                disabled={!enableSnapToLatestData}
                onChange={() =>
                  setSnapToHighestCoverage(!snapToHighestCoverage)
                }
                type="checkbox"
              />
              <span className={enableSnapToLatestData ? "" : "label-disabled"}>
                <FormattedMessage
                  description="Checkbox label for an option that tells a chart visualization to show the latest data available"
                  defaultMessage="Snap to date with highest coverage"
                  id="snap-to-latest-data-checkbox-label"
                />
              </span>
            </label>
            <span className="material-icons" ref={snapToLatestDataInfoRef}>
              help_outlined
            </span>
            <UncontrolledTooltip
              className="dc-tooltip"
              placement="auto"
              target={snapToLatestDataInfoRef}
            >
              {enableSnapToLatestData ? (
                <FormattedMessage
                  description="Informational message for a checkbox titled 'Snap to date with highest coverage' that adjusts what data is displayed in a chart."
                  defaultMessage="'Snap to date with highest coverage' shows the most recent data with maximal coverage. Some places might be missing due to incomplete reporting that year."
                  id="snap-to-latest-data-help-tooltip"
                />
              ) : (
                <FormattedMessage
                  description="Informational message for a disabled checkbox titled 'Snap to date with highest coverage' that adjusts what data is displayed in a chart. The message is explaining that the checkbox is disabled because the highest coverage data overlaps with the most recent data available."
                  defaultMessage="The highest coverage data is also the latest data available for this chart."
                  id="snap-to-latest-data-overlap-help-tooltip"
                />
              )}
            </UncontrolledTooltip>
          </span>
        )}
      </div>
      <div className="block-body row" ref={columnSectionRef}>
        {props.columns &&
          props.columns.map((column, idx) => {
            const id = getId(props.id, COLUMN_ID_PREFIX, idx);
            const columnTileClassName = getColumnTileClassName(column);
            const shouldHideColumn = idx >= minIdxToHide;
            return (
              <Column
                shouldHideColumn={shouldHideColumn}
                key={id}
                id={id}
                config={column}
                width={columnWidth}
                tiles={
                  props.showWebComponents
                    ? renderWebComponents(
                        column.tiles,
                        props,
                        id,
                        minIdxToHide,
                        overridePlaceTypes,
                        columnTileClassName,
                        useDenom ? props.denom : "",
                        snapToHighestCoverage
                          ? DATE_HIGHEST_COVERAGE
                          : undefined
                      )
                    : renderTiles(
                        column.tiles,
                        props,
                        id,
                        minIdxToHide,
                        overridePlaceTypes,
                        columnTileClassName,
                        useDenom ? props.denom : "",
                        snapToHighestCoverage
                          ? DATE_HIGHEST_COVERAGE
                          : undefined
                      )
                }
              />
            );
          })}
      </div>
      {isNlInterface() && props.columns.length > NL_NUM_BLOCKS_SHOWN && (
        <div
          className="show-more-expando"
          onClick={(e) => {
            onShowMore();
            e.preventDefault();
          }}
          ref={expandoRef}
        >
          <span className="material-icons-outlined">expand_circle_down</span>
          <span className="expando-text">Show more</span>
        </div>
      )}
    </>
  );

  // Removes HIDE_COLUMN_CLASS from all columns in this block and hides the
  // show more button.
  function onShowMore() {
    const columns = columnSectionRef.current.getElementsByClassName(
      HIDE_COLUMN_CLASS
    ) as HTMLCollectionOf<HTMLElement>;
    Array.from(columns).forEach((column) => {
      column.classList.remove(HIDE_COLUMN_CLASS);
    });
    expandoRef.current.hidden = true;
  }
}

function renderTiles(
  tiles: TileConfig[],
  props: BlockPropType,
  columnId: string,
  minIdxToHide: number,
  overridePlaces: Record<string, NamedTypedPlace>,
  tileClassName?: string,
  blockDenom?: string,
  blockDate?: string
): JSX.Element {
  if (!tiles || !overridePlaces) {
    return <></>;
  }
  const tilesJsx = tiles.map((tile, i) => {
    const id = getId(columnId, TILE_ID_PREFIX, i);
    const enclosedPlaceType = tile.enclosedPlaceTypeOverride
      ? tile.enclosedPlaceTypeOverride
      : props.enclosedPlaceType;
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
    const comparisonPlaces = getComparisonPlaces(tile, place);
    const className = classNameList.join(" ");
    // TODO(beets): Fix this for ranking tiles with highest/lowest title set.
    let title = blockDenom ? addPerCapitaToTitle(tile.title) : tile.title;
    switch (tile.type) {
      case "HIGHLIGHT": {
        return (
          <HighlightTile
            key={id}
            description={getHighlightTileDescription(tile, blockDenom)}
            place={place}
            statVarSpec={props.statVarProvider.getSpec(tile.statVarKey[0], {
              blockDate,
              blockDenom,
            })}
          />
        );
      }

      case "MAP":
        return (
          <MapTile
            key={id}
            id={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN_MAP}
            title={title}
            subtitle={tile.subtitle}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={props.statVarProvider.getSpec(tile.statVarKey[0], {
              blockDate,
              blockDenom,
            })}
            svgChartHeight={props.svgChartHeight}
            className={className}
            showExploreMore={
              props.showExploreMore &&
              props.place.types.every(
                (type) => !NO_MAP_TOOL_PLACE_TYPES.has(type)
              )
            }
            geoJsonProp={tile.mapTileSpec?.geoJsonProp}
            placeNameProp={tile.placeNameProp}
            parentPlaces={props.parentPlaces}
            allowZoom={true}
            colors={tile.mapTileSpec?.colors}
            footnote={props.footnote}
          />
        );
      case "LINE":
        return (
          <LineTile
            key={id}
            id={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN}
            title={title}
            subtitle={tile.subtitle}
            place={place}
            comparisonPlaces={comparisonPlaces}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey, {
              blockDate,
              blockDenom,
            })}
            svgChartHeight={props.svgChartHeight}
            className={className}
            showExploreMore={props.showExploreMore}
            showTooltipOnHover={true}
            colors={tile.lineTileSpec?.colors}
            footnote={props.footnote}
            timeScale={getTimeScaleOption(tile.lineTileSpec?.timeScale)}
            placeNameProp={tile.placeNameProp}
            getProcessedSVNameFn={getVariableNameProcessingFn(
              tile.lineTileSpec?.variableNameRegex,
              tile.lineTileSpec?.defaultVariableName
            )}
            startDate={tile.lineTileSpec?.startDate}
            endDate={tile.lineTileSpec?.endDate}
            highlightDate={tile.lineTileSpec?.highlightDate}
          />
        );
      case "RANKING":
        return (
          <RankingTile
            key={id}
            id={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN}
            title={title}
            parentPlace={place.dcid}
            enclosedPlaceType={enclosedPlaceType}
            variables={props.statVarProvider.getSpecList(tile.statVarKey, {
              blockDate,
              blockDenom,
            })}
            rankingMetadata={tile.rankingTileSpec}
            className={className}
            showExploreMore={props.showExploreMore}
            hideFooter={tile.hideFooter}
            footnote={
              blockDate == DATE_LATEST
                ? intl.formatMessage(tileMessages.rankingTileLatestDataFooter)
                : blockDate === DATE_HIGHEST_COVERAGE
                ? intl.formatMessage(
                    tileMessages.rankingTileLatestDataAvailableFooter
                  )
                : undefined
            }
          />
        );
      case "BAR":
        return (
          <BarTile
            barHeight={tile.barTileSpec?.barHeight}
            colors={tile.barTileSpec?.colors}
            className={className}
            enclosedPlaceType={enclosedPlaceType}
            footnote={props.footnote}
            horizontal={tile.barTileSpec?.horizontal}
            id={id}
            key={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN}
            maxPlaces={tile.barTileSpec?.maxPlaces}
            maxVariables={tile.barTileSpec?.maxVariables}
            parentPlace={place.dcid}
            places={comparisonPlaces}
            showExploreMore={props.showExploreMore}
            sort={convertToSortType(tile.barTileSpec?.sort)}
            showTooltipOnHover={true}
            stacked={tile.barTileSpec?.stacked}
            subtitle={tile.subtitle}
            svgChartHeight={props.svgChartHeight}
            title={title}
            useLollipop={tile.barTileSpec?.useLollipop}
            variables={props.statVarProvider.getSpecList(tile.statVarKey, {
              blockDate,
              blockDenom,
            })}
            xLabelLinkRoot={tile.barTileSpec?.xLabelLinkRoot}
            yAxisMargin={tile.barTileSpec?.yAxisMargin}
            placeNameProp={tile.placeNameProp}
            getProcessedSVNameFn={getVariableNameProcessingFn(
              tile.barTileSpec?.variableNameRegex,
              tile.barTileSpec?.defaultVariableName
            )}
          />
        );
      case "SCATTER": {
        const statVarSpec = props.statVarProvider.getSpecList(tile.statVarKey, {
          blockDate,
          blockDenom,
        });
        title = blockDenom
          ? addPerCapitaToVersusTitle(tile.title, statVarSpec)
          : tile.title;
        return (
          <ScatterTile
            key={id}
            id={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN}
            title={title}
            subtitle={tile.subtitle}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={statVarSpec}
            svgChartHeight={
              isNlInterface() ? props.svgChartHeight * 2 : props.svgChartHeight
            }
            className={className}
            scatterTileSpec={tile.scatterTileSpec}
            showExploreMore={props.showExploreMore}
            footnote={props.footnote}
            placeNameProp={tile.placeNameProp}
          />
        );
      }

      case "BIVARIATE": {
        const statVarSpec = props.statVarProvider.getSpecList(tile.statVarKey, {
          blockDate,
          blockDenom,
        });
        title = blockDenom
          ? addPerCapitaToVersusTitle(tile.title, statVarSpec)
          : tile.title;
        return (
          <BivariateTile
            key={id}
            id={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN}
            title={title}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={statVarSpec}
            svgChartHeight={props.svgChartHeight}
            className={className}
            showExploreMore={props.showExploreMore}
          />
        );
      }
      case "GAUGE":
        return (
          <GaugeTile
            colors={tile.gaugeTileSpec?.colors}
            footnote={props.footnote}
            key={id}
            id={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN}
            place={place}
            /* "min: 0" value are stripped out when loading text protobufs, so add them back in here */
            range={{
              max: tile.gaugeTileSpec.range.max,
              min: tile.gaugeTileSpec.range.min || 0,
            }}
            statVarSpec={props.statVarProvider.getSpec(tile.statVarKey[0], {
              blockDate,
              blockDenom,
            })}
            svgChartHeight={props.svgChartHeight}
            title={title}
            subtitle={tile.subtitle}
          ></GaugeTile>
        );
      case "DONUT":
        return (
          <DonutTile
            colors={tile.donutTileSpec?.colors}
            footnote={props.footnote}
            id={id}
            lazyLoad={true}
            lazyLoadMargin={EXPLORE_LAZY_LOAD_MARGIN}
            key={`${id}-2`}
            pie={tile.donutTileSpec?.pie}
            place={place}
            statVarSpec={props.statVarProvider.getSpecList(tile.statVarKey, {
              blockDate,
              blockDenom,
            })}
            svgChartHeight={props.svgChartHeight}
            title={title}
            subtitle={tile.subtitle}
          ></DonutTile>
        );
      case "DESCRIPTION":
        return (
          <p key={id} className="description-tile">
            {tile.description}
          </p>
        );
      case "PLACE_OVERVIEW":
        // TODO(gmechali): Switch to server-side redirection
        return <PlaceOverviewTile key={id} place={place} />;
      case "ANSWER_MESSAGE":
        return (
          <AnswerMessageTile
            key={id}
            title={tile.title}
            entity={!_.isEmpty(tile.entities) ? tile.entities[0] : ""}
            propertyExpr={tile.answerMessageTileSpec.propertyExpr}
            displayValue={tile.answerMessageTileSpec.displayValue}
          />
        );
      case "ANSWER_TABLE":
        return (
          <AnswerTableTile
            columns={tile.answerTableTileSpec.columns}
            entities={tile.entities}
            key={id}
            title={tile.title}
          />
        );
      case "ENTITY_OVERVIEW":
        return (
          <EntityOverviewTile
            key={id}
            entity={!_.isEmpty(tile.entities) ? tile.entities[0] : ""}
          />
        );
      default:
        console.log("Tile type not supported:" + tile.type);
    }
  });
  if (tilesJsx.length > 1) {
    return (
      <div className="row">
        {tilesJsx.map((tileJsx, tileJsxIndex) => (
          <div key={tileJsxIndex} className="col-md-6">
            {tileJsx}
          </div>
        ))}
      </div>
    );
  }
  return <>{tilesJsx}</>;
}

function renderWebComponents(
  tiles: TileConfig[],
  props: BlockPropType,
  columnId: string,
  minIdxToHide: number,
  overridePlaces: Record<string, NamedTypedPlace>,
  tileClassName?: string,
  blockDenom?: string,
  blockDate?: string
): JSX.Element {
  if (!tiles || !overridePlaces) {
    return <></>;
  }
  const tilesJsx = tiles.map((tile, i) => {
    const id = getId(columnId, TILE_ID_PREFIX, i);
    const enclosedPlaceType = tile.enclosedPlaceTypeOverride
      ? tile.enclosedPlaceTypeOverride
      : props.enclosedPlaceType;
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
    const comparisonPlaces = getComparisonPlaces(tile, place);
    const className = classNameList.join(" ");
    // TODO(beets): Fix this for ranking tiles with highest/lowest title set.
    const title = blockDenom ? addPerCapitaToTitle(tile.title) : tile.title;
    switch (tile.type) {
      case "HIGHLIGHT": {
        let description = tile.description.includes("${date}")
          ? tile.description
          : tile.description + " (${date})";
        description = blockDenom
          ? addPerCapitaToTitle(description)
          : description;
        return (
          <datacommons-highlight
            key={id}
            id={id}
            description={description}
            place={place.dcid}
            variable={
              props.statVarProvider.getSpec(tile.statVarKey[0], {
                blockDate,
                blockDenom,
              }).statVar
            }
          />
        );
      }
      case "MAP":
        return (
          <datacommons-map
            key={id}
            id={id}
            header={title}
            subheader={tile.subtitle}
            parentPlace={place.dcid}
            childPlaceType={enclosedPlaceType}
            variable={
              props.statVarProvider.getSpec(tile.statVarKey[0], {
                blockDate,
                blockDenom,
              }).statVar
            }
            className={className}
            {...(props.showExploreMore &&
            props.place.types.every(
              (type) => !NO_MAP_TOOL_PLACE_TYPES.has(type)
            )
              ? { showExploreMore: true }
              : {})}
            {...(tile.mapTileSpec?.geoJsonProp
              ? { geoJsonProp: tile.mapTileSpec?.geoJsonProp }
              : {})}
            {...(tile.placeNameProp ? { placeNameProp: true } : {})}
            parentPlaces={props.parentPlaces}
            allowZoom={true}
            {...(tile.mapTileSpec?.colors
              ? { colors: tile.mapTileSpec?.colors.join(" ") }
              : {})}
            colors={tile.mapTileSpec?.colors}
          />
        );
      case "LINE":
        return (
          <datacommons-line
            key={id}
            id={id}
            header={title}
            subheader={tile.subtitle}
            parentPlace={place.dcid}
            {...(comparisonPlaces
              ? { places: comparisonPlaces.join(" ") }
              : {})}
            variables={props.statVarProvider
              .getSpecList(tile.statVarKey, { blockDate, blockDenom })
              .map((sv) => sv.statVar)
              .join(" ")}
            className={className}
            showExploreMore={props.showExploreMore}
            {...(tile.lineTileSpec?.colors
              ? { colors: tile.lineTileSpec?.colors.join(" ") }
              : {})}
            footnote={props.footnote}
            timeScale={getTimeScaleOption(tile.lineTileSpec?.timeScale)}
            placeNameProp={tile.placeNameProp}
            getProcessedSVNameFn={getVariableNameProcessingFn(
              tile.lineTileSpec?.variableNameRegex,
              tile.lineTileSpec?.defaultVariableName
            )}
          />
        );
      case "RANKING":
        return (
          <datacommons-ranking
            key={id}
            id={id}
            header={title}
            parentPlace={place.dcid}
            childPlaceType={enclosedPlaceType}
            variables={props.statVarProvider
              .getSpecList(tile.statVarKey, { blockDate, blockDenom })
              .map((sv) => sv.statVar)
              .join(" ")}
            {...(tile.rankingTileSpec?.highestTitle
              ? { highestTitle: true }
              : {})}
            {...(tile.rankingTileSpec?.lowestTitle
              ? { lowestTitle: true }
              : {})}
            {...(tile.rankingTileSpec?.rankingCount
              ? { rankingCount: true }
              : {})}
            {...(tile.rankingTileSpec?.showHighestLowest
              ? { showHighestLowest: true }
              : {})}
            {...(tile.rankingTileSpec?.showLowest ? { showLowest: true } : {})}
            {...(tile.rankingTileSpec?.showHighest
              ? { showHighest: true }
              : {})}
            {...(tile.rankingTileSpec?.showMultiColumn
              ? { showMultiColumn: true }
              : {})}
            className={className}
            {...(props.showExploreMore ? { showExploreMore: true } : {})}
            {...(tile.hideFooter ? { hideFooter: true } : {})}
          />
        );
      case "BAR":
        return (
          <datacommons-bar
            {...(tile.barTileSpec?.colors
              ? { colors: tile.barTileSpec?.colors.join(" ") }
              : {})}
            className={className}
            childPlaceType={enclosedPlaceType}
            horizontal={tile.barTileSpec?.horizontal}
            id={id}
            key={id}
            {...(tile.barTileSpec?.maxPlaces
              ? { maxPlaces: tile.barTileSpec?.maxPlaces }
              : {})}
            {...(tile.barTileSpec?.maxVariables
              ? { maxVariables: tile.barTileSpec?.maxVariables }
              : {})}
            parentPlace={place.dcid}
            {...(comparisonPlaces
              ? { places: comparisonPlaces.join(" ") }
              : {})}
            showExploreMore={props.showExploreMore}
            sort={convertToSortType(tile.barTileSpec?.sort)}
            {...(tile.barTileSpec?.stacked ? { stacked: true } : {})}
            subheader={tile.subtitle}
            header={title}
            {...(tile.barTileSpec?.useLollipop ? { useLollipop: true } : {})}
            variables={props.statVarProvider
              .getSpecList(tile.statVarKey, { blockDate, blockDenom })
              .map((sv) => sv.statVar)
              .join(" ")}
            xLabelLinkRoot={tile.barTileSpec?.xLabelLinkRoot}
            {...(tile.barTileSpec?.yAxisMargin ? { yAxisMargin: true } : {})}
            placeNameProp={tile.placeNameProp}
            {...(tile.barTileSpec?.variableNameRegex
              ? { variableNameRegex: tile.barTileSpec?.variableNameRegex }
              : {})}
            {...(tile.barTileSpec?.defaultVariableName
              ? { defaultVariableName: tile.barTileSpec?.defaultVariableName }
              : {})}
          />
        );
      case "SCATTER": {
        const statVarSpec = props.statVarProvider.getSpecList(tile.statVarKey, {
          blockDate,
          blockDenom,
        });
        const title = blockDenom
          ? addPerCapitaToVersusTitle(tile.title, statVarSpec)
          : tile.title;
        return (
          <datacommons-scatter
            key={id}
            id={id}
            header={title}
            subheader={tile.subtitle}
            parentPlace={place.dcid}
            childPlaceType={enclosedPlaceType}
            variables={statVarSpec.map((sv) => sv.statVar).join(" ")}
            usePerCapita={statVarSpec
              .map((sv) => (sv.denom ? sv.statVar : ""))
              .join(" ")}
            className={className}
            {...(tile.scatterTileSpec?.highlightBottomLeft
              ? { highlightBottomLeft: true }
              : {})}
            {...(tile.scatterTileSpec?.highlightBottomRight
              ? { highlightBottomRight: true }
              : {})}
            {...(tile.scatterTileSpec?.highlightTopLeft
              ? { highlightTopLeft: true }
              : {})}
            {...(tile.scatterTileSpec?.highlightTopRight
              ? { highlightTopRight: true }
              : {})}
            {...(tile.scatterTileSpec?.showPlaceLabels
              ? { showPlaceLabels: true }
              : {})}
            {...(tile.scatterTileSpec?.showQuadrants
              ? { showQuadrants: true }
              : {})}
            showExploreMore={props.showExploreMore}
            placeNameProp={tile.placeNameProp}
          />
        );
      }

      case "BIVARIATE": {
        const statVarSpec = props.statVarProvider.getSpecList(tile.statVarKey, {
          blockDate,
          blockDenom,
        });
        const title = blockDenom
          ? addPerCapitaToVersusTitle(tile.title, statVarSpec)
          : tile.title;
        return (
          <BivariateTile
            key={id}
            id={id}
            title={title}
            place={place}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={statVarSpec}
            svgChartHeight={props.svgChartHeight}
            className={className}
            showExploreMore={props.showExploreMore}
          />
        );
      }

      case "GAUGE":
        return (
          <datacommons-gauge
            {...(tile.gaugeTileSpec?.colors
              ? { colors: tile.gaugeTileSpec?.colors.join(" ") }
              : {})}
            key={id}
            id={id}
            place={place.dcid}
            /* "min: 0" value are stripped out when loading text protobufs, so add them back in here */
            min={tile.gaugeTileSpec?.range.min || 0}
            max={tile.gaugeTileSpec?.range.max}
            variable={
              props.statVarProvider.getSpec(tile.statVarKey[0], {
                blockDate,
                blockDenom,
              }).statVar
            }
            header={title}
            subheader={tile.subtitle}
          />
        );
      case "DONUT":
        return (
          <datacommons-pie
            {...(tile.gaugeTileSpec?.colors
              ? { colors: tile.donutTileSpec?.colors.join(" ") }
              : {})}
            key={id}
            id={id}
            donut={!tile.donutTileSpec?.pie}
            place={place.dcid}
            variables={props.statVarProvider
              .getSpecList(tile.statVarKey, { blockDate, blockDenom })
              .map((sv) => sv.statVar)
              .join(" ")}
            header={title}
            subheader={tile.subtitle}
          />
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
