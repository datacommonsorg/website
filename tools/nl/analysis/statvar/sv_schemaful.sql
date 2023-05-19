WITH T AS (
  SELECT SV.id AS sv,                                                            
         COUNT(DISTINCT SVO.observation_about) AS nplaces                          
  FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV                       
  JOIN `datcom-store.dc_kg_latest.StatVarObservation` AS SVO ON TRUE               
  JOIN `datcom-store.dc_kg_latest.Place` AS P ON TRUE                              
  WHERE SV.id <> SV.measured_prop AND                                              
        P.id = SVO.observation_about AND                                           
        (P.type IN ('Country', 'Continent', 'County', 'State',                     
                    'CensusZipCodeTabulationArea', 'CensusCountyDivision',         
                    'AdministrativeArea1', 'AdministrativeArea2',                  
                    'AdministrativeArea3', 'EurostatNUTS1',                        
                    'EurostatNUTS2', 'EurostatNUTS3') OR
         P.id = 'Earth') AND                                          
        SV.id = SVO.variable_measured AND
        SV.population_type NOT IN ('Thing', 'Allele',
                                   'OpportunityInsightsCohort') AND
        SV.population_type NOT LIKE 'SDG_%' AND
        SV.num_constraints <= 5 AND
        SV.stat_type NOT IN ('confidenceIntervalLowerLimit',
                             'confidenceIntervalUpperLimit',
                             'kurtosisValue',
                             'marginOfError',
                             'meanStdError',
                             'measurementResult',
                             'sampleSize',
                             'skewnessValue',
                             'stdDeviationValue',
                             'stdError') AND
        SV.stat_type NOT LIKE 'percentile%' AND
        SVO.prov_id NOT IN ('dc/base/SEDAScores',                 
                            'dc/base/OpportunityInsightsOutcomes',         
                            'dc/base/OpportunityInsightsNeighborhoods') AND
        -- Temporary hack due to buggy SV definition
        SV.id NOT LIKE 'SampleSize_%'
  GROUP BY sv
  HAVING nplaces > 40
)

SELECT SV.id, SV.population_type, SV.measured_prop,
       SV.p1, SV.v1, SV.p2, SV.v2,
       SV.p3, SV.v3, SV.p4, SV.v4,
       SV.p5, SV.v5, SV.stat_type,
       SV.measurement_qualifier, SV.measurement_denominator,
       SV.num_constraints, T.nplaces
FROM `datcom-store.dc_kg_latest.StatisticalVariable` AS SV                       
INNER JOIN T ON T.sv = SV.id
ORDER BY SV.id
