/**
 * Copyright 2020 Google LLC
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

export const mapping = `
Node: E:StatisticalVariable->E1
typeOf: StatisticalVariable
dcid: C:StatisticalVariable->id
provenance: E:StatisticalVariable->E2
populationType: C:StatisticalVariable->population_type
measuredProperty: C:StatisticalVariable->measured_prop
statType: C:StatisticalVariable->stat_type
measurementQualifier: C:StatisticalVariable->measurement_qualifier
measurementDenominator: E:StatisticalVariable->E3
p1: C:StatisticalVariable->p1
v1: C:StatisticalVariable->v1
p2: C:StatisticalVariable->p2
v2: C:StatisticalVariable->v2
p3: C:StatisticalVariable->p3
v3: C:StatisticalVariable->v3
p4: C:StatisticalVariable->p4
v4: C:StatisticalVariable->v4
p5: C:StatisticalVariable->p5
v5: C:StatisticalVariable->v5
p6: C:StatisticalVariable->p6
v6: C:StatisticalVariable->v6
p7: C:StatisticalVariable->p7
v7: C:StatisticalVariable->v7
p8: C:StatisticalVariable->p8
v8: C:StatisticalVariable->v8
p9: C:StatisticalVariable->p9
v9: C:StatisticalVariable->v9
p10: C:StatisticalVariable->p10
v10: C:StatisticalVariable->v10
numConstraints: C:StatisticalVariable->num_constraints
functionalDeps: dcid

Node: E:StatisticalVariable->E2
typeOf: Provenance
dcid: C:StatisticalVariable->prov_id
functionalDeps: dcid

Node: E:StatisticalVariable->E3
typeOf: StatisticalVariable
typeOf: Property
dcid: C:StatisticalVariable->measurement_denominator
functionalDeps: dcid


Node: E:StatVarObservation->E1
typeOf: StatVarObservation
dcid: C:StatVarObservation->id
observationAbout: E:StatVarObservation->E2
variableMeasured: E:StatVarObservation->E3
value: C:StatVarObservation->value
observationDate: C:StatVarObservation->observation_date
observationPeriod: C:StatVarObservation->observation_period
measurementMethod: C:StatVarObservation->measurement_method
unit: C:StatVarObservation->unit
scalingFactor: C:StatVarObservation->scaling_factor
samplePopulation: C:StatVarObservation->sample_population
location: E:StatVarObservation->E4
provenance: E:StatVarObservation->E5
functionalDeps: dcid

Node: E:StatVarObservation->E2
typeOf: Place
dcid: C:StatVarObservation->observation_about
functionalDeps: dcid

Node: E:StatVarObservation->E3
typeOf: StatisticalVariable
typeOf: Property
dcid: C:StatVarObservation->variable_measured
functionalDeps: dcid

Node: E:StatVarObservation->E4
typeOf: GeoCoordinates
dcid: C:StatVarObservation->location
functionalDeps: dcid

Node: E:StatVarObservation->E5
typeOf: Provenance
dcid: C:StatVarObservation->prov_id
functionalDeps: dcid


Node: E:Place->E1
typeOf: Place
subType: C:Place->type
dcid: C:Place->id
name: C:Place->name
alternateName: C:Place->alternate_name
timezone: C:Place->timezone
provenance: E:Place->E2
landArea: E:Place->E3
waterArea: E:Place->E4
latitude: C:Place->latitude
longitude: C:Place->longitude
elevation: C:Place->elevation
stateCode: C:Place->state_code
countryAlpha2Code: C:Place->country_alpha_2_code
countryAlpha3Code: C:Place->country_alpha_3_code
countryNumericCode: C:Place->country_numeric_code
functionalDeps: dcid

Node: E:Place->E2
typeOf: Provenance
dcid: C:Place->prov_id
functionalDeps: dcid

Node: E:Place->E3
typeOf: Quantity
dcid: C:Place->land_area
functionalDeps: dcid

Node: E:Place->E4
typeOf: Quantity
dcid: C:Place->water_area
functionalDeps: dcid


Node: E:PlaceExt->E1
typeOf: Place
subType: C:PlaceExt->type
dcid: C:PlaceExt->id
kmlCoordinates: C:PlaceExt->kml_coordinates
geoJsonCoordinates: C:PlaceExt->geo_json_coordinates
geoJsonCoordinatesDP1: C:PlaceExt->geo_json_coordinates_dp1
geoJsonCoordinatesDP2: C:PlaceExt->geo_json_coordinates_dp2
geoJsonCoordinatesDP3: C:PlaceExt->geo_json_coordinates_dp3
provenance: E:PlaceExt->E2
functionalDeps: dcid

Node: E:PlaceExt->E2
typeOf: Provenance
dcid: C:PlaceExt->prov_id
functionalDeps: dcid


Node: E:Instance->E1
typeOf: Thing
dcid: C:Instance->id
name: C:Instance->name
subType: C:Instance->type
provenance: E:Instance->E2
functionalDeps: dcid

Node: E:Instance->E2
typeOf: Provenance
dcid: C:Instance->prov_id
functionalDeps: dcid


Node: E:Quantity->E1
typeOf: Quantity
subType: C:Quantity->type
dcid: C:Quantity->id
unitOfMeasure: C:Quantity->unit_of_measure
value: C:Quantity->value
startValue: C:Quantity->start_value
endValue: C:Quantity->end_value
name: C:Quantity->name
functionalDeps: dcid


Node: E:Provenance->E1
typeOf: Provenance
dcid: C:Provenance->id
name: C:Provenance->name
curator: E:Provenance->E2
source: E:Provenance->E3
url: C:Provenance->provenance_url
description: C:Provenance->provenance_description
importUrl: C:Provenance->mcf_url
importTime: C:Provenance->timestamp_secs
importDuration: C:Provenance->duration_secs
provenance: E:Provenance->E4
functionalDeps: dcid

Node: E:Provenance->E2
typeOf: Curator
dcid: C:Provenance->curator
functionalDeps: dcid

Node: E:Provenance->E3
typeOf: Source
dcid: C:Provenance->source
functionalDeps: dcid

Node: E:Provenance->E4
typeOf: Provenance
dcid: C:Provenance->prov_id
functionalDeps: dcid


Node: E:Curator->E1
typeOf: Curator
dcid: C:Curator->id
provenance: E:Curator->E2
email: C:Curator->email
name: C:Curator->name
functionalDeps: dcid

Node: E:Curator->E2
typeOf: Provenance
dcid: C:Curator->prov_id
functionalDeps: dcid


Node: E:Source->E1
typeOf: Source
dcid: C:Source->id
provenance: E:Source->E2
domain: C:Source->domain
functionalDeps: dcid

Node: E:Source->E2
typeOf: Provenance
dcid: C:Source->prov_id
functionalDeps: dcid


Node: E:Triple->E1
dcid: C:Triple->subject_id
provenance: E:Triple->E2
C:Triple->predicate: C:Triple->object_value
functionalDeps: dcid

Node: E:Triple->E2
typeOf: Provenance
dcid: C:Triple->prov_id
functionalDeps: dcid
`;

export const sparql = {
  observation: `
SELECT ?node ?life_expectancy ?median_age
WHERE {
  ?node typeOf State .

  ?obs1 typeOf StatVarObservation .
  ?obs1 observationAbout ?node .
  ?obs1 variableMeasured LifeExpectancy_Person .
  ?obs1 observationDate "2010" .
  ?obs1 value ?life_expectancy .

  ?obs2 typeOf StatVarObservation .
  ?obs2 observationAbout ?node .
  ?obs2 variableMeasured Median_Age_Person .
  ?obs2 observationDate "2018" .
  ?obs2 value ?median_age .
}`,
  sv: `
SELECT ?sv
WHERE {
  ?sv typeOf StatisticalVariable .
  ?sv measuredProperty count .
  ?sv populationType Person .
}
`,
};
