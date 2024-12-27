/**
 * Copyright 2024 Google LLC
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

/* Functions for getting the result for the /nodejs/query endpoint */

import axios from "axios";
import _ from "lodash";

import {
  fetchDisasterEventData,
  getBlockEventTypeSpecs,
} from "../js/components/subject_page/disaster_event_block";
import { StatVarProvider } from "../js/components/subject_page/stat_var_provider";
import {
  NamedTypedNode,
  NamedTypedPlace,
  StatVarSpec,
} from "../js/shared/types";
import {
  BlockConfig,
  EventTypeSpec,
} from "../js/types/subject_page_proto_types";
import {
  getDate,
  getSeverityFilters,
} from "../js/utils/disaster_event_map_utils";
import {
  getHighlightTileDescription,
  getTileEventTypeSpecs,
} from "../js/utils/tile_utils";
import { BARD_CLIENT_URL_PARAM, TOOLFORMER_RIG_MODE } from "./constants";
import { getBarTileResult } from "./tiles/bar_tile";
import { getDisasterMapTileResult } from "./tiles/disaster_map_tile";
import { getHighlightTileResult } from "./tiles/highlight_tile";
import { getLineTileResult } from "./tiles/line_tile";
import { getMapTileResult } from "./tiles/map_tile";
import { getRankingTileResult } from "./tiles/ranking_tile";
import { getScatterTileResult } from "./tiles/scatter_tile";
import { QueryResult, TileResult } from "./types";

const NS_TO_MS_SCALE_FACTOR = BigInt(1000000);
const MS_TO_S_SCALE_FACTOR = 1000;
const QUERY_MAX_RESULTS = 3;
// Allowed chart types if mode is Bard.
const BARD_ALLOWED_CHARTS = new Set(["LINE", "BAR", "RANKING", "SCATTER"]);
// Allowed chart types if mode is toolformer rig
const TOOLFORMER_RIG_ALLOWED_CHARTS = new Set(["LINE", "HIGHLIGHT"]);
// The root to use to form the dc link in the tile results
// TODO: update this to use bard.datacommons.org
const DC_URL_ROOT = "https://datacommons.org/explore#q=";
// Detector to use when handling nl queries
const QUERY_DETECTOR = "heuristic";
// Number of related questions to return
const NUM_RELATED_QUESTIONS = 6;

// Get the elapsed time in seconds given the start and end times in nanoseconds.
function getElapsedTime(startTime: bigint, endTime: bigint): number {
  // Dividing bigints will cause decimals to be lost. Therefore, convert ns to
  // ms first and convert that to number type. Then convert the ms to s to get
  // seconds with decimal precision.
  return (
    Number((endTime - startTime) / NS_TO_MS_SCALE_FACTOR) / MS_TO_S_SCALE_FACTOR
  );
}

// Get a list of tile result promises for all the tiles in the block
function getBlockTileResults(
  id: string,
  block: BlockConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  svSpec: Record<string, StatVarSpec>,
  urlRoot: string,
  useChartUrl: boolean,
  apikey: string,
  apiRoot: string,
  allowedTilesTypes?: Set<string>,
  mode?: string
): Promise<TileResult[] | TileResult>[] {
  const tilePromises = [];
  const svProvider = new StatVarProvider(svSpec);
  const blockDenom = block.startWithDenom ? block.denom : "";
  block.columns.forEach((column, colIdx) => {
    column.tiles.forEach((tile, tileIdx) => {
      if (allowedTilesTypes && !allowedTilesTypes.has(tile.type)) {
        return;
      }
      const tileId = `${id}-col${colIdx}-tile${tileIdx}`;
      let tileSvSpec = null;
      switch (tile.type) {
        case "LINE":
          tileSvSpec = svProvider.getSpecList(tile.statVarKey, { blockDenom });
          tilePromises.push(
            getLineTileResult(
              tileId,
              tile,
              place,
              tileSvSpec,
              apiRoot,
              urlRoot,
              useChartUrl,
              apikey,
              mode
            )
          );
          break;
        case "SCATTER":
          tileSvSpec = svProvider.getSpecList(tile.statVarKey, { blockDenom });
          tilePromises.push(
            getScatterTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileSvSpec,
              apiRoot,
              urlRoot,
              useChartUrl,
              apikey
            )
          );
          break;
        case "BAR":
          tileSvSpec = svProvider.getSpecList(tile.statVarKey, { blockDenom });
          tilePromises.push(
            getBarTileResult(
              tileId,
              tile,
              place.dcid,
              enclosedPlaceType,
              tileSvSpec,
              apiRoot,
              urlRoot,
              useChartUrl,
              apikey,
              mode
            )
          );
          break;
        case "MAP":
          tileSvSpec = svProvider.getSpec(tile.statVarKey[0], { blockDenom });
          tilePromises.push(
            getMapTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileSvSpec,
              apiRoot,
              urlRoot,
              useChartUrl,
              apikey
            )
          );
          break;
        case "RANKING":
          tileSvSpec = svProvider.getSpecList(tile.statVarKey, { blockDenom });
          tilePromises.push(
            getRankingTileResult(
              tileId,
              tile,
              place.dcid,
              enclosedPlaceType,
              tileSvSpec,
              apiRoot
            )
          );
          break;
        case "HIGHLIGHT":
          tileSvSpec = svProvider.getSpec(tile.statVarKey[0], { blockDenom });
          tile.description = getHighlightTileDescription(tile, blockDenom);
          tilePromises.push(
            getHighlightTileResult(tileId, tile, place, tileSvSpec, apiRoot)
          );
          break;
        default:
          break;
      }
    });
  });
  return tilePromises;
}

// Get a list of tile result promises for all the tiles in the disaster block
function getDisasterBlockTileResults(
  id: string,
  block: BlockConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  eventTypeSpec: Record<string, EventTypeSpec>,
  urlRoot: string,
  useChartUrl: boolean,
  apikey: string,
  apiRoot: string,
  allowedTilesTypes?: Set<string>
): Promise<TileResult>[] {
  const blockEventTypeSpec = getBlockEventTypeSpecs(
    eventTypeSpec,
    block.columns
  );
  const disasterEventDataPromise = fetchDisasterEventData(
    blockEventTypeSpec,
    place.dcid,
    getDate(id, block.disasterBlockSpec || {}, place),
    getSeverityFilters(eventTypeSpec, id),
    null,
    apiRoot
  );
  const tilePromises = [];
  block.columns.forEach((column, colIdx) => {
    column.tiles.forEach((tile, tileIdx) => {
      if (allowedTilesTypes && !allowedTilesTypes.has(tile.type)) {
        return;
      }
      const tileEventTypeSpec = getTileEventTypeSpecs(eventTypeSpec, tile);
      const tileId = `${id}-col${colIdx}-tile${tileIdx}`;
      switch (tile.type) {
        case "DISASTER_EVENT_MAP":
          tilePromises.push(
            getDisasterMapTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileEventTypeSpec,
              disasterEventDataPromise,
              apiRoot,
              urlRoot,
              useChartUrl,
              apikey
            )
          );
        default:
          return null;
      }
    });
  });
  return tilePromises;
}

// Takes related things and constructs related questions
function getRelatedQuestions(
  relatedThings: Record<string, Array<any>>,
  place: NamedTypedNode
): string[] {
  const relatedQuestions = [];
  const relatedTopics = [
    ...(relatedThings["childTopics"] || []),
    ...(relatedThings["peerTopics"] || []),
  ];

  // Alternate getting topics from the front and the end of the list to get a
  // mix of questions using child and peer topics.
  let getFromFront = true;
  while (
    !_.isEmpty(relatedTopics) &&
    relatedQuestions.length < NUM_RELATED_QUESTIONS
  ) {
    const topic = getFromFront ? relatedTopics.shift() : relatedTopics.pop();
    if (!("name" in topic)) {
      continue;
    }
    const topicString = (topic["name"] as string).toLowerCase();
    relatedQuestions.push(`Tell me about ${topicString} in ${place.name}`);
    getFromFront = !getFromFront;
  }
  return relatedQuestions;
}

// The handler that gets the result for the /nodejs/query endpoint
export async function getQueryResult(
  query: string,
  useChartUrl: boolean,
  allResults: boolean,
  apiRoot: string,
  apikey: string,
  urlRoot: string,
  client: string,
  mode: string,
  varThreshold: string,
  wantRelatedQuestions: boolean,
  idx?: string
): Promise<QueryResult> {
  const startTime = process.hrtime.bigint();

  let allowedTileTypes = null;
  // if mode is empty or mode=bard, use BARD_ALLOWED_CHARTS
  // if mode=toolformer_rig, use TOOLFORMER_RIG_ALLOWED_CHARTS
  if (!mode || mode === BARD_CLIENT_URL_PARAM) {
    allowedTileTypes = BARD_ALLOWED_CHARTS;
  } else if (mode === TOOLFORMER_RIG_MODE) {
    allowedTileTypes = TOOLFORMER_RIG_ALLOWED_CHARTS;
  }

  // Get the nl detect-and-fulfill result for the query
  // TODO: only generate related things when we need to generate related question
  let nlResp = null;
  let url = `${apiRoot}/api/explore/detect-and-fulfill?q=${query}&detector=${QUERY_DETECTOR}`;
  const params = {
    client,
    idx,
    mode,
    skipRelatedThings: wantRelatedQuestions ? "" : "true",
    varThreshold,
  };
  Object.keys(params)
    .sort()
    .forEach((urlKey) => {
      if (!params[urlKey]) {
        return;
      }
      url += `&${urlKey}=${params[urlKey]}`;
    });
  try {
    nlResp = await axios.post(url, {});
  } catch (e) {
    console.error("Error making request:\n", e.message);
    return { err: "Error fetching data." };
  }

  // process the nl result
  const nlResultTime = process.hrtime.bigint();
  const mainPlace = nlResp.data["place"] || {};
  const place = {
    dcid: mainPlace["dcid"],
    name: mainPlace["name"],
    types: [mainPlace["place_type"]],
  };
  const config = nlResp.data["config"] || {};
  let enclosedPlaceType = "";
  if (
    config["metadata"] &&
    config["metadata"]["containedPlaceTypes"] &&
    !_.isEmpty(place.types)
  ) {
    enclosedPlaceType =
      config["metadata"]["containedPlaceTypes"][place.types[0]] ||
      enclosedPlaceType;
  }
  const relatedThings = nlResp.data["relatedThings"] || {};

  // If no place, return here
  if (!place.dcid) {
    return { charts: [] };
  }

  // Get a list of tile result promises that will return a result for each
  // tile from the nl result
  const tilePromises: Array<Promise<TileResult[] | TileResult>> = [];
  const categories = config["categories"] || [];
  categories.forEach((category, catIdx) => {
    if (!allResults && tilePromises.length >= QUERY_MAX_RESULTS) {
      return;
    }
    const svSpec = {};
    for (const sv in category["statVarSpec"]) {
      svSpec[sv] = category["statVarSpec"][sv];
    }
    category.blocks.forEach((block, blkIdx) => {
      if (!allResults && tilePromises.length >= QUERY_MAX_RESULTS) {
        return;
      }
      const blockId = `cat${catIdx}-blk${blkIdx}`;
      let blockTilePromises = [];
      switch (block.type) {
        case "DISASTER_EVENT":
          blockTilePromises = getDisasterBlockTileResults(
            blockId,
            block,
            place,
            enclosedPlaceType,
            config["metadata"]["eventTypeSpec"],
            urlRoot,
            useChartUrl,
            apikey,
            apiRoot,
            allowedTileTypes
          );
          break;
        default:
          blockTilePromises = getBlockTileResults(
            blockId,
            block,
            place,
            enclosedPlaceType,
            svSpec,
            urlRoot,
            useChartUrl,
            apikey,
            apiRoot,
            allowedTileTypes,
            mode
          );
      }
      tilePromises.push(...blockTilePromises);
    });
  });

  // If no tile result promises return here.
  if (tilePromises.length < 1) {
    return { charts: [] };
  }

  // Wait for the tile results
  let tileResults = [];
  try {
    tileResults = await Promise.all(tilePromises);
  } catch (e) {
    return { err: "Error fetching data." };
  }

  // Process the tile results
  const processedResults = tileResults
    .flat(1)
    .filter((result) => result !== null);
  processedResults.forEach((result) => {
    result.dcUrl = DC_URL_ROOT + encodeURIComponent(query as string);
  });
  const endTime = process.hrtime.bigint();
  const debug = {
    debug: nlResp.data["debug"] || {},
    timing: {
      getNlResult: getElapsedTime(startTime, nlResultTime),
      getTileResults: getElapsedTime(nlResultTime, endTime),
      total: getElapsedTime(startTime, endTime),
    },
    websiteCommit: process.env.WEBSITE_HASH || "",
  };
  const result: QueryResult = { charts: processedResults, debug };
  if (wantRelatedQuestions) {
    result.relatedQuestions = getRelatedQuestions(relatedThings, place);
  }
  return result;
}
