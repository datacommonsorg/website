WITH DailyLogs AS (
  -- daily logs unnests the daily logs to make them easier to use later on
  -- we can add a where clause here to only consider logs with a timestamp in the current day
  SELECT
    -- TODO: support feature (just hasn't been pushed to dev!)
    -- T1.jsonPayload.usage_log.feature,
    "website" as feature,
    T1.jsonPayload.usage_log.place_type,
    statVar.stat_var_dcid AS statVarDCID,
    -- This sets the facet with the same information, but the dates correctly formatted
    STRUCT(
      facet.facet as facet_detail,
      -- accounts for improperly formatted dates (can change this once I finish setting up date support)
      COALESCE(SAFE.PARSE_DATE('%Y', facet.earliest), CURRENT_DATE()) AS earliest,
      COALESCE(SAFE.PARSE_DATE('%Y', facet.latest), CURRENT_DATE()) AS latest,
      COALESCE(facet.count, 0) AS num_entities
    ) AS facet,
    1 AS query_count -- A simple counter for each row/query
  FROM
   `{{DESTINATION_PROJECT_ID}}.{{DESTINATION_DATASET}}.{{DESTINATION_TABLE}}` AS T1,
    UNNEST(T1.jsonPayload.usage_log.stat_vars) AS statVar,
    UNNEST(statVar.facets) AS facet
  WHERE
    -- Start time: Truncate current timestamp to the millisecond, then subtract 24 hours.
    T1.timestamp >= TIMESTAMP_SUB(TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), MILLISECOND), INTERVAL 24 HOUR)
    -- End time: Truncate current timestamp to the millisecond.
    AND T1.timestamp < TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), MILLISECOND)
  -- WHERE
  --   T1.timestamp > '2025-10-11 12:43:37.584 UTC-4'
  --   AND T1.timestamp < '2025-10-11 12:43:39.155 UTC-4'
),

AggregatedPlaceTypes AS (
  -- This aggregates by place type, so that we can count the number of entities in one nested struct for num queries and num series
  SELECT
    feature,
    statVarDCID,
    -- all of the facet-specific info is stored in the facet, even when it's aggregated
    STRUCT(
      facet_detail,
      SUM(num_entities) AS num_entities,
      -- TODO: separate by num_entiteis per query place here!
      -- ARRAY_AGG(STRUCT(place_type, num_entities) ORDER BY place_type) AS num_entities_by_place_type
      ARRAY_AGG(STRUCT(place_type, query_count) ORDER BY place_type) AS queries_by_place_type,
      --TODO: earliest and latest aggregated here!!!
      MIN(earliest) as earliest,
      MAX(latest) as latest
    ) AS facet
  FROM (
    -- Inner query to count queries for each unique facet/place_type combination.
    SELECT
      feature,
      statVarDCID,
      facet.facet_detail AS facet_detail,
      place_type,
      -- COUNT(1) AS query_count
      COUNT(query_count) AS query_count,
      SUM(facet.num_entities) AS num_entities,
      MIN(facet.earliest) as earliest,
      MAX(facet.latest) as latest
    FROM DailyLogs
    GROUP BY
      feature,
      statVarDCID,
      facet.facet_detail,
      place_type
  )
  GROUP BY
    feature,
    statVarDCID,
    facet_detail
),

AggregatedStatVars AS (
  -- Now, we aggregate by feature and statVar, each pair with a set of all facets used
  SELECT
    feature,
    statVarDCID,
    ARRAY_AGG(
      facet
    ) AS facets
  FROM AggregatedPlaceTypes
  GROUP BY
    feature,
    statVarDCID
)

-- This groups stat vars by feature and gives us our final result
SELECT
  PARSE_DATE('%Y-%m-%d', CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AS STRING)) AS timestamp,
  feature,
  ARRAY_AGG(
      STRUCT(
        statVarDCID,
        facets
      )
    ) AS stat_vars
FROM AggregatedStatVars
GROUP BY
  feature