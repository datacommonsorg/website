# Copyright 2023 Google LLC
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

import csv
import re

from absl import app
from absl import flags

FLAGS = flags.FLAGS

flags.DEFINE_string('input_csv', 'data/schema_tokens_medium.csv',
                    'Input tokens CSV file')
flags.DEFINE_string('output_csv', 'data/seed_queries.csv',
                    'Generated queries file')
flags.DEFINE_bool('do_places_in', False, 'Generate places in?')

_PLACE_PREF = [
    'State',
    'County',
    'Country',
    'AdministrativeArea1',
    'AdministrativeArea2',
    'EurostatNUTS2',
    'EurostatNUTS3',
    'EurostatNUTS1',
]

_PLACE_PAIR_PREF = [
    ('State', 'County'),
    ('Country', 'State'),
    ('Country', 'AdministrativeArea1'),
    ('AdministrativeArea1', 'AdministrativeArea2'),
    ('Country', 'EurostatNUTS2'),
    ('EurostatNUTS2', 'EurostatNUTS3'),
]

_TYPE_REMAP = {
    'AdministrativeArea1': 'state',
    'AdministrativeArea2': 'district',
    'EurostatNUTS1': 'state',
    'EurostatNUTS2': 'state',
    'EurostatNUTS3': 'district',
}

_CTX_REMAP = {
    'abilityToSpeakEnglish':
        '',
    'activitySource':
        '',
    'areaType':
        '',
    'armedForcesStatus':
        '',
    'Atmosphere':
        '',
    'benefitsStatus':
        'families',
    'biasMotivation':
        'hate crimes motivated by',
    'BirthEvent':
        'births by',
    'BLSEstablishment':
        'companies by',
    'BLSWorker':
        'workers by',
    'CriminalActivities':
        'crimes',
    'cashRentStatus':
        'houses with',
    'citizenshipStatus':
        '',
    'claimType':
        'unemployment insurance',
    'consumingSector':
        'electricity consuming sector',
    'consumedThing':
        'consumption of',
    'causeOfDeath':
        'deaths due to',
    'Coal':
        'coal',
    'correctionalFacilityLocation':
        'correctional facility located',
    'correctionalFacilityOperator':
        'correctional facility operated',
    'crimeType':
        '',
    'detailedLevelOfSchool':
        'number of students enrolled in',
    'disabilityStatus':
        '',
    'drugPrescribed':
        'prescriptions of',
    'electricityConsumingSector':
        'electricity consumed by',
    'economicSector':
        '',
    'educationalAttainment':
        'number of people who studied till',
    'Electricity':
        'electricity',
    'emissionSource':
        'emissions from',
    'emittedThing':
        'emissions due to',
    'employment':
        'people who are',
    'employmentStatus':
        'people who are',
    'energySource':
        'electricity from source',
    'facilities':
        'houses with',
    'healthBehavior':
        '',
    'healthOutcome':
        '',
    'householdType':
        '',
    'householderEducationalAttainment':
        'families where the head has studied till',
    'householderRace':
        'families who are',
    'insuredThing':
        'natural hazard insurance for',
    'isic':
        '',
    'languageSpokeAtHome':
        'population that speaks',
    'landCover':
        'land covered by',
    'languageSpokenAtHome':
        'people who speak',
    'literacyStatus':
        '',
    'maritalStatus':
        '',
    'maxClassification':
        'storm classified as',
    'medicalCondition':
        '',
    'MedicalConditionIncident':
        'medical conditions by',
    'mothersEducation':
        'mothers educated till',
    'mothersMaritalStatus':
        'mothers who are',
    'mothersNativity':
        'mothers who are',
    'mothersRace':
        'mothers who are',
    'occupancyStatus':
        '',
    'occupancyTenure':
        '',
    'placeOfBirth':
        'people born in',
    'naics':
        '',
    'naturalHazardType':
        '',
    'pop':
        '',
    'placeCategory':
        'covid19 mobility trend in',
    'Person':
        'population by',
    'Place':
        '',
    'producingSector':
        'electricity producing sector',
    'race':
        'population that is',
    'religion':
        '',
    'residenceType':
        'people residing in',
    'residentStatus':
        'people who lived in',
    'schoolEnrollment':
        'number of students enrolled in',
    'socialCategory':
        '',
    'structureType':
        'houses that are',
    'transmissionMode':
        'diseases that spread by',
    'typeOfSchool':
        '',
    'usedFor':
        'fuel use in',
    'USCWorker':
        'workers by',
    'USCEstablishment':
        'companies by',
    'waterSource':
        'water withdrawal from',
    'workerClassification':
        '',
    'workerStatus':
        '',
}

# ctx, name -> replacement
_PAIR_REMAP = {
    ('Atmosphere', 'accumulationPeriod'): '_DELETE_',
    ('activityFrequency', 'Daily'): '_DELETE_',
    ('citizenshipStatus', 'NotAUSCitizen'): 'people who are not citizens',
    ('Consumption', 'amount'): '_DELETE_',
    ('Consumption', 'consumedThing'): '_DELETE_',
    ('Consumption', 'consumerAge'): '_DELETE_',
    ('Person', 'count'): 'population',
    ('healthInsurance', 'NoHealthInsurance'): 'people with no health insurance',
    ('internetUser', 'True'): 'internet users',
    ('pop', 'BLSEstablishment'): 'companies',
    ('pop', 'USCEstablishment'): 'companies',
    ('pop', 'BLSWorker'): 'workers',
    ('pop', 'USCWorker'): 'workers',
    ('Product', 'productType'): '_DELETE_',
    ('Production', 'amount'): '_DELETE_',
    ('Production', 'producedThing'): '_DELETE_',
    ('producedThing', 'Electricity'): 'electricity production',
    ('Place', 'areaType'): '_DELETE_',
    ('StatisticalVariable', 'geoLevel'): '_DELETE_',
    ('StatisticalVariable', 'count'): '_DELETE_',
    ('Electricity', 'usedFor'): 'breakdown of electricity use',
    ('ElectricityConsumer', 'count'): 'number of electricity consumers',
    ('Energy', 'usedFor'): 'energy is used',
    ('Water', 'usedFor'): 'water usage',
}

# Replace sources
_POSTPROC_EMPTIES = ['USC_', 'BLS_', 'DAD_', 'EIA_', 'CDC_', 'BRA_']

_POSTPROC_STR_REPLACEMENTS = {
    '_ ': ' ',
    'Past 12 Months': 'Last Year',
    ' Th ': 'th ',
}


def fmt(name, ctx=''):
  if '(' in name and ')' in name:
    if ctx in ['causeOfDeath']:
      # Keep only the stuff within `()`
      name = re.search(r'\(([^()]+)\)', name).group(1)
    else:
      # Strip stuff within `()`
      name = re.sub(r'\([^()]*\)', '', name)

  # split camel case
  splits = re.sub('([A-Z][a-z]+)', r' \1', re.sub('([A-Z]+)', r' \1',
                                                  name)).split()

  result = ' '.join(splits)

  # Add space between char and number
  result = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', result)

  for s in _POSTPROC_EMPTIES:
    result = result.replace(s, '')

  for f, t in _POSTPROC_STR_REPLACEMENTS.items():
    result = result.replace(f, t)

  return ' '.join(result.split())


def get_var(ctx, name):
  ctx_str = _CTX_REMAP.get(ctx, ctx)
  final_str = _PAIR_REMAP.get((ctx, name), '')

  if final_str == '_DELETE_':
    return ''

  if final_str:
    return final_str

  if not ctx_str:
    return f'{fmt(name, ctx)}'

  if ctx_str != ctx:
    return f'{ctx_str} {fmt(name, ctx)}'

  ctx_is_class = ctx[0] >= 'A' and ctx[0] <= 'Z'
  if ctx_is_class:
    if name == 'count':
      return f'count of {fmt(ctx)}'
    else:
      return f'{fmt(ctx)} by {fmt(name, ctx)}'
  else:
    return f'{fmt(ctx)} {fmt(name, ctx)}'


def get_places(place_str):
  places = place_str.split(':')
  pmap = {}

  for p in places:
    pt, pl = p.split('=', 1)
    pmap[pt] = pl

  places = []
  for pt in _PLACE_PREF:
    if pt in pmap:
      # Just one place for now
      places.append((pmap[pt], ''))
      break

  if FLAGS.do_places_in:
    for parent, child in _PLACE_PAIR_PREF:
      if parent in pmap and child in pmap:
        places.append((pmap[parent], _TYPE_REMAP.get(child, child.lower())))

  return places


def generate(row):
  var = get_var(row['Context'], row['Name'])
  places = get_places(row['SamplePlaces'])
  queries = []
  if not var or not places:
    return queries
  for pl, typ in places:
    if not typ:
      queries.append(f'what about {var} in {pl}?')
    else:
      queries.append(f'what about {var} in {typ} of {pl}?')
  return queries


def main(_):
  with open(FLAGS.input_csv) as fin:
    with open(FLAGS.output_csv, 'w') as fout:
      csvw = csv.writer(fout)
      csvw.writerow(['Query'])
      for row in csv.DictReader(fin):
        queries = generate(row)
        if not queries:
          continue
        for q in queries:
          csvw.writerow([q])


if __name__ == "__main__":
  app.run(main)
