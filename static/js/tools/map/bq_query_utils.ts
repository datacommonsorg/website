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
import { getSvMetadataPredicates } from "../shared/bq_utils";
import { PlaceInfo, StatVar } from "./context";

const LATEST_OBS_DATE_VIEW_NAME = "LatestObsDate";
const CHILD_PLACE_VIEW_NAME = "ChildPlace";
const PODDR_VIEW_NAME = "PlaceObsDatesAndDenomRank";

function getOptionalPredicates(
  obsTableName: string,
  provTableName: string,
  date: string,
  metadata: StatMetadata,
  skipDatePredicate: boolean
): string[] {
  const predicates = [];
  if (!_.isEmpty(date) && !skipDatePredicate) {
    predicates.push(`${obsTableName}.observation_date = '${date}'`);
  } else if (!_.isEmpty(metadata) && !skipDatePredicate) {
    predicates.push(
      `${obsTableName}.observation_date = ${LATEST_OBS_DATE_VIEW_NAME}.LatestDate`
    );
  }
  if (!_.isEmpty(metadata)) {
    predicates.push(
      ...getSvMetadataPredicates(obsTableName, provTableName, metadata)
    );
  }
  if (!_.isEmpty(date) && _.isEmpty(metadata)) {
    predicates.push(`${obsTableName}.facet_rank = 1`);
  }
  if (_.isEmpty(date) && _.isEmpty(metadata)) {
    predicates.push(`${obsTableName}.is_preferred_obs_across_facets`);
  }
  return predicates;
}

function getChildPlaceView(place: string, enclosedPlaceType: string): string {
  return (
    `WITH ${CHILD_PLACE_VIEW_NAME} AS (` +
    `
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = '${enclosedPlaceType}') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = '${place}')`
  );
}

function getLatestObsDateView(
  svDcid: string,
  place: string,
  enclosedPlaceType: string,
  metadata: StatMetadata
): string {
  let provJoin = "";
  let provPredicate = "";
  if (!_.isEmpty(metadata) && !_.isEmpty(metadata.importName)) {
    provJoin = "\n    JOIN `data_commons.Provenance` AS I ON TRUE";
    provPredicate = "\n          O.prov_id = I.prov_id AND";
  }
  // the trailing spaces after the newline in the string join is to maintain
  // indentation
  return (
    `WITH ${LATEST_OBS_DATE_VIEW_NAME} AS (` +
    `
    ${getChildPlaceView(place, enclosedPlaceType)}
    )
    SELECT O.variable_measured as StatVarId,
           O.observation_about as PlaceId,
           MAX(O.Observation_date) as LatestDate
    FROM \`data_commons.Observation\` as O
    JOIN ${CHILD_PLACE_VIEW_NAME} ON TRUE${provJoin}
    WHERE O.variable_measured = '${svDcid}' AND${provPredicate}
          O.observation_about = ${CHILD_PLACE_VIEW_NAME}.PlaceId AND
          ${getSvMetadataPredicates("O", "I", metadata).join(
            " AND\n          "
          )}
    GROUP BY StatVarId, PlaceId`
  );
}

function getPlaceObsDatesAndDenomRankView(
  sv: string,
  denom: string,
  place: string,
  enclosedPlaceType,
  date: string,
  metadata: StatMetadata
): string {
  const tempViewName =
    _.isEmpty(date) && !_.isEmpty(metadata)
      ? LATEST_OBS_DATE_VIEW_NAME
      : CHILD_PLACE_VIEW_NAME;
  const tempView =
    tempViewName === LATEST_OBS_DATE_VIEW_NAME
      ? getLatestObsDateView(sv, place, enclosedPlaceType, metadata)
      : getChildPlaceView(place, enclosedPlaceType);
  const optionalPredicates = getOptionalPredicates(
    "ONum",
    "I",
    date,
    metadata,
    false
  );
  let provJoin = "";
  let numProvPredicate = "";
  if (!_.isEmpty(metadata) && !_.isEmpty(metadata.importName)) {
    provJoin = "\n  JOIN `data_commons.Provenance` AS I ON TRUE";
    numProvPredicate = "\n        ONum.prov_id = I.prov_id AND";
  }
  // the trailing spaces after the newline in the string join is to maintain
  // indentation
  const query =
    `WITH ${PODDR_VIEW_NAME} AS (` +
    `
  ${tempView}
  )
  SELECT ONum.observation_about AS PlaceId,
         ONum.variable_measured AS NumVariableId,
         ONum.observation_date AS NumDate,
         ODenom.variable_measured AS DenomVariableId,
         ODenom.observation_date AS DenomDate,
         MIN(ODenom.facet_rank) AS DenomRank
  FROM \`data_commons.Observation\` AS ONum
  JOIN \`data_commons.Observation\` AS ODenom ON TRUE
  JOIN ${tempViewName} ON TRUE${provJoin}
  WHERE ONum.observation_about = ${tempViewName}.PlaceId AND
        ONum.variable_measured = '${sv}' AND${numProvPredicate}
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = '${denom}' AND
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ${optionalPredicates.join(" AND\n        ")}
  GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)`;
  return query;
}

function getBaseSelectClause(obsTableName: string): string {
  return `SELECT ${obsTableName}.observation_about AS PlaceId,
      P.name AS PlaceName,
      ${obsTableName}.observation_date AS LatestDate,
      ${obsTableName}.measurement_method AS MeasurementMethod,
      ${obsTableName}.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source`;
}

function getBaseTableJoins(obsTableName: string): string {
  return `FROM \`data_commons.Observation\` AS ${obsTableName}
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE`;
}

function getBaseWhereClause(
  obsTableName: string,
  sv: string,
  tempViewName: string,
  optionalPredicates: string[]
): string {
  // the trailing spaces after the newline in the string join is to maintain
  // indentation
  return `WHERE ${obsTableName}.variable_measured = '${sv}' AND
      ${obsTableName}.observation_about = ${tempViewName}.PlaceId AND
      ${obsTableName}.observation_about = P.id AND
      ${obsTableName}.prov_id = I.id AND
      ${optionalPredicates.join(" AND\n      ")}`;
}

export function getPcQuery(
  sv: string,
  denom: string,
  place: string,
  enclosedPlaceType: string,
  date: string,
  metadata: StatMetadata
): string {
  const optionalPredicates = getOptionalPredicates(
    "ONum",
    "I",
    date,
    metadata,
    true
  );
  let query =
    getPlaceObsDatesAndDenomRankView(
      sv,
      denom,
      place,
      enclosedPlaceType,
      date,
      metadata
    ) +
    `
${getBaseSelectClause("ONum")},
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS ValuePerCapita,
      ODenom.value AS DenomValue,
      ODenom.observation_date AS DenomDate,
${getBaseTableJoins("ONum")}
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
${getBaseWhereClause("ONum", sv, "PODDR", optionalPredicates)} AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank`;
  query += "\nORDER BY PlaceName";
  return query;
}

export function getNonPcQuery(
  sv: string,
  place: string,
  enclosedPlaceType: string,
  date: string,
  metadata: StatMetadata
): string {
  const tempViewName =
    _.isEmpty(date) && !_.isEmpty(metadata)
      ? LATEST_OBS_DATE_VIEW_NAME
      : CHILD_PLACE_VIEW_NAME;
  const tempView =
    tempViewName === LATEST_OBS_DATE_VIEW_NAME
      ? getLatestObsDateView(sv, place, enclosedPlaceType, metadata)
      : getChildPlaceView(place, enclosedPlaceType);
  const optionalPredicates = getOptionalPredicates(
    "O",
    "I",
    date,
    metadata,
    false
  );
  return (
    tempView +
    `
)
${getBaseSelectClause("O")},
      CAST(O.value AS FLOAT64) AS Value
${getBaseTableJoins("O")}
JOIN ${tempViewName} ON TRUE
${getBaseWhereClause("O", sv, tempViewName, optionalPredicates)}
ORDER BY PlaceName`
  );
}
