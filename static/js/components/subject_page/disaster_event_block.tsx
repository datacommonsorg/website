/**
 * Copyright 2023 Google LLC
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
 * Component for rendering a disaster type block.
 */

import React, { memo, useContext, useEffect, useRef, useState } from "react";

import {
  COLUMN_ID_PREFIX,
  HIDE_TILE_CLASS,
  TILE_ID_PREFIX,
} from "../../constants/subject_page_constants";
import { NamedNode, NamedTypedPlace } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import {
  DisasterDataOptions,
  DisasterEventPointData,
} from "../../types/disaster_event_map_types";
import {
  ColumnConfig,
  EventTypeSpec,
  TileConfig,
} from "../../types/subject_page_proto_types";
import {
  fetchDisasterEventPoints,
  getDate,
  getSeverityFilters,
  getUseCache,
} from "../../utils/disaster_event_map_utils";
import {
  getColumnTileClassName,
  getColumnWidth,
  getId,
  getMinTileIdxToHide,
} from "../../utils/subject_page_utils";
import { getTileEventTypeSpecs } from "../../utils/tile_utils";
import { DisasterEventMapFilters } from "../tiles/disaster_event_map_filters";
import { DisasterEventMapSelectors } from "../tiles/disaster_event_map_selectors";
import { DisasterEventMapTile } from "../tiles/disaster_event_map_tile";
import { HistogramTile } from "../tiles/histogram_tile";
import { TopEventTile } from "../tiles/top_event_tile";
import { Column } from "./column";
import { DataFetchContext } from "./data_fetch_context";

// Either provide (place, enclosedPlaceType) or provide (places)
interface DisasterEventBlockPropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title?: string;
  description: string;
  columns: ColumnConfig[];
  eventTypeSpec: Record<string, EventTypeSpec>;
  footnote?: string;
  parentPlaces?: NamedNode[];
  // API root
  apiRoot?: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
}

const DEFAULT_FILTER_SECTION_HEIGHT = 400;
export const DisasterEventBlock = memo(function DisasterEventBlock(
  props: DisasterEventBlockPropType
): JSX.Element {
  const blockBodyRef = useRef<HTMLDivElement>(null);
  const blockEventTypeSpecs = useRef<Record<string, EventTypeSpec>>(
    getBlockEventTypeSpecs(props.eventTypeSpec, props.columns)
  );
  const [disasterEventData, setDisasterEventData] =
    useState<Record<string, DisasterEventPointData>>(null);
  const [filterSectionHeight, setFilterSectionHeight] = useState(
    DEFAULT_FILTER_SECTION_HEIGHT
  );
  const [showFilters, setShowFilters] = useState(false);
  const { fetchData } = useContext(DataFetchContext);

  useEffect(() => {
    // when showFilters is toggled, calculate what the filter section height
    // should be.
    if (
      blockBodyRef.current &&
      blockBodyRef.current.offsetHeight !== filterSectionHeight
    ) {
      setFilterSectionHeight(blockBodyRef.current.offsetHeight);
    }
  }, [showFilters]);

  useEffect(() => {
    // when props change, update the block specific event type specs and
    // re-fetch data.
    blockEventTypeSpecs.current = getBlockEventTypeSpecs(
      props.eventTypeSpec,
      props.columns
    );
    fetchDisasterEventData(props, fetchData).then((disasterData) => {
      setDisasterEventData(disasterData);
    });

    function handleHashChange() {
      const spinnerId = getSpinnerId();
      loadSpinner(spinnerId);
      fetchDisasterEventData(props, fetchData).then((disasterData) => {
        setDisasterEventData(disasterData);
        removeSpinner(spinnerId);
      });
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [props]);

  const columnWidth = getColumnWidth(props.columns);
  const minIdxToHide = getMinTileIdxToHide();
  return (
    <>
      <DisasterEventMapSelectors
        blockId={props.id}
        eventTypeSpec={blockEventTypeSpecs.current}
        place={props.place}
      >
        <div
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <i className="material-icons">tune</i>
        </div>
      </DisasterEventMapSelectors>
      {showFilters && (
        <DisasterEventMapFilters
          eventTypeSpec={blockEventTypeSpecs.current}
          blockId={props.id}
        />
      )}
      <div className="block-body row" ref={blockBodyRef}>
        <div className="block-column-container row">
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
                    disasterEventData,
                    columnTileClassName
                  )}
                />
              );
            })}
          <div id={getSpinnerId()}>
            <div className="screen">
              <div id="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  function getSpinnerId(): string {
    return `${props.id}-spinner`;
  }
});

// Gets the cache key to use for the disaster data fetch
function getDataFetchCacheKey(dataOptions: DisasterDataOptions): string {
  const severityFilter =
    dataOptions.severityFilters[dataOptions.eventTypeSpec.id] || null;
  const cacheKeyParams = {
    specId: dataOptions.eventTypeSpec.id,
    date: dataOptions.selectedDate,
    filterProp: severityFilter && severityFilter.prop,
    filterUnit: severityFilter && severityFilter.unit,
    filterUpper: severityFilter && severityFilter.upperLimit,
    filterLower: severityFilter && severityFilter.lowerLimit,
    useCache: dataOptions.useCache,
    place: dataOptions.place,
  };
  let cacheKey = "";
  Object.keys(cacheKeyParams)
    .sort()
    .forEach((key) => {
      if (cacheKeyParams[key]) {
        cacheKey += `&${key}=${cacheKeyParams[key]}`;
      }
    });
  return cacheKey;
}

/**
 * Fetches disaster event data for a disaster event block
 * @param props the props for a disaster event block
 * @param fetchData function to use to fetch data with a given cache key and
 *                  data promise
 */
export function fetchDisasterEventData(
  props: DisasterEventBlockPropType,
  fetchData?: (
    cacheKey: string,
    dataPromise: () => Promise<any>
  ) => Promise<any>
): Promise<Record<string, DisasterEventPointData>> {
  const promises = [];
  // list of spec ids that correspond to the spec id used for the promise at
  // that index in the list of promises.
  const specIds = [];
  const blockEventTypeSpecs = getBlockEventTypeSpecs(
    props.eventTypeSpec,
    props.columns
  );
  Object.values(blockEventTypeSpecs).forEach((spec) => {
    const specDataOptions = {
      eventTypeSpec: spec,
      selectedDate: getDate(props.id),
      severityFilters: getSeverityFilters(props.eventTypeSpec, props.id),
      useCache: getUseCache(),
      place: props.place.dcid,
    };
    specIds.push(spec.id);
    const cacheKey = getDataFetchCacheKey(specDataOptions);
    const promiseFn = () =>
      fetchDisasterEventPoints(specDataOptions, props.apiRoot);
    const promise = fetchData ? fetchData(cacheKey, promiseFn) : promiseFn();
    promises.push(promise);
  });
  if (!promises) {
    return Promise.resolve({});
  }
  return Promise.all(promises)
    .then((resp) => {
      const result = {};
      resp.forEach((disasterDataResp, i) => {
        result[specIds[i]] = disasterDataResp;
      });
      return result;
    })
    .catch(() => {
      return {};
    });
}

// Gets all the relevant event type specs for a list of columns
function getBlockEventTypeSpecs(
  fullEventTypeSpec: Record<string, EventTypeSpec>,
  columns: ColumnConfig[]
): Record<string, EventTypeSpec> {
  const relevantEventSpecs: Record<string, EventTypeSpec> = {};
  for (const column of columns) {
    for (const t of column.tiles) {
      const tileSpecs = getTileEventTypeSpecs(fullEventTypeSpec, t);
      Object.assign(relevantEventSpecs, tileSpecs);
    }
  }
  return relevantEventSpecs;
}

function renderTiles(
  tiles: TileConfig[],
  props: DisasterEventBlockPropType,
  columnId: string,
  minIdxToHide: number,
  disasterEventData: Record<string, DisasterEventPointData>,
  tileClassName?: string
): JSX.Element {
  if (!tiles) {
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
    const className = classNameList.join(" ");
    switch (tile.type) {
      case "DISASTER_EVENT_MAP": {
        const eventTypeSpec = getTileEventTypeSpecs(props.eventTypeSpec, tile);
        let tileEventData = null;
        if (disasterEventData) {
          tileEventData = {};
          Object.keys(eventTypeSpec).forEach((specId) => {
            tileEventData[specId] = disasterEventData[specId];
          });
        }
        return (
          <DisasterEventMapTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            enclosedPlaceType={enclosedPlaceType}
            eventTypeSpec={eventTypeSpec}
            disasterEventData={tileEventData}
            tileSpec={tile.disasterEventMapTileSpec}
            parentPlaces={props.parentPlaces}
            showExploreMore={props.showExploreMore}
          />
        );
      }
      case "HISTOGRAM": {
        const eventTypeSpec =
          props.eventTypeSpec[tile.histogramTileSpec.eventTypeKey];
        let tileEventData = null;
        if (disasterEventData) {
          tileEventData =
            disasterEventData[tile.histogramTileSpec.eventTypeKey];
        }
        return (
          <HistogramTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            selectedDate={getDate(props.id)}
            eventTypeSpec={eventTypeSpec}
            property={tile.histogramTileSpec.prop}
            disasterEventData={tileEventData}
            showExploreMore={props.showExploreMore}
          />
        );
      }
      case "TOP_EVENT": {
        const eventTypeSpec =
          props.eventTypeSpec[tile.topEventTileSpec.eventTypeKey];
        let tileEventData = null;
        if (disasterEventData) {
          tileEventData = disasterEventData[tile.topEventTileSpec.eventTypeKey];
        }
        return (
          <TopEventTile
            key={id}
            id={id}
            title={tile.title}
            place={props.place}
            topEventMetadata={tile.topEventTileSpec}
            className={className}
            eventTypeSpec={eventTypeSpec}
            disasterEventData={tileEventData}
            enclosedPlaceType={enclosedPlaceType}
            showExploreMore={props.showExploreMore}
          />
        );
      }
      default:
        console.log("Tile type not supported:" + tile.type);
    }
  });
  return <>{tilesJsx}</>;
}
