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

import _ from "lodash";

import { StatMetadata } from "../../shared/stat_types";
import {
  BQ_QUERY_HEADER_COMMENT,
  getSvMetadataPredicate,
} from "../shared/bq_utils";
import { PlaceInfo, StatVar } from "./context";

const LATEST_OBS_DATE_VIEW_NAME = "LatestObsDate";
const CHILD_PLACE_VIEW_NAME = "ChildPlace";
const PODDR_VIEW_NAME = "PlaceObsDatesAndDenomRank";

function getOptionalPredicates(
  tableName: string,
  date: string,
  metadata: StatMetadata,
  skipDatePredicate: boolean
): string {
  let predicate = "";
  if (!_.isEmpty(date) && !skipDatePredicate) {
    predicate += ` AND\n${tableName}.observation_date = '${date}'`;
  } else if (!_.isEmpty(metadata) && !skipDatePredicate) {
    predicate += ` AND\n${tableName}.observation_date = ${LATEST_OBS_DATE_VIEW_NAME}.LatestDate`;
  }
  if (!_.isEmpty(metadata)) {
    predicate += ` AND\n${getSvMetadataPredicate(tableName, metadata)}`;
  }
  if (!_.isEmpty(date) && _.isEmpty(metadata)) {
    predicate += ` AND\n${tableName}.facet_rank = 1`;
  }
  if (_.isEmpty(date) && _.isEmpty(metadata)) {
    predicate += ` AND\n${tableName}.is_preferred_obs_across_facets`;
  }
  return predicate;
}

function getChildPlaceView(place: PlaceInfo): string {
  return (
    `WITH ${CHILD_PLACE_VIEW_NAME} AS (` +
    `
  SELECT id AS PlaceId FROM \`data_commons.Place\`
  WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = '${place.enclosedPlaceType}') AND
  EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = '${place.enclosingPlace.dcid}')
)`
  );
}

function getLatestObsDateView(
  sv: StatVar,
  place: PlaceInfo,
  metadata: StatMetadata
): string {
  return (
    `WITH ${LATEST_OBS_DATE_VIEW_NAME} AS (` +
    `
  ${getChildPlaceView(place)}
  SELECT O.variable_measured as StatVarId,
        O.observation_about as PlaceId,
        MAX(O.Observation_date) as LatestDate
  FROM \`data_commons.Observation\` as O
  JOIN ${CHILD_PLACE_VIEW_NAME} ON TRUE
  WHERE ${getSvMetadataPredicate("O", metadata)} AND
        O.variable_measured = '${sv.dcid}' AND
        O.observation_about = ${CHILD_PLACE_VIEW_NAME}.PlaceId
  GROUP BY StatVarId, PlaceId
)`
  );
}

function getPlaceObsDatesAndDenomRankView(
  sv: StatVar,
  place: PlaceInfo,
  date: string,
  metadata: StatMetadata
): string {
  const tempViewName =
    _.isEmpty(date) && !_.isEmpty(metadata)
      ? LATEST_OBS_DATE_VIEW_NAME
      : CHILD_PLACE_VIEW_NAME;
  const tempView =
    tempViewName === LATEST_OBS_DATE_VIEW_NAME
      ? getLatestObsDateView(sv, place, metadata)
      : getChildPlaceView(place);
  const optionalPredicates = getOptionalPredicates(
    "ONum",
    date,
    metadata,
    false
  );
  let query =
    `WITH ${PODDR_VIEW_NAME} AS (` +
    `
  ${tempView}
  SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
  FROM \`data_commons.Observation\` AS ONum
  JOIN \`data_commons.Observation\` AS ODenom ON TRUE
  JOIN ${tempViewName} ON TRUE
  WHERE
      ONum.observation_about = ${tempViewName}.PlaceId AND
      ONum.variable_measured = '${sv.dcid}' AND
      ODenom.observation_about = ONum.observation_about AND
      ODenom.variable_measured = '${sv.denom}' AND
      ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4)`;
  if (optionalPredicates) {
    query += optionalPredicates;
  }
  query +=
    "\nGROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate)";
  return query;
}

export function getPcQuery(
  sv: StatVar,
  place: PlaceInfo,
  date: string,
  metadata: StatMetadata
): string {
  const optionalPredicates = getOptionalPredicates(
    "ONum",
    date,
    metadata,
    true
  );
  let query =
    BQ_QUERY_HEADER_COMMENT +
    `
${getPlaceObsDatesAndDenomRankView(sv, place, date, metadata)}
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.observation_date AS LatestDate,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS ValuePerCapita,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      ODenom.value AS DenomValue,
      ODenom.observation_date AS DenomDate,     
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
WHERE PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank AND
      ONum.observation_about = P.id AND
      ONum.prov_id = I.id`;
  if (optionalPredicates) {
    query += optionalPredicates;
  }
  query += "\nORDER BY PlaceName";
  return query;
}

export function getNonPcQuery(
  sv: StatVar,
  place: PlaceInfo,
  date: string,
  metadata: StatMetadata
): string {
  const tempViewName =
    _.isEmpty(date) && !_.isEmpty(metadata)
      ? LATEST_OBS_DATE_VIEW_NAME
      : CHILD_PLACE_VIEW_NAME;
  const tempView =
    tempViewName === LATEST_OBS_DATE_VIEW_NAME
      ? getLatestObsDateView(sv, place, metadata)
      : getChildPlaceView(place);
  const optionalPredicates = getOptionalPredicates("O", date, metadata, false);
  let query =
    BQ_QUERY_HEADER_COMMENT +
    `
${tempView}
SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.observation_date AS LatestDate,
      CAST(O.value AS FLOAT64) AS Value,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source
FROM \`data_commons.Observation\` AS O
JOIN ${tempViewName} ON TRUE
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
WHERE O.variable_measured = '${sv.dcid}' AND
      O.observation_about = ${tempViewName}.PlaceId AND
      O.observation_about = P.id AND
      O.prov_id = I.id`;
  if (optionalPredicates) {
    query += optionalPredicates;
  }
  query += "\nORDER BY PlaceName";

  return query;
}
