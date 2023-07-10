-- Get a list of schema tokens that appear in SVs that are part of the
-- medium index, along with sample places.

WITH UniqueTokens AS (
 WITH Tokens AS (
  -- Get all SV components in index with associated place type and a few names.
  WITH IDPlace AS (
    -- Get all SVs in index with associated place type and a few names.
    WITH SVPlace AS (
      SELECT I.dcid AS SV,
            P.type AS Type,
            ANY_VALUE(P.name) AS Places
      FROM `datcom-store.scratch.NLStatVarIndexMedium` AS I
      JOIN `datcom-store.dc_kg_latest.StatVarObservation` AS O ON TRUE
      JOIN `datcom-store.dc_kg_latest.Place` AS P ON TRUE
      WHERE P.id = O.observation_about AND
            P.type IN ('Country', 'Continent', 'County', 'State',
                       'AdministrativeArea1', 'AdministrativeArea2',                  
                       'AdministrativeArea3', 'EurostatNUTS1',                        
                       'EurostatNUTS2', 'EurostatNUTS3') AND
            O.variable_measured = I.dcid
      GROUP BY SV, Type)

    -- For those SVs, break it down into tokens.
    SELECT population_type, measured_prop,
           p1, p2, p3, p4, p5, v1, v2, v3, v4, v5,
           Type, Places
    FROM SVPlace
    JOIN `datcom-store.dc_kg_latest.StatisticalVariable` AS V ON TRUE
    WHERE SVPlace.SV = V.id)

  -- Break down the tokens into a single table w/ a context
  SELECT "pop" AS ctx, population_type AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT population_type AS ctx, measured_prop AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT population_type AS ctx, p1 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT p1 AS ctx, v1 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT population_type AS ctx, p2 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT p2 AS ctx, v2 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT population_type AS ctx, p3 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT p3 AS ctx, v3 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT population_type AS ctx, p4 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT p4 AS ctx, v4 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT population_type AS ctx, p5 AS Token, Type, Places FROM IDPlace
  UNION ALL
  SELECT p5 AS ctx, v5 AS Token, Type, Places FROM IDPlace)

-- Uniquefy the tokens
SELECT Tok.ctx,
       Tok.Token,
       T.object_value AS Name,
       Tok.Type,
       ANY_VALUE(Tok.Places) AS Places
FROM Tokens AS Tok
JOIN `datcom-store.dc_kg_latest.Triple` AS T ON TRUE
WHERE Tok.Token = T.subject_id AND T.predicate = 'name'
GROUP BY ctx, Token, Name, Type)

-- Get associated token names
SELECT Tok.Ctx AS Context,
       Tok.Token,
       Tok.Name,
       STRING_AGG(CONCAT(CAST(Tok.Type AS STRING), "=",
                         CAST(Tok.Places AS STRING)), ":") AS SamplePlaces
FROM UniqueTokens AS Tok
GROUP BY Context, Token, Name
ORDER BY Context, Token, Name;
