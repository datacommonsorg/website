WITH T AS (
  SELECT
    I.dcid AS SV,
    P.type AS PlaceType,
    ANY_VALUE(P.id) AS Place
  FROM `datcom-store.scratch.NLStatVarIndexMedium` AS I
  JOIN `datcom-store.dc_kg_latest.StatisticalVariable` AS V ON TRUE
  JOIN `datcom-store.dc_kg_latest.StatVarObservation` AS O ON TRUE
  JOIN `datcom-store.dc_kg_latest.Place` AS P ON TRUE
  WHERE P.id = O.observation_about AND
        P.type IN ('Country', 'Continent', 'County', 'State',
                   'AdministrativeArea1', 'AdministrativeArea2',
                   'AdministrativeArea3', 'EurostatNUTS1',
                   'EurostatNUTS2', 'EurostatNUTS3') AND
        O.variable_measured = I.dcid AND
        P.name IS NOT NULL AND
        V.id = I.dcid AND
        V.id NOT LIKE 'sdg/%' AND
        V.id <> V.measured_prop AND
        V.population_type NOT IN ('Allele', 'Thing')
  GROUP BY SV, Type)

SELECT T.SV, T.PlaceType, T.Place, V.name AS SVDesc, P.name AS PlaceName, O.value AS Population
FROM T
JOIN `datcom-store.dc_kg_latest.StatisticalVariable` AS V ON TRUE
JOIN `datcom-store.dc_kg_latest.Place` AS P ON TRUE
JOIN `datcom-store.dc_kg_latest.StatVarObservation` AS O ON TRUE
WHERE T.SV = V.id AND T.Place = P.id AND O.observation_about = T.Place AND
      O.variable_measured = 'Count_Person' AND O.is_preferred_obs_across_facets
ORDER BY SV, PlaceType, Place;
