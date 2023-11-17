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

import { StatMetadata } from "../../shared/stat_types";
import { getNonPcQuery, getPcQuery } from "./bq_query_utils";
import { PlaceInfo, StatVar } from "./context";

const TEST_SV: StatVar = {
  dcid: "Count_Person_Female",
  denom: "Count_Person",
  info: {},
  mapPointSv: "",
  metahash: "",
  perCapita: false,
};
const TEST_PLACE: PlaceInfo = {
  enclosedPlaceType: "County",
  enclosingPlace: { dcid: "geoId/06", name: "California" },
  mapPointPlaceType: "",
  parentPlaces: [],
  selectedPlace: { dcid: "geoId/06085", name: "Santa Clara", types: [] },
};
const TEST_DATE = "2015";
const TEST_METADATA_WITH_IMPORT_NAME: StatMetadata = {
  importName: "CensusACS5YearSurvey",
  measurementMethod: "CensusACS5yrSurvey",
};
const TEST_METADATA_NO_IMPORT_NAME: StatMetadata = {
  measurementMethod: "CensusACS5yrSurvey",
};

test("getPcQuery", () => {
  const cases: {
    caseName: string;
    date: string;
    metadata: StatMetadata;
    wantQuery: string;
  }[] = [
    {
      caseName: "no date or source selected",
      date: "",
      metadata: {},
      wantQuery: `WITH PlaceObsDatesAndDenomRank AS (
  WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
  )
  SELECT ONum.observation_about AS PlaceId,
         ONum.variable_measured AS NumVariableId,
         ONum.observation_date AS NumDate,
         ODenom.variable_measured AS DenomVariableId,
         ODenom.observation_date AS DenomDate,
         MIN(ODenom.facet_rank) AS DenomRank
  FROM \`data_commons.Observation\` AS ONum
  JOIN \`data_commons.Observation\` AS ODenom ON TRUE
  JOIN ChildPlace ON TRUE
  WHERE ONum.observation_about = ChildPlace.PlaceId AND
        ONum.variable_measured = 'Count_Person_Female' AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ONum.is_preferred_obs_across_facets
  GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.observation_date AS LatestDate,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS ValuePerCapita,
      ODenom.value AS DenomValue,
      ODenom.observation_date AS DenomDate,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'Count_Person_Female' AND
      ONum.observation_about = PODDR.PlaceId AND
      ONum.observation_about = P.id AND
      ONum.prov_id = I.id AND
      ONum.is_preferred_obs_across_facets AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank
ORDER BY PlaceName`,
    },
    {
      caseName: "date selected, no source selected",
      date: TEST_DATE,
      metadata: {},
      wantQuery: `WITH PlaceObsDatesAndDenomRank AS (
  WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
  )
  SELECT ONum.observation_about AS PlaceId,
         ONum.variable_measured AS NumVariableId,
         ONum.observation_date AS NumDate,
         ODenom.variable_measured AS DenomVariableId,
         ODenom.observation_date AS DenomDate,
         MIN(ODenom.facet_rank) AS DenomRank
  FROM \`data_commons.Observation\` AS ONum
  JOIN \`data_commons.Observation\` AS ODenom ON TRUE
  JOIN ChildPlace ON TRUE
  WHERE ONum.observation_about = ChildPlace.PlaceId AND
        ONum.variable_measured = 'Count_Person_Female' AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ONum.observation_date = '2015' AND
        ONum.facet_rank = 1
  GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.observation_date AS LatestDate,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS ValuePerCapita,
      ODenom.value AS DenomValue,
      ODenom.observation_date AS DenomDate,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'Count_Person_Female' AND
      ONum.observation_about = PODDR.PlaceId AND
      ONum.observation_about = P.id AND
      ONum.prov_id = I.id AND
      ONum.facet_rank = 1 AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank
ORDER BY PlaceName`,
    },
    {
      caseName: "no date selected, source with import name selected",
      date: "",
      metadata: TEST_METADATA_WITH_IMPORT_NAME,
      wantQuery: `WITH PlaceObsDatesAndDenomRank AS (
  WITH LatestObsDate AS (
    WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
    )
    SELECT O.variable_measured as StatVarId,
           O.observation_about as PlaceId,
           MAX(O.Observation_date) as LatestDate
    FROM \`data_commons.Observation\` as O
    JOIN ChildPlace ON TRUE
    JOIN \`data_commons.Provenance\` AS I ON TRUE
    WHERE O.variable_measured = 'Count_Person_Female' AND
          O.prov_id = I.prov_id AND
          O.observation_about = ChildPlace.PlaceId AND
          O.measurement_method = 'CensusACS5yrSurvey' AND
          O.unit IS NULL AND
          O.observation_period IS NULL AND
          O.scaling_factor IS NULL AND
          I.name = 'CensusACS5YearSurvey'
    GROUP BY StatVarId, PlaceId
  )
  SELECT ONum.observation_about AS PlaceId,
         ONum.variable_measured AS NumVariableId,
         ONum.observation_date AS NumDate,
         ODenom.variable_measured AS DenomVariableId,
         ODenom.observation_date AS DenomDate,
         MIN(ODenom.facet_rank) AS DenomRank
  FROM \`data_commons.Observation\` AS ONum
  JOIN \`data_commons.Observation\` AS ODenom ON TRUE
  JOIN LatestObsDate ON TRUE
  JOIN \`data_commons.Provenance\` AS I ON TRUE
  WHERE ONum.observation_about = LatestObsDate.PlaceId AND
        ONum.variable_measured = 'Count_Person_Female' AND
        ONum.prov_id = I.prov_id AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ONum.observation_date = LatestObsDate.LatestDate AND
        ONum.measurement_method = 'CensusACS5yrSurvey' AND
        ONum.unit IS NULL AND
        ONum.observation_period IS NULL AND
        ONum.scaling_factor IS NULL AND
        I.name = 'CensusACS5YearSurvey'
  GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.observation_date AS LatestDate,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS ValuePerCapita,
      ODenom.value AS DenomValue,
      ODenom.observation_date AS DenomDate,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'Count_Person_Female' AND
      ONum.observation_about = PODDR.PlaceId AND
      ONum.observation_about = P.id AND
      ONum.prov_id = I.id AND
      ONum.measurement_method = 'CensusACS5yrSurvey' AND
      ONum.unit IS NULL AND
      ONum.observation_period IS NULL AND
      ONum.scaling_factor IS NULL AND
      I.name = 'CensusACS5YearSurvey' AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank
ORDER BY PlaceName`,
    },
    {
      caseName: "no date selected, source without import name selected",
      date: "",
      metadata: TEST_METADATA_NO_IMPORT_NAME,
      wantQuery: `WITH PlaceObsDatesAndDenomRank AS (
  WITH LatestObsDate AS (
    WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
    )
    SELECT O.variable_measured as StatVarId,
           O.observation_about as PlaceId,
           MAX(O.Observation_date) as LatestDate
    FROM \`data_commons.Observation\` as O
    JOIN ChildPlace ON TRUE
    WHERE O.variable_measured = 'Count_Person_Female' AND
          O.observation_about = ChildPlace.PlaceId AND
          O.measurement_method = 'CensusACS5yrSurvey' AND
          O.unit IS NULL AND
          O.observation_period IS NULL AND
          O.scaling_factor IS NULL
    GROUP BY StatVarId, PlaceId
  )
  SELECT ONum.observation_about AS PlaceId,
         ONum.variable_measured AS NumVariableId,
         ONum.observation_date AS NumDate,
         ODenom.variable_measured AS DenomVariableId,
         ODenom.observation_date AS DenomDate,
         MIN(ODenom.facet_rank) AS DenomRank
  FROM \`data_commons.Observation\` AS ONum
  JOIN \`data_commons.Observation\` AS ODenom ON TRUE
  JOIN LatestObsDate ON TRUE
  WHERE ONum.observation_about = LatestObsDate.PlaceId AND
        ONum.variable_measured = 'Count_Person_Female' AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ONum.observation_date = LatestObsDate.LatestDate AND
        ONum.measurement_method = 'CensusACS5yrSurvey' AND
        ONum.unit IS NULL AND
        ONum.observation_period IS NULL AND
        ONum.scaling_factor IS NULL
  GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.observation_date AS LatestDate,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS ValuePerCapita,
      ODenom.value AS DenomValue,
      ODenom.observation_date AS DenomDate,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'Count_Person_Female' AND
      ONum.observation_about = PODDR.PlaceId AND
      ONum.observation_about = P.id AND
      ONum.prov_id = I.id AND
      ONum.measurement_method = 'CensusACS5yrSurvey' AND
      ONum.unit IS NULL AND
      ONum.observation_period IS NULL AND
      ONum.scaling_factor IS NULL AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank
ORDER BY PlaceName`,
    },
    {
      caseName: "date and source selected",
      date: TEST_DATE,
      metadata: TEST_METADATA_WITH_IMPORT_NAME,
      wantQuery: `WITH PlaceObsDatesAndDenomRank AS (
  WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
  )
  SELECT ONum.observation_about AS PlaceId,
         ONum.variable_measured AS NumVariableId,
         ONum.observation_date AS NumDate,
         ODenom.variable_measured AS DenomVariableId,
         ODenom.observation_date AS DenomDate,
         MIN(ODenom.facet_rank) AS DenomRank
  FROM \`data_commons.Observation\` AS ONum
  JOIN \`data_commons.Observation\` AS ODenom ON TRUE
  JOIN ChildPlace ON TRUE
  JOIN \`data_commons.Provenance\` AS I ON TRUE
  WHERE ONum.observation_about = ChildPlace.PlaceId AND
        ONum.variable_measured = 'Count_Person_Female' AND
        ONum.prov_id = I.prov_id AND
        ODenom.observation_about = ONum.observation_about AND
        ODenom.variable_measured = 'Count_Person' AND
        ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
        ONum.observation_date = '2015' AND
        ONum.measurement_method = 'CensusACS5yrSurvey' AND
        ONum.unit IS NULL AND
        ONum.observation_period IS NULL AND
        ONum.scaling_factor IS NULL AND
        I.name = 'CensusACS5YearSurvey'
  GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.observation_date AS LatestDate,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS ValuePerCapita,
      ODenom.value AS DenomValue,
      ODenom.observation_date AS DenomDate,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
WHERE ONum.variable_measured = 'Count_Person_Female' AND
      ONum.observation_about = PODDR.PlaceId AND
      ONum.observation_about = P.id AND
      ONum.prov_id = I.id AND
      ONum.measurement_method = 'CensusACS5yrSurvey' AND
      ONum.unit IS NULL AND
      ONum.observation_period IS NULL AND
      ONum.scaling_factor IS NULL AND
      I.name = 'CensusACS5YearSurvey' AND
      PODDR.NumVariableId = ONum.variable_measured AND
      PODDR.NumDate = ONum.observation_date AND
      PODDR.PlaceId = ODenom.observation_about AND
      PODDR.DenomVariableId = ODenom.variable_measured AND
      PODDR.DenomDate = ODenom.observation_date AND
      PODDR.DenomRank = ODenom.facet_rank
ORDER BY PlaceName`,
    },
  ];

  for (const c of cases) {
    const gotQuery = getPcQuery(
      TEST_SV.dcid || "",
      TEST_SV.denom || "",
      TEST_PLACE.enclosingPlace?.dcid || "",
      TEST_PLACE.enclosedPlaceType || "",
      c.date,
      c.metadata
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

test("getNonPcQuery", () => {
  const cases: {
    caseName: string;
    date: string;
    metadata: StatMetadata;
    wantQuery: string;
  }[] = [
    {
      caseName: "no date or source selected",
      date: "",
      metadata: {},
      wantQuery: `WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
)
SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.observation_date AS LatestDate,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CAST(O.value AS FLOAT64) AS Value
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN ChildPlace ON TRUE
WHERE O.variable_measured = 'Count_Person_Female' AND
      O.observation_about = ChildPlace.PlaceId AND
      O.observation_about = P.id AND
      O.prov_id = I.id AND
      O.is_preferred_obs_across_facets
ORDER BY PlaceName`,
    },
    {
      caseName: "date selected, no source selected",
      date: TEST_DATE,
      metadata: {},
      wantQuery: `WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
)
SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.observation_date AS LatestDate,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CAST(O.value AS FLOAT64) AS Value
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN ChildPlace ON TRUE
WHERE O.variable_measured = 'Count_Person_Female' AND
      O.observation_about = ChildPlace.PlaceId AND
      O.observation_about = P.id AND
      O.prov_id = I.id AND
      O.observation_date = '2015' AND
      O.facet_rank = 1
ORDER BY PlaceName`,
    },
    {
      caseName: "no date selected, source with import name selected",
      date: "",
      metadata: TEST_METADATA_WITH_IMPORT_NAME,
      wantQuery: `WITH LatestObsDate AS (
    WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
    )
    SELECT O.variable_measured as StatVarId,
           O.observation_about as PlaceId,
           MAX(O.Observation_date) as LatestDate
    FROM \`data_commons.Observation\` as O
    JOIN ChildPlace ON TRUE
    JOIN \`data_commons.Provenance\` AS I ON TRUE
    WHERE O.variable_measured = 'Count_Person_Female' AND
          O.prov_id = I.prov_id AND
          O.observation_about = ChildPlace.PlaceId AND
          O.measurement_method = 'CensusACS5yrSurvey' AND
          O.unit IS NULL AND
          O.observation_period IS NULL AND
          O.scaling_factor IS NULL AND
          I.name = 'CensusACS5YearSurvey'
    GROUP BY StatVarId, PlaceId
)
SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.observation_date AS LatestDate,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CAST(O.value AS FLOAT64) AS Value
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN LatestObsDate ON TRUE
WHERE O.variable_measured = 'Count_Person_Female' AND
      O.observation_about = LatestObsDate.PlaceId AND
      O.observation_about = P.id AND
      O.prov_id = I.id AND
      O.observation_date = LatestObsDate.LatestDate AND
      O.measurement_method = 'CensusACS5yrSurvey' AND
      O.unit IS NULL AND
      O.observation_period IS NULL AND
      O.scaling_factor IS NULL AND
      I.name = 'CensusACS5YearSurvey'
ORDER BY PlaceName`,
    },
    {
      caseName: "no date selected, source without import name selected",
      date: "",
      metadata: TEST_METADATA_NO_IMPORT_NAME,
      wantQuery: `WITH LatestObsDate AS (
    WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
    )
    SELECT O.variable_measured as StatVarId,
           O.observation_about as PlaceId,
           MAX(O.Observation_date) as LatestDate
    FROM \`data_commons.Observation\` as O
    JOIN ChildPlace ON TRUE
    WHERE O.variable_measured = 'Count_Person_Female' AND
          O.observation_about = ChildPlace.PlaceId AND
          O.measurement_method = 'CensusACS5yrSurvey' AND
          O.unit IS NULL AND
          O.observation_period IS NULL AND
          O.scaling_factor IS NULL
    GROUP BY StatVarId, PlaceId
)
SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.observation_date AS LatestDate,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CAST(O.value AS FLOAT64) AS Value
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN LatestObsDate ON TRUE
WHERE O.variable_measured = 'Count_Person_Female' AND
      O.observation_about = LatestObsDate.PlaceId AND
      O.observation_about = P.id AND
      O.prov_id = I.id AND
      O.observation_date = LatestObsDate.LatestDate AND
      O.measurement_method = 'CensusACS5yrSurvey' AND
      O.unit IS NULL AND
      O.observation_period IS NULL AND
      O.scaling_factor IS NULL
ORDER BY PlaceName`,
    },
    {
      caseName: "date and source selected",
      date: TEST_DATE,
      metadata: TEST_METADATA_WITH_IMPORT_NAME,
      wantQuery: `WITH ChildPlace AS (
      SELECT id AS PlaceId FROM \`data_commons.Place\`
      WHERE EXISTS(SELECT * FROM UNNEST(all_types) AS T WHERE T = 'County') AND
            EXISTS(SELECT * FROM UNNEST(linked_contained_in_place) AS C WHERE C = 'geoId/06')
)
SELECT O.observation_about AS PlaceId,
      P.name AS PlaceName,
      O.observation_date AS LatestDate,
      O.measurement_method AS MeasurementMethod,
      O.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      CAST(O.value AS FLOAT64) AS Value
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
JOIN ChildPlace ON TRUE
WHERE O.variable_measured = 'Count_Person_Female' AND
      O.observation_about = ChildPlace.PlaceId AND
      O.observation_about = P.id AND
      O.prov_id = I.id AND
      O.observation_date = '2015' AND
      O.measurement_method = 'CensusACS5yrSurvey' AND
      O.unit IS NULL AND
      O.observation_period IS NULL AND
      O.scaling_factor IS NULL AND
      I.name = 'CensusACS5YearSurvey'
ORDER BY PlaceName`,
    },
  ];

  for (const c of cases) {
    const gotQuery = getNonPcQuery(
      TEST_SV.dcid || "",
      TEST_PLACE.enclosingPlace?.dcid || "",
      TEST_PLACE.enclosedPlaceType || "",
      c.date,
      c.metadata
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
