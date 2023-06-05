WITH T AS (
SELECT CONCAT(population_type) AS topic,
       "" AS member,
       num_constraints AS nc,
       id AS sv
  FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE
  num_constraints = 0
  AND population_type NOT IN ('Person', 'Place', 'Allele', 'Thing')
  AND population_type NOT LIKE 'SDG%'

UNION ALL

SELECT CONCAT(p1, "-", population_type) AS topic,
       v1 AS member,
       num_constraints AS nc,
       id AS sv
  FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE
  num_constraints >= 1 AND num_constraints <= 5
  AND population_type NOT IN ('Allele', 'Thing')
  AND population_type NOT LIKE 'SDG%'

UNION ALL

SELECT CONCAT(p2, "-", population_type) AS topic,
       v2 AS member,
       num_constraints AS nc,
       id AS sv
  FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE
  num_constraints >= 2 AND num_constraints <= 5
  AND population_type NOT IN ('Allele', 'Thing')
  AND population_type NOT LIKE 'SDG%'

UNION ALL

SELECT CONCAT(p3, "-", population_type) AS topic,
       v3 AS member,
       num_constraints AS nc,
       id AS sv
  FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE
  num_constraints >= 3 AND num_constraints <= 5
  AND population_type NOT IN ('Allele', 'Thing')
  AND population_type NOT LIKE 'SDG%'

UNION ALL

SELECT CONCAT(p4, "-", population_type) AS topic,
       v4 AS member,
       num_constraints AS nc,
       id AS sv
  FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE
  num_constraints >= 4 AND num_constraints <= 5
  AND population_type NOT IN ('Allele', 'Thing')
  AND population_type NOT LIKE 'SDG%'

UNION ALL

SELECT CONCAT(p5, "-", population_type) AS topic,
       v5 AS member,
       num_constraints AS nc,
       id AS sv
  FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE
  num_constraints = 5
  AND population_type NOT IN ('Allele', 'Thing')
  AND population_type NOT LIKE 'SDG%')

SELECT topic,
       MIN(nc) AS num_pvs,
       STRING_AGG(DISTINCT member, "\n" LIMIT 10) AS members
FROM T
JOIN `datcom-store.dc_kg_latest.StatVarObservation` AS SVO ON TRUE               
JOIN `datcom-store.dc_kg_latest.Place` AS P ON TRUE          
WHERE P.id = SVO.observation_about AND                                           
        (P.type IN ('Country', 'Continent', 'County', 'State',                     
                    'CensusZipCodeTabulationArea', 'CensusCountyDivision',         
                    'AdministrativeArea1', 'AdministrativeArea2',                  
                    'AdministrativeArea3', 'EurostatNUTS1',                        
                    'EurostatNUTS2', 'EurostatNUTS3') OR
         P.id = 'Earth') AND                                          
        T.sv = SVO.variable_measured AND
        SVO.prov_id NOT IN ('dc/base/SEDAScores',                 
                            'dc/base/OpportunityInsightsOutcomes',         
                            'dc/base/OpportunityInsightsNeighborhoods')
GROUP BY topic
HAVING (COUNT(DISTINCT member) > 1 OR members = "") AND COUNT(DISTINCT SVO.observation_about) > 40
ORDER BY topic
