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

import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { getTimelineSqlQuery } from "./bq_query_utils";
import { ChartGroupInfo } from "./chart_region";

const TEST_METAHASH_MAP = {
  WithdrawalRate_Water_Thermoelectric: "",
  WithdrawalRate_Water_PublicSupply: "metahash1",
  WithdrawalRate_Water_Irrigation: "metahash1",
  Count_Person_Female: "",
};
const TEST_METADATA_MAP = {
  WithdrawalRate_Water_PublicSupply: {
    metahash1: {
      importName: "USGSWaterUse",
      observationPeriod: "P1Y",
      unit: "MillionGallonsPerDay",
    },
  },
  WithdrawalRate_Water_Irrigation: {
    metahash1: {
      observationPeriod: "P1Y",
      unit: "MillionGallonsPerDay",
    },
  },
};
const TEST_PLACES = ["geoId/06", "geoId/07"];

test("getSqlQuery", () => {
  const cases: {
    caseName: string;
    chartGroupInfo: ChartGroupInfo;
    wantQuery: string;
  }[] = [
    {
      caseName: "no chart options selected",
      chartGroupInfo: {
        chartIdToOptions: {
          mprop1: {
            delta: false,
            denom: DEFAULT_POPULATION_DCID,
            perCapita: true,
          },
        },
        chartOrder: ["mprop1"],
        chartIdToStatVars: {
          mprop1: [
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Irrigation",
          ],
        },
      },
      wantQuery: `(WITH PlaceObsDatesAndDenomRank AS (
    SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
    FROM \`data_commons.Observation\` AS ONum
    JOIN \`data_commons.Observation\` AS ODenom ON TRUE
    WHERE
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
        ONum.facet_rank = 1 AND
        (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07')
    GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.variable_measured AS VariableId,
      ONum.observation_date AS Date,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
      ONum.facet_rank = 1 AND
      ONum.observation_about = P.id AND
      ONum.variable_measured = V.id AND
      ONum.prov_id = I.prov_id AND
      (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07') AND
      PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank)

UNION ALL

(WITH PlaceObsDatesAndDenomRank AS (
    SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
    FROM \`data_commons.Observation\` AS ONum
    JOIN \`data_commons.Observation\` AS ODenom ON TRUE
    WHERE
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
        ONum.facet_rank = 1 AND
        (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07')
    GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.variable_measured AS VariableId,
      ONum.observation_date AS Date,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
      ONum.facet_rank = 1 AND
      ONum.observation_about = P.id AND
      ONum.variable_measured = V.id AND
      ONum.prov_id = I.prov_id AND
      (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07') AND
      PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank)

UNION ALL

(WITH PlaceObsDatesAndDenomRank AS (
    SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
    FROM \`data_commons.Observation\` AS ONum
    JOIN \`data_commons.Observation\` AS ODenom ON TRUE
    WHERE
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ONum.variable_measured = 'WithdrawalRate_Water_Irrigation' AND
        ONum.measurement_method IS NULL AND
        ONum.unit = 'MillionGallonsPerDay' AND
        ONum.observation_period = 'P1Y' AND
        ONum.scaling_factor IS NULL AND
        (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07')
    GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.variable_measured AS VariableId,
      ONum.observation_date AS Date,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'WithdrawalRate_Water_Irrigation' AND
      ONum.measurement_method IS NULL AND
      ONum.unit = 'MillionGallonsPerDay' AND
      ONum.observation_period = 'P1Y' AND
      ONum.scaling_factor IS NULL AND
      ONum.observation_about = P.id AND
      ONum.variable_measured = V.id AND
      ONum.prov_id = I.prov_id AND
      (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07') AND
      PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank)

ORDER BY PlaceId, VariableId, Date`,
    },
    {
      caseName: "per capita and delta selected",
      chartGroupInfo: {
        chartIdToOptions: {
          mprop1: {
            delta: true,
            denom: DEFAULT_POPULATION_DCID,
            perCapita: true,
          },
        },
        chartIdToStatVars: {
          mprop1: [
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Irrigation",
          ],
        },
        chartOrder: ["mprop1"],
      },
      wantQuery: "",
    },
    {
      caseName: "per capita selected for one chart",
      chartGroupInfo: {
        chartOrder: ["mprop1", "mprop2"],
        chartIdToStatVars: {
          mprop1: [
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Irrigation",
          ],
          mprop2: ["Count_Person_Female"],
        },
        chartIdToOptions: {
          mprop1: {
            delta: false,
            denom: DEFAULT_POPULATION_DCID,
            perCapita: true,
          },
          mprop2: {
            delta: false,
            denom: DEFAULT_POPULATION_DCID,
            perCapita: false,
          },
        },
      },
      wantQuery: `(WITH PlaceObsDatesAndDenomRank AS (
    SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
    FROM \`data_commons.Observation\` AS ONum
    JOIN \`data_commons.Observation\` AS ODenom ON TRUE
    WHERE
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
        ONum.facet_rank = 1 AND
        (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07')
    GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.variable_measured AS VariableId,
      ONum.observation_date AS Date,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
      ONum.facet_rank = 1 AND
      ONum.observation_about = P.id AND
      ONum.variable_measured = V.id AND
      ONum.prov_id = I.prov_id AND
      (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07') AND
      PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank)

UNION ALL

(WITH PlaceObsDatesAndDenomRank AS (
    SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
    FROM \`data_commons.Observation\` AS ONum
    JOIN \`data_commons.Observation\` AS ODenom ON TRUE
    WHERE
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
        ONum.facet_rank = 1 AND
        (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07')
    GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.variable_measured AS VariableId,
      ONum.observation_date AS Date,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'WithdrawalRate_Water_Thermoelectric' AND
      ONum.facet_rank = 1 AND
      ONum.observation_about = P.id AND
      ONum.variable_measured = V.id AND
      ONum.prov_id = I.prov_id AND
      (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07') AND
      PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank)

UNION ALL

(WITH PlaceObsDatesAndDenomRank AS (
    SELECT ONum.observation_about AS PlaceId,
        ONum.variable_measured AS NumVariableId,
        ONum.observation_date AS NumDate,
        ODenom.variable_measured AS DenomVariableId,
        ODenom.observation_date AS DenomDate,
        MIN(ODenom.facet_rank) AS DenomRank
    FROM \`data_commons.Observation\` AS ONum
    JOIN \`data_commons.Observation\` AS ODenom ON TRUE
    WHERE
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ONum.variable_measured = 'WithdrawalRate_Water_Irrigation' AND
        ONum.measurement_method IS NULL AND
        ONum.unit = 'MillionGallonsPerDay' AND
        ONum.observation_period = 'P1Y' AND
        ONum.scaling_factor IS NULL AND
        (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07')
    GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.variable_measured AS VariableId,
      ONum.observation_date AS Date,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'WithdrawalRate_Water_Irrigation' AND
      ONum.measurement_method IS NULL AND
      ONum.unit = 'MillionGallonsPerDay' AND
      ONum.observation_period = 'P1Y' AND
      ONum.scaling_factor IS NULL AND
      ONum.observation_about = P.id AND
      ONum.variable_measured = V.id AND
      ONum.prov_id = I.prov_id AND
      (ONum.observation_about = 'geoId/06' OR ONum.observation_about = 'geoId/07') AND
      PODDR.PlaceId = ONum.observation_about AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank)

UNION ALL

SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.variable_measured AS VariableId,
      O.observation_date AS Date,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      V.name AS VariableName,
      CAST(O.value AS FLOAT64) AS Value,
      NULL as DenomDate,
      NULL as DenomValue
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
WHERE O.variable_measured = 'Count_Person_Female' AND
      O.facet_rank = 1 AND
      O.observation_about = P.id AND
      O.variable_measured = V.id AND
      O.prov_id = I.prov_id AND
      (O.observation_about = 'geoId/06' OR O.observation_about = 'geoId/07')

ORDER BY PlaceId, VariableId, Date`,
    },
    {
      caseName: "per capita and delta selected for one chart",
      chartGroupInfo: {
        chartIdToOptions: {
          mprop1: {
            delta: true,
            denom: DEFAULT_POPULATION_DCID,
            perCapita: true,
          },
          mprop2: {
            delta: false,
            denom: DEFAULT_POPULATION_DCID,
            perCapita: false,
          },
        },
        chartIdToStatVars: {
          mprop1: [
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Thermoelectric",
            "WithdrawalRate_Water_Irrigation",
          ],
          mprop2: ["Count_Person_Female"],
        },
        chartOrder: ["mprop1", "mprop2"],
      },
      wantQuery: `SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.variable_measured AS VariableId,
      O.observation_date AS Date,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      V.name AS VariableName,
      CAST(O.value AS FLOAT64) AS Value,
      NULL as DenomDate,
      NULL as DenomValue
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
WHERE O.variable_measured = 'Count_Person_Female' AND
      O.facet_rank = 1 AND
      O.observation_about = P.id AND
      O.variable_measured = V.id AND
      O.prov_id = I.prov_id AND
      (O.observation_about = 'geoId/06' OR O.observation_about = 'geoId/07')

ORDER BY PlaceId, VariableId, Date`,
    },
  ];

  for (const c of cases) {
    const gotQuery = getTimelineSqlQuery(
      c.chartGroupInfo,
      TEST_PLACES,
      TEST_METAHASH_MAP,
      TEST_METADATA_MAP
    );
    try {
      expect(gotQuery).toEqual(c.wantQuery);
    } catch (e) {
      console.log(
        `got different query string than expected for test case: ${c.caseName}`
      );
      throw e;
    }
  }
});
