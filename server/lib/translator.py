# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

SCHEMA_MAPPING = '''
Node: E:StatisticalPopulation->E1
typeOf: StatisticalPopulation
dcid: C:StatisticalPopulation->id
provenance: E:StatisticalPopulation->E3
isPublic: C:StatisticalPopulation->is_public
populationType: C:StatisticalPopulation->population_type
populationGroup: C:StatisticalPopulation->population_group
location: E:StatisticalPopulation->E2
p1: C:StatisticalPopulation->p1
v1: C:StatisticalPopulation->v1
p2: C:StatisticalPopulation->p2
v2: C:StatisticalPopulation->v2
p3: C:StatisticalPopulation->p3
v3: C:StatisticalPopulation->v3
p4: C:StatisticalPopulation->p4
v4: C:StatisticalPopulation->v4
p5: C:StatisticalPopulation->p5
v5: C:StatisticalPopulation->v5
p6: C:StatisticalPopulation->p6
v6: C:StatisticalPopulation->v6
p7: C:StatisticalPopulation->p7
v7: C:StatisticalPopulation->v7
p8: C:StatisticalPopulation->p8
v8: C:StatisticalPopulation->v8
p9: C:StatisticalPopulation->p9
v9: C:StatisticalPopulation->v9
p10: C:StatisticalPopulation->p10
v10: C:StatisticalPopulation->v10
numConstraints: C:StatisticalPopulation->num_constraints
functionalDeps: dcid

Node: E:StatisticalPopulation->E2
typeOf: Place
dcid: C:StatisticalPopulation->place_key
functionalDeps: dcid

Node: E:StatisticalPopulation->E3
typeOf: Provenance
dcid: C:StatisticalPopulation->prov_id
functionalDeps: dcid


Node: E:Observation->E1
typeOf: Observation
dcid: C:Observation->id
provenance: E:Observation->E3
isPublic: C:Observation->is_public
measuredProperty: C:Observation->measured_prop
observationDate: C:Observation->observation_date
observationPeriod: C:Observation->observation_period
meanValue: C:Observation->mean_value
medianValue: C:Observation->median_value
sumValue: C:Observation->sum_value
minValue: C:Observation->min_value
maxValue: C:Observation->max_value
measuredValue: C:Observation->measured_value
percentile10: C:Observation->p10
percentile25: C:Observation->p25
percentile75: C:Observation->p75
percentile90: C:Observation->p90
unit: C:Observation->unit
marginOfError: C:Observation->margin_of_error
measurementMethod: C:Observation->measurement_method
measurementResult: C:Observation->measurement_result
stdError: C:Observation->std_error
meanStdError: C:Observation->mean_std_error
sampleSize: C:Observation->sample_size
growthRate: C:Observation->growth_rate
observedNode: E:Observation->E2
functionalDeps: dcid

Node: E:Observation->E2
typeOf: StatisticalPopulation
typeOf: Place
dcid: C:Observation->observed_node_key
functionalDeps: dcid

Node: E:Observation->E3
typeOf: Provenance
dcid: C:Observation->prov_id
functionalDeps: dcid


Node: E:Place->E1
typeOf: Place
subType: C:Place->type
dcid: C:Place->id
isPublic: C:Place->is_public
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
isPublic: C:PlaceExt->is_public
kmlCoordinates: C:PlaceExt->kml_coordinates
provenance: E:PlaceExt->E2
functionalDeps: dcid

Node: E:PlaceExt->E2
typeOf: Provenance
dcid: C:PlaceExt->prov_id
functionalDeps: dcid


Node: E:Instance->E1
typeOf: Thing
dcid: C:Instance->id
isPublic: C:Instance->is_public
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
dcid: C:Quantity->row_info.id
unitOfMeasure: C:Quantity->unit_of_measure
value: C:Quantity->value
startValue: C:Quantity->start_value
endValue: C:Quantity->end_value
name: C:Quantity->name
functionalDeps: dcid


Node: E:Provenance->E1
typeOf: Provenance
dcid: C:Provenance->id
isPublic: C:Provenance->is_public
name: C:Provenance->name
curator: E:Provenance->E2
aclGroup: E:Provenance->E3
source: E:Provenance->E4
url: C:Provenance->provenance_url
importUrl: C:Provenance->mcf_url
importTime: C:Provenance->timestamp_secs
importDuration: C:Provenance->duration_secs
provenance: E:Provenance->E5
functionalDeps: dcid

Node: E:Provenance->E2
typeOf: Curator
dcid: C:Provenance->curator
functionalDeps: dcid

Node: E:Provenance->E3
typeOf: ACLGroup
dcid: C:Provenance->acl_group
functionalDeps: dcid

Node: E:Provenance->E4
typeOf: Source
dcid: C:Provenance->source
functionalDeps: dcid

Node: E:Provenance->E5
typeOf: Provenance
dcid: C:Provenance->prov_id
functionalDeps: dcid


Node: E:Curator->E1
typeOf: Curator
dcid: C:Curator->id
provenance: E:Curator->E2
isPublic: C:Curator->is_public
email: C:Curator->email
name: C:Curator->name
functionalDeps: dcid

Node: E:Curator->E2
typeOf: Provenance
dcid: C:Curator->prov_id
functionalDeps: dcid


Node: E:ACLGroup->E1
typeOf: ACLGroup
dcid: C:ACLGroup->id
provenance: E:ACLGroup->E2
isPublic: C:ACLGroup->is_public
email: C:ACLGroup->email
functionalDeps: dcid

Node: E:ACLGroup->E2
typeOf: Provenance
dcid: C:ACLGroup->prov_id
functionalDeps: dcid


Node: E:Source->E1
typeOf: Source
dcid: C:Source->id
provenance: E:Source->E2
isPublic: C:Source->is_public
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
'''

SAMPLE_QUERY = '''
SELECT ?node ?freelunch_percent ?unemploy_rate
WHERE {
  ?node typeOf State .

  ?pop typeOf StatisticalPopulation .
  ?pop location ?node .
  ?pop p1 "hasSocioEconomicHealthFactor" .
  ?pop v1 "FreeLunch" .
  ?pop numConstraints 1 .

  ?pop2 typeOf StatisticalPopulation .
  ?pop2 location ?node .
  ?pop2 numConstraints 0 .
  ?pop2 populationType "Person" .

  ?obs typeOf Observation .
  ?obs observedNode ?pop .
  ?obs measuredProperty percent .
  ?obs observationDate "2018" .
  ?obs measuredValue ?freelunch_percent .

  ?obs2 typeOf Observation .
  ?obs2 observedNode ?pop2 .
  ?obs2 measuredProperty unemploymentRate .
  ?obs2 observationDate "2018" .
  ?obs2 measuredValue ?unemploy_rate .
}
'''