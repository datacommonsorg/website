DECLARE latest_log_time TIMESTAMP;
-- 1. Get the latest log time already included in the aggregated logs.
SET latest_log_time = (
  SELECT
    COALESCE(
        MAX(timestamp),
        CAST('2025-10-10 01:00:00' AS TIMESTAMP)
    )
  FROM
    `{{DESTINATION_PROJECT_ID}}.{{DESTINATION_DATASET}}.{{AGGREGATION_TABLE}}`
);

{{QUERY_COMMAND_HEADER}} `{{DESTINATION_PROJECT_ID}}.{{DESTINATION_DATASET}}.{{AGGREGATION_TABLE}}` (
    timestamp, feature, num_queries, stat_vars
)
(

    -- Assign a unique ID to each source query before unnesting.
    WITH SourceWithID AS (
      SELECT
        GENERATE_UUID() AS query_id,
        jsonPayload,
        timestamp
      FROM
        `{{DESTINATION_PROJECT_ID}}.{{DESTINATION_DATASET}}.{{DESTINATION_TABLE}}` AS T1
      WHERE
        T1.timestamp > CAST('2025-10-10 01:00:00' AS TIMESTAMP)
    ),

    -- TODO: this will need to be removed if it's for custom DC
    -- Unnest everything and add provenance name (e.g. United Nations) to facet details
    UnnestedLogsWithProvenance AS (
      SELECT
        T1.query_id,
        T1.jsonPayload.usage_log.feature as feature,
        "city" AS place_type,
        T1.jsonPayload.usage_log.query_type as query_type,
        statVar.stat_var_dcid AS statVarDCID,
        T1.timestamp,
        STRUCT(
          (SELECT AS STRUCT facet.facet.*, src.name AS provenance_name) AS facet_detail,
          COALESCE(SAFE.PARSE_DATE('%Y', facet.earliest), CURRENT_DATE()) AS earliest,
          COALESCE(SAFE.PARSE_DATE('%Y', facet.latest), CURRENT_DATE()) AS latest,
          COALESCE(facet.count, 0) AS num_entities
        ) AS facet
      FROM
        SourceWithID AS T1,
        UNNEST(T1.jsonPayload.usage_log.stat_vars) AS statVar,
        UNNEST(statVar.facets) AS facet
      LEFT JOIN `datcom-store.dc_kg_latest.Provenance` AS prov
        ON facet.facet.import_name = prov.name
      LEFT JOIN `datcom-store.dc_kg_latest.Source` AS src
        ON prov.source = src.id
    ),

    -- Calculate the query count for each place_type.
    AggregatedPlaceTypes_Inner AS (
      SELECT
        feature,
        statVarDCID,
        facet.facet_detail,
        place_type,
        MAX(timestamp) as latest_entry,
        COUNT(DISTINCT query_id) AS num_queries,
        SUM(facet.num_entities) AS num_entities,
        MIN(facet.earliest) AS earliest,
        MAX(facet.latest) AS latest
      FROM
        UnnestedLogsWithProvenance
      GROUP BY
        feature,
        statVarDCID,
        facet.facet_detail,
        place_type
    ),

    -- Calculate the total query and entity count for each facet
    FacetQueryCounts AS (
      SELECT 
        feature,
        statVarDCID,
        facet_detail,
        ARRAY_AGG(STRUCT(query_type, num_queries) ORDER BY query_type) AS queries_by_query_type,
        ARRAY_AGG(STRUCT(query_type, num_entities) ORDER BY query_type) AS entities_by_query_type,
        SUM(num_entities) AS total_num_entities,
        SUM(num_queries) AS total_num_queries
      FROM ( 
        SELECT
          feature,
          statVarDCID,
          facet.facet_detail,
          query_type,
          SUM(facet.num_entities) AS num_entities,
          COUNT(DISTINCT query_id) AS num_queries
        FROM
          UnnestedLogsWithProvenance as prov
        GROUP BY
          feature,
          statVarDCID,
          facet.facet_detail,
          query_type 
      )
      GROUP BY
        feature,
        statVarDCID,
        facet_detail
    ),

    -- number of times each stat var was requested for facet, value, and existence queries
    -- this is done separately from the per-facet queries to account for queries that produce no results
    StatVarQueriesPerQueryType AS (
      SELECT 
        stat_var_dcid,
        ARRAY_AGG(STRUCT(query_type, num_queries) ORDER BY query_type) AS queries_by_query_type,
      FROM (
        -- gathered by query type
        SELECT 
          statVar.stat_var_dcid,
          jsonPayload.usage_log.query_type,
          COUNT(DISTINCT T1.query_id) as num_queries
          -- I don't think I really have a sense of num_entities here because I usually get that from the facet count?
        FROM
          SourceWithID AS T1,
          UNNEST(T1.jsonPayload.usage_log.stat_vars) AS statVar
        GROUP BY
          stat_var_dcid,
          jsonPayload.usage_log.query_type
      )
      GROUP BY
        stat_var_dcid
    ),

    -- Combine the place_type breakdown with the total facet count.
    AggregatedPlaceTypes AS (
      SELECT
        T1.feature,
        T1.statVarDCID,
        MAX(T1.latest_entry) as latest_entry,
        T3.queries_by_query_type,
        STRUCT(
          T1.facet_detail,
          T2.total_num_queries AS num_queries,
          T2.total_num_entities AS num_entities,
          T2.queries_by_query_type,
          T2.entities_by_query_type,
          ARRAY_AGG(STRUCT(T1.place_type, T1.num_queries) ORDER BY T1.place_type) AS queries_by_place_type,
          ARRAY_AGG(STRUCT(T1.place_type, T1.num_entities) ORDER BY T1.place_type) AS entities_by_place_type,
          DATE_TRUNC(MIN(T1.earliest), YEAR) AS earliest,
          DATE_TRUNC(MAX(T1.latest), YEAR) AS latest
        ) AS facet
      FROM
        AggregatedPlaceTypes_Inner AS T1
      JOIN
        FacetQueryCounts AS T2
        ON T1.feature = T2.feature
        AND T1.statVarDCID = T2.statVarDCID
        AND TO_JSON_STRING(T1.facet_detail) = TO_JSON_STRING(T2.facet_detail)
      JOIN
        StatVarQueriesPerQueryType AS T3
        ON  T1.statVarDCID = T3.stat_var_dcid
      GROUP BY
        T1.feature,
        T1.statVarDCID,
        T1.facet_detail,
        T2.total_num_queries,
        T2.total_num_entities,
        T2.queries_by_query_type,
        T2.entities_by_query_type,
        T3.queries_by_query_type
    ),

    -- Nesting stat var info by feature
    FinalAgg AS (
      SELECT
        feature,
        MAX(latest_entry) as latest_entry,
        ARRAY_AGG(STRUCT(statVarDCID, queries_by_query_type, facets)) AS stat_vars
      FROM
        (
          SELECT
            feature,
            MAX(latest_entry) as latest_entry,
            statVarDCID,
            queries_by_query_type,
            ARRAY_AGG(facet) AS facets
          FROM
            AggregatedPlaceTypes
          GROUP BY
            feature,
            statVarDCID,
            queries_by_query_type
        ) AS AggregatedStatVars
      GROUP BY
        feature
    ),

    -- Total query count for each feature
    OverallQueryCount AS (
      SELECT COUNT(DISTINCT query_id) as num_queries, feature
      FROM UnnestedLogsWithProvenance
      GROUP BY feature
    )

    -- Final SELECT statement for the INSERT
    SELECT
      T1.latest_entry AS timestamp,
      T1.feature,
      T2.num_queries,
      T1.stat_vars 
    FROM
      FinalAgg AS T1
    JOIN OverallQueryCount AS T2
      ON T1.feature = T2.feature
)