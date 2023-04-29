WITH T AS (
SELECT DISTINCT
       SV.population_type AS pt,
       SV.p1 AS p,
       SV.v1 AS v
FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE SV.id <> SV.measured_prop AND
      SV.population_type NOT IN ('Thing', 'Allele', 'OpportunityInsightsCohort') AND
      SV.population_type NOT LIKE 'SDG_%' AND
      SV.num_constraints <= 5 AND
      (REGEXP_CONTAINS(SV.v1, r'(^(\D+)([\d]+|[\d]+\.[\d]+)Onwards$)') OR
       REGEXP_CONTAINS(SV.v1, r'(^(\D+)Upto([\d]+|[\d]+\.[\d]+)$)') OR
       REGEXP_CONTAINS(SV.v1, r'(^(\D+)([\d]+|[\d]+\.[\d]+)To([\d]+|[\d]+\.[\d]+)$)'))

UNION ALL

SELECT DISTINCT
       SV.population_type AS pt,
       SV.p2 AS p,
       SV.v2 AS v
FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE SV.id <> SV.measured_prop AND
      SV.population_type NOT IN ('Thing', 'Allele', 'OpportunityInsightsCohort') AND
      SV.population_type NOT LIKE 'SDG_%' AND
      SV.num_constraints <= 5 AND
      (REGEXP_CONTAINS(SV.v2, r'(^(\D+)([\d]+|[\d]+\.[\d]+)Onwards$)') OR
       REGEXP_CONTAINS(SV.v2, r'(^(\D+)Upto([\d]+|[\d]+\.[\d]+)$)') OR
       REGEXP_CONTAINS(SV.v2, r'(^(\D+)([\d]+|[\d]+\.[\d]+)To([\d]+|[\d]+\.[\d]+)$)'))

UNION ALL

SELECT DISTINCT
       SV.population_type AS pt,
       SV.p3 AS p,
       SV.v3 AS v
FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE SV.id <> SV.measured_prop AND
      SV.population_type NOT IN ('Thing', 'Allele', 'OpportunityInsightsCohort') AND
      SV.population_type NOT LIKE 'SDG_%' AND
      SV.num_constraints <= 5 AND
      (REGEXP_CONTAINS(SV.v3, r'(^(\D+)([\d]+|[\d]+\.[\d]+)Onwards$)') OR
       REGEXP_CONTAINS(SV.v3, r'(^(\D+)Upto([\d]+|[\d]+\.[\d]+)$)') OR
       REGEXP_CONTAINS(SV.v3, r'(^(\D+)([\d]+|[\d]+\.[\d]+)To([\d]+|[\d]+\.[\d]+)$)'))

UNION ALL

SELECT DISTINCT
       SV.population_type AS pt,
       SV.p4 AS p,
       SV.v4 AS v
FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE SV.id <> SV.measured_prop AND
      SV.population_type NOT IN ('Thing', 'Allele', 'OpportunityInsightsCohort') AND
      SV.population_type NOT LIKE 'SDG_%' AND
      SV.num_constraints <= 5 AND
      (REGEXP_CONTAINS(SV.v4, r'(^(\D+)([\d]+|[\d]+\.[\d]+)Onwards$)') OR
       REGEXP_CONTAINS(SV.v4, r'(^(\D+)Upto([\d]+|[\d]+\.[\d]+)$)') OR
       REGEXP_CONTAINS(SV.v4, r'(^(\D+)([\d]+|[\d]+\.[\d]+)To([\d]+|[\d]+\.[\d]+)$)'))

UNION ALL

SELECT DISTINCT
       SV.population_type AS pt,
       SV.p5 AS p,
       SV.v5 AS v
FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV
WHERE SV.id <> SV.measured_prop AND
      SV.population_type NOT IN ('Thing', 'Allele', 'OpportunityInsightsCohort') AND
      SV.population_type NOT LIKE 'SDG_%' AND
      SV.num_constraints <= 5 AND
      (REGEXP_CONTAINS(SV.v5, r'(^(\D+)([\d]+|[\d]+\.[\d]+)Onwards$)') OR
       REGEXP_CONTAINS(SV.v5, r'(^(\D+)Upto([\d]+|[\d]+\.[\d]+)$)') OR
       REGEXP_CONTAINS(SV.v5, r'(^(\D+)([\d]+|[\d]+\.[\d]+)To([\d]+|[\d]+\.[\d]+)$)')))

SELECT pt, p, COUNT(DISTINCT v) AS n_v, STRING_AGG(DISTINCT v) AS v_list FROM T
WHERE p is NOT NULL
GROUP BY pt, p
HAVING n_v > 1
ORDER BY pt, p
