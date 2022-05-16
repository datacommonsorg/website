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
import { ChartGroupInfo } from "./chart_region";

function getPlacesPredicate(obsTableName: string, places: string[]): string {
  let placesPredicate = places
    .map((place) => `${obsTableName}.observation_about = '${place}'`)
    .join(" OR ");
  if (places.length > 1) {
    placesPredicate = `(${placesPredicate})`;
  }
  return placesPredicate;
}

function getBaseSelectClause(obsTableName: string): string {
  return `SELECT ${obsTableName}.observation_about AS PlaceId,
      P.name AS PlaceName,
      ${obsTableName}.variable_measured AS VariableId,
      ${obsTableName}.observation_date AS Date,
      ${obsTableName}.measurement_method AS MeasurementMethod,
      ${obsTableName}.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source`;
}

function getBaseWhereClause(
  obsTableName: string,
  sv: string,
  places: string[],
  metadata: StatMetadata
): string {
  // the trailing spaces after the newline in the string join is to maintain
  // indentation
  const svMetadataPredicate = _.isEmpty(metadata)
    ? `${obsTableName}.facet_rank = 1`
    : getSvMetadataPredicates(obsTableName, "I", metadata).join(" AND\n      ");
  return `WHERE ${obsTableName}.variable_measured = '${sv}' AND
      ${svMetadataPredicate} AND
      ${obsTableName}.observation_about = P.id AND
      ${obsTableName}.variable_measured = V.id AND
      ${obsTableName}.prov_id = I.prov_id AND
      ${getPlacesPredicate(obsTableName, places)}`;
}

function getBaseTableJoins(obsTableName: string): string {
  return `FROM \`data_commons.Observation\` AS ${obsTableName}
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE`;
}

function getNonPcQueryForSv(
  sv: string,
  places: string[],
  metadata: StatMetadata
): string {
  return (
    getBaseSelectClause("O") +
    `,
      V.name AS VariableName,
      CAST(O.value AS FLOAT64) AS Value,
      NULL as DenomDate,
      NULL as DenomValue
${getBaseTableJoins("O")}
${getBaseWhereClause("O", sv, places, metadata)}`
  );
}

function getPcQueryForSv(
  sv: string,
  places: string[],
  metadata: StatMetadata
): string {
  let provJoin = "";
  let numProvPredicate = "";
  let svMetadataPredicate = "ONum.facet_rank = 1";
  if (!_.isEmpty(metadata)) {
    // the trailing spaces after the newline is to maintain indentation
    svMetadataPredicate = getSvMetadataPredicates("ONum", "I", metadata).join(
      " AND\n        "
    );
    if (!_.isEmpty(metadata.importName)) {
      provJoin = "\n    JOIN `data_commons.Provenance` AS I ON TRUE";
      numProvPredicate = "\n        ONum.prov_id = I.prov_id AND";
    }
  }
  const placesPredicate = getPlacesPredicate("ONum", places);
  return `WITH PlaceObsDatesAndDenomRank AS (
    SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
    FROM \`data_commons.Observation\` AS ONum
    JOIN \`data_commons.Observation\` AS ODenom ON TRUE${provJoin}
    WHERE
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ONum.variable_measured = '${sv}' AND${numProvPredicate}
        ${svMetadataPredicate} AND
        ${placesPredicate}
    GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
${getBaseSelectClause("ONum")},
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
${getBaseTableJoins("ONum")}
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
${getBaseWhereClause("ONum", sv, places, metadata)} AND
      PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank`;
}

export function getTimelineSqlQuery(
  chartGroupInfo: ChartGroupInfo,
  places: string[],
  metahashMap: Record<string, string>,
  metadataMap: Record<string, Record<string, StatMetadata>>
): string {
  const query = chartGroupInfo.chartOrder
    .map((mprop) => {
      const options = chartGroupInfo.chartIdToOptions[mprop];
      if (options.delta) {
        return "";
      }
      return chartGroupInfo.chartIdToStatVars[mprop]
        .map((sv) => {
          const metahash = metahashMap[sv];
          const metadata = metadataMap[sv]
            ? metadataMap[sv][metahash] || {}
            : {};
          if (options.perCapita) {
            const query = getPcQueryForSv(sv, places, metadata);
            if (
              chartGroupInfo.chartOrder.length > 1 ||
              chartGroupInfo.chartIdToStatVars[mprop].length > 1
            ) {
              return `(${query})`;
            }
            return query;
          } else {
            return getNonPcQueryForSv(sv, places, metadata);
          }
        })
        .join("\n\nUNION ALL\n\n");
    })
    .filter((s) => s !== "")
    .join("\n\nUNION ALL\n\n");
  return !_.isEmpty(query)
    ? query + "\n\nORDER BY PlaceId, VariableId, Date"
    : "";
}
