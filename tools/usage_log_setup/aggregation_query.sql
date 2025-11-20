{{QUERY_COMMAND}}
(
    WITH 
    LatestLogTime AS (
        {{LATEST_LOG_TIME_SUBQUERY}}
    ),
    CacheCounts AS (
        SELECT
        mixer_response_id,
        COUNT(*) AS num_fetches
        FROM
        `{{DESTINATION_PROJECT_ID}}.{{CACHE_LOGS_DATASET}}.{{CACHE_LOGS_TABLE}}` AS T_Cache,
        UNNEST(T_Cache.jsonPayload.mixer_response_ids) AS mixer_response_id
        GROUP BY
        mixer_response_id
    ),
    -- This joins the cache counts with the log fields.
    -- All of the content of the usage logs is in jsonPayload.
    SourceWithCounts AS (
        SELECT
        T1.jsonPayload,
        T1.timestamp,
        COALESCE(T2.num_fetches, 1) AS num_fetches_to_replicate
        FROM
        `{{DESTINATION_PROJECT_ID}}.{{DESTINATION_DATASET}}.{{DESTINATION_TABLE}}` AS T1
        LEFT JOIN
        CacheCounts AS T2
        ON T1.jsonPayload.usage_log.response_id = T2.mixer_response_id
        WHERE
        T1.timestamp > (SELECT latest_log_time FROM LatestLogTime)
    ),
    -- This creates a baseline table with one row for each query.
    -- It assigns a unique ID to each source query before unnesting for accurate counts
    -- It also duplicates rows based on the number of times their responseId appears in the website cache logs,
    -- which captures usage when these resposnses are fetched from the cache instead of from Mixer. 
    SourceWithID_Temp AS (
        -- Duplicates each query log based on the number of times it is cached
        -- Also separates the response ID as a unique query_id for easy access
        SELECT
        T_Base.jsonPayload.usage_log.response_id AS query_id,
        T_Base.jsonPayload,
        T_Base.timestamp
        FROM
        SourceWithCounts AS T_Base,
        UNNEST(GENERATE_ARRAY(1, GREATEST(1, T_Base.num_fetches_to_replicate))) AS fan_out
    ),
    -- Unnests query-level logs by stat var and facet
    -- Also joins with datcom-store to get provenance information
    -- This lets us identify the facets by organization, e.g. all facets contributed by the UN
    UnnestedFacetsWithProvenance AS (
      SELECT
        T1.query_id,
        T1.jsonPayload.usage_log.feature as feature,
        T1.jsonPayload.usage_log.query_type as query_type,
        statVar.stat_var_dcid AS statVarDCID,
        T1.timestamp,
        STRUCT(
          (SELECT AS STRUCT facet.facet.*, src.name AS provenance_name) AS facet_detail,
          COALESCE(SAFE.PARSE_DATE('%Y', facet.earliest), CURRENT_DATE()) AS earliest,
          COALESCE(SAFE.PARSE_DATE('%Y', facet.latest), CURRENT_DATE()) AS latest,
         facet.num_series
        ) AS facet
      FROM
        SourceWithID_Temp AS T1,
        UNNEST(T1.jsonPayload.usage_log.stat_vars) AS statVar
      -- Left joining here ensures that stat vars that have no facets are still included
      LEFT JOIN UNNEST(statVar.facets) AS facet
      -- Join with provenance information from knowledge graph
      -- If you are an external user, see https://docs.datacommons.org/bigquery/  for information on
      -- public access to these tables.
      LEFT JOIN `datcom-store.dc_kg_latest.Provenance` AS prov
        ON facet.facet.import_name = prov.name
      LEFT JOIN `datcom-store.dc_kg_latest.Source` AS src
        ON prov.source = src.id
    ),

    -- Unnests the query-level table by place type
    UnnestedPlaceTypes AS (
      SELECT
        T1.query_id,
        -- Place types are out for some import groups but aren't guaranteed to be found
        COALESCE(place_type_raw, "unknown") AS place_type
      FROM
        SourceWithID_Temp AS T1
      -- Unnest the place types array. This fans out the rows.
      LEFT JOIN UNNEST(T1.jsonPayload.usage_log.place_types) AS place_type_raw
    ),

    -- Joins the two tables above to get logs unnested by query AND place type
    UnnestedLogsWithProvenance AS (
      SELECT
        F.query_id,
        F.feature,
        P.place_type,
        F.query_type,
        F.statVarDCID,
        F.timestamp,
        F.facet -- The whole facet struct (with num_series) from UnnestedFacets
      FROM
        UnnestedFacetsWithProvenance AS F
      JOIN
        UnnestedPlaceTypes AS P
        ON F.query_id = P.query_id
    ),

    -- Calculate the query and series counts for each place_type for each facet
    FacetCountsByPlaceType AS (
      SELECT
        feature,
        statVarDCID,
        facet.facet_detail,
        place_type,
        MAX(timestamp) as latest_entry,
        COUNT(DISTINCT query_id) AS num_queries,
        SUM(facet.num_series) AS num_series,
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

    -- Calculate the total query and series count for each facet
    -- and the counts by query type
    FacetCountsByQueryType AS (
      SELECT 
        feature,
        statVarDCID,
        facet_detail,
        ARRAY_AGG(STRUCT(query_type, num_queries) ORDER BY query_type) AS num_queries_by_query_type,
        ARRAY_AGG(STRUCT(query_type, num_series) ORDER BY query_type) AS num_series_by_query_type,
        SUM(num_series) AS total_num_series,
        SUM(num_queries) AS total_num_queries
      FROM ( 
        SELECT
          feature,
          statVarDCID,
          facet.facet_detail,
          query_type,
          SUM(facet.num_series) AS num_series,
          COUNT(DISTINCT query_id) AS num_queries
        FROM
          UnnestedFacetsWithProvenance as prov
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

    -- Number of times each stat var was requested for facet, value, and existence queries
    StatVarQueriesPerQueryType AS (
      SELECT 
        feature,
        stat_var_dcid,
        ARRAY_AGG(STRUCT(query_type, num_queries) ORDER BY query_type) AS num_queries_by_query_type,
      FROM (
        -- gathered by query type
        SELECT 
          T1.jsonPayload.usage_log.feature,
          statVar.stat_var_dcid,
          jsonPayload.usage_log.query_type,
          COUNT(DISTINCT T1.query_id) as num_queries
        FROM
          SourceWithID_Temp AS T1,
          UNNEST(T1.jsonPayload.usage_log.stat_vars) AS statVar
        GROUP BY
          feature,
          stat_var_dcid,
          jsonPayload.usage_log.query_type
      )
      GROUP BY
        feature,
        stat_var_dcid
    ),

    -- Counts queries where a statvar was requested but returned 0 facets, by place and query type
    -- THis is unnested and used for cumulative calculations below
    StatVarNoResults AS (
      SELECT
        T1.jsonPayload.usage_log.feature,
        statVar.stat_var_dcid,
        T1.jsonPayload.usage_log.query_type,
        P.place_type,
        COUNT(DISTINCT T1.query_id) AS num_no_results_queries
      FROM
        SourceWithID_Temp AS T1,
        UNNEST(T1.jsonPayload.usage_log.stat_vars) AS statVar
      JOIN
        UnnestedPlaceTypes AS P
        ON T1.query_id = P.query_id
      WHERE
        -- facets array is NULL or empty
        COALESCE(ARRAY_LENGTH(statVar.facets), 0) = 0
      GROUP BY
        feature,
        stat_var_dcid,
        query_type,
        place_type
    ),

    -- Aggregate "no results" by query type
    NoResultsByQueryType AS (
      SELECT
        feature,
        stat_var_dcid,
        ARRAY_AGG(STRUCT(query_type, num_queries_per_type) ORDER BY query_type) AS no_results_by_query_type
      FROM (
        -- Sum by query_type
        SELECT
          feature,
          stat_var_dcid,
          query_type,
          SUM(num_no_results_queries) AS num_queries_per_type
        FROM
          StatVarNoResults
        GROUP BY
          feature,
          stat_var_dcid,
          query_type
      )
      GROUP BY
        feature,
        stat_var_dcid
    ),

    -- Aggregate "no results" by place type
    NoResultsByPlaceType AS (
      SELECT
        feature,
        stat_var_dcid,
        ARRAY_AGG(STRUCT(place_type, num_queries_per_type) ORDER BY place_type) AS no_results_by_place_type
      FROM (
        -- Sum by place_type
        SELECT
          feature,
          stat_var_dcid,
          place_type,
          SUM(num_no_results_queries) AS num_queries_per_type
        FROM
          StatVarNoResults
        GROUP BY
          feature,
          stat_var_dcid,
          place_type
      )
      GROUP BY
        feature,
        stat_var_dcid
    ),

    -- Get total "no results" count
    NoResultsTotal AS (
      SELECT
        feature,
        stat_var_dcid,
        SUM(num_no_results_queries) AS total_num_no_results_queries
      FROM StatVarNoResults
      GROUP BY
        feature,
        stat_var_dcid
    ),

    -- Combine the place_type breakdown with the total facet count.
    -- This is the complete result each (statvar, facet pair)
    AggregatedPlaceTypes AS (
      SELECT
        T1.feature,
        T1.statVarDCID,
        MAX(T1.latest_entry) as latest_facet_entry,
        STRUCT(
          T1.facet_detail,
          T2.total_num_queries AS num_queries,
          T2.total_num_series AS num_series,
          T2.num_queries_by_query_type,
          T2.num_series_by_query_type,
          ARRAY_AGG(STRUCT(T1.place_type, T1.num_queries) ORDER BY T1.place_type) AS num_queries_by_place_type,
          ARRAY_AGG(STRUCT(T1.place_type, T1.num_series) ORDER BY T1.place_type) AS num_series_by_place_type,
          DATE_TRUNC(MIN(T1.earliest), YEAR) AS earliest,
          DATE_TRUNC(MAX(T1.latest), YEAR) AS latest
        ) AS facet
      FROM
        FacetCountsByPlaceType AS T1
      JOIN
        FacetCountsByQueryType AS T2
        ON TO_JSON_STRING(T1.feature) = TO_JSON_STRING(T2.feature)
        AND T1.statVarDCID = T2.statVarDCID
        AND TO_JSON_STRING(T1.facet_detail) = TO_JSON_STRING(T2.facet_detail)
      GROUP BY
        T1.feature,
        T1.statVarDCID,
        T1.facet_detail,
        T2.total_num_queries,
        T2.total_num_series,
        T2.num_queries_by_query_type,
        T2.num_series_by_query_type
    ),

    --Aggregates all facets for each statvar that has any.
    AggregatedFacets AS (
      SELECT
        feature,
        statVarDCID,
        ARRAY_AGG(facet) AS facets
      FROM
        AggregatedPlaceTypes
      GROUP BY
        feature,
        statVarDCID
    ),

    -- Nesting the above stat var info by feature
    FinalAgg AS (
      SELECT
        T1.feature,
        ARRAY_AGG(
          STRUCT(
            T1.stat_var_dcid AS statVarDCID, 
            T1.num_queries_by_query_type, 
            COALESCE(T_Total.total_num_no_results_queries, 0) AS total_num_no_results_queries,
            T_QT.no_results_by_query_type,
            T_PT.no_results_by_place_type,
            T2.facets
          )
        ) AS stat_vars
      FROM
        StatVarQueriesPerQueryType AS T1
      LEFT JOIN 
        AggregatedFacets AS T2
        ON TO_JSON_STRING(T1.feature) = TO_JSON_STRING(T2.feature)
        AND T1.stat_var_dcid = T2.statVarDCID
      LEFT JOIN
        NoResultsTotal AS T_Total
        ON TO_JSON_STRING(T1.feature) = TO_JSON_STRING(T_Total.feature)
        AND T1.stat_var_dcid = T_Total.stat_var_dcid
      LEFT JOIN
        NoResultsByQueryType AS T_QT
        ON TO_JSON_STRING(T1.feature) = TO_JSON_STRING(T_QT.feature)
        AND T1.stat_var_dcid = T_QT.stat_var_dcid
      LEFT JOIN
        NoResultsByPlaceType AS T_PT
        ON TO_JSON_STRING(T1.feature) = TO_JSON_STRING(T_PT.feature)
        AND T1.stat_var_dcid = T_PT.stat_var_dcid
      GROUP BY
        T1.feature
    ),

    -- Total query count for each feature
    OverallQueryCount AS (
      SELECT 
        COUNT(DISTINCT query_id) as num_queries, 
        jsonPayload.usage_log.feature as feature,
        MAX(timestamp) as latest_entry
      FROM 
        SourceWithID_Temp
      GROUP BY 
        feature
    )
    -- Connects all of the stat var info with the overall query counts
    SELECT
      T2.latest_entry AS timestamp,
      -- getting a boolean indicator if the day is a weekend to differentate weekend/weekday usage
      CAST(
      CASE
          WHEN EXTRACT(DAYOFWEEK FROM T2.latest_entry) IN (1, 7) THEN 1
          ELSE 0
        END
      AS NUMERIC) AS is_weekend,
      -- Formatting public-api surface, which has no surface header value
      CASE
        WHEN T2.feature.surface = '' THEN STRUCT(T2.feature.is_remote AS is_remote, 'public-api' AS surface)
        ELSE T2.feature
      END AS feature,
      T2.num_queries,
      T1.stat_vars 
    FROM
      OverallQueryCount AS T2
    LEFT JOIN FinalAgg AS T1
      ON TO_JSON_STRING(T1.feature) = TO_JSON_STRING(T2.feature)
)