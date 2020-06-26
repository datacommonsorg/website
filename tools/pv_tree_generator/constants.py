# Lint as: python3

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

"""constants used when creating the pv tree."""

import collections


VERTICALS = [
    'Demographics', 'Crime', 'Education', 'Employment', 'Health', 'Housing',
    'Household', 'Disasters', 'Environment', 'Economic'
]

NAICS = collections.OrderedDict([
    ('NAICS/10', 'All Industries'),
    ('NAICS/11', 'Agriculture, Fishing, Forestry, Hunting'),
    ('NAICS/21', 'Mining'), ('NAICS/22', 'Utilities'),
    ('NAICS/23', 'Construction'), ('NAICS/42', 'Wholesale Trade'),
    ('NAICS/51', 'Information'), ('NAICS/52', 'Finance and Insurance'),
    ('NAICS/53', 'Real Estate'),
    ('NAICS/54', 'Professional, Scientific, Technical Services'),
    ('NAICS/55', 'Management of Companies/Enterprises'),
    ('NAICS/56', 'Administrative and Waste Services'),
    ('NAICS/61', 'Educational Services'),
    ('NAICS/62', 'Health Care and Social Assistance'),
    ('NAICS/71', 'Arts, Entertainment and Recreation'),
    ('NAICS/72', 'Accommodation and Food Services'),
    ('NAICS/81', 'Other Services'), ('NAICS/92', 'Public Administration'),
    ('NAICS/99', 'Unclassified')
])

ICD10 = {
    'ICD10/A00-B99':
        '(A00-B99) Infectious, parasitic diseases',
    'ICD10/C00-D48':
        '(C00-D48) Neoplasms',
    'ICD10/D50-D89':
        '(D50-D89) Blood and Immune disorders',
    'ICD10/E00-E88':
        '(E00-E88) Endocrine, nutritional and metabolic diseases',
    'ICD10/F01-F99':
        '(F01-F99) Mental and behavioural disorders',
    'ICD10/G00-G98':
        '(G00-G98) Diseases of the nervous system',
    'ICD10/H00-H57':
        '(H00-H57) Diseases of the eye and adnexa',
    'ICD10/H60-H93':
        '(H60-H93) Diseases of the ear and mastoid process',
    'ICD10/I00-I99':
        '(I00-I99) Diseases of the circulatory system',
    'ICD10/J00-J98':
        '(J00-J98) Respiratory disease',
    'ICD10/K00-K92':
        '(K00-K92) Diseases of the digestive system',
    'ICD10/L00-L98':
        '(L00-L98) Skin and Tissue disease',
    'ICD10/M00-M99':
        '(M00-M99) Diseases of the musculoskeletal system and connective tissue',
    'ICD10/N00-N98':
        '(N00-N98) Genitourinary disease',
    'ICD10/O00-O99':
        '(O00-O99) Pregnancy, childbirth',
    'ICD10/P00-P96':
        '(P00-P96) Perinatal conditions',
    'ICD10/Q00-Q99':
        '(Q00-Q99) Congenital malformations, deformations and chromosomal '
        'abnormalities',
    'ICD10/R00-R99':
        '(R00-R99) Unclassified',
    'ICD10/V01-Y89':
        '(V01-Y89) External causes',
    'ICD10/U00-U99':
        '(U00-U99) Special Purpose Codes'
}

AGES = set([
    'Less than 5 Years', '5 - 17 Years', '18 - 24 Years', 'Less than 25 Years',
    '25 - 34 Years', '25 - 44 Years', '35 - 44 Years', '45 - 54 Years',
    '45 - 64 Years', '55 - 59 Years', '60 - 61 Years', '62 - 64 Years',
    '65 - 74 Years', 'More than 75 Years'
])

IDC10_AGES = set([
    'Less than 1 Years', '1 - 4 Years', '5 - 14 Years', '15 - 24 Years',
    '25 - 34 Years', '35 - 44 Years', '45 - 54 Years', '55 - 64 Years',
    '65 - 74 Years', '75 - 84 Years', 'More than 85 Years'
])

RACES = set([
    'American Indian And Alaska Native Alone', 'Asian Alone',
    'Black Or African American Alone',
    'Native Hawaiian And Other Pacific Islander Alone', 'Some Other Race Alone',
    'Two Or More Races', 'White Alone', 'White Alone Not Hispanic Or Latino',
    'Hispanic Or Latino', 'Asian Or Pacific Islander', 'White',
    'Black Or African American', 'American Indian And Alaska Native Alone'
])

EDUCATIONS = {
    'No Schooling Completed': 0,
    'Nursery School': 1,
    'Kindergarten': 2,
    '1St Grade': 3,
    '2Nd Grade': 4,
    '3Rd Grade': 5,
    '4Th Grade': 6,
    '5Th Grade': 7,
    '6Th Grade': 8,
    '7Th Grade': 9,
    '8Th Grade': 10,
    '9Th Grade': 11,
    '10Th Grade': 12,
    '11Th Grade': 13,
    '12Th Grade No Diploma': 14,
    'Ged Or Alternative Credential': 15,
    'Regular High School Diploma': 16,
    'High School Graduate Includes Equivalency': 17,
    'Some College Less Than1Year': 18,
    'Some College1Or More Years No Degree': 19,
    'Associates Degree': 20,
    'Bachelors Degree': 21,
    'Masters Degree': 22,
    'Professional School Degree': 23,
    'Doctorate Degree': 24
}

GRADE = {
    'Nursery School Preschool': 0,
    'Kindergarten': 1,
    'Grade 1': 2,
    'Grade 2': 3,
    'Grade 3': 4,
    'Grade 4': 5,
    'Grade 5': 6,
    'Grade 6': 7,
    'Grade 7': 8,
    'Grade 8': 9,
    'Grade 9': 10,
    'Grade 10': 11,
    'Grade 11': 12,
    'Grade 12': 13,
    'College Undergraduate Years': 14,
    'Graduate Or Professional School': 15,
}

CRIMES = {
    'Property': 0,
    'Violent': 1,
    'Arson': 2,
    'Combined Crime': 3,
}

DEA_DRUGS = {
    'drug/dea/9300': 'Morphine',
    'drug/dea/2885': 'Lorazepam',
    'drug/dea/7285': 'Ketamine',
    'drug/dea/7444': 'HMMA',
    'drug/dea/1105B': 'Dl-Methamphetamine Racemic Base',
    'drug/dea/9739': 'Remifentanil',
    'drug/dea/9150': 'Hydromorphone',
    'drug/dea/9336': 'Morphine-3-ethereal Sulfate',
    'drug/dea/1105D': 'D-Methamphetamine',
    'drug/dea/9041L': 'Cocaine',
    'drug/dea/9168': 'Difenoxin',
    'drug/dea/7365': 'Dronabinol (in a FDA-approved oral solution drug)',
    'drug/dea/9200': 'Heroin',
    'drug/dea/9120': 'Dihydrocodeine',
    'drug/dea/9652': 'Oxymorphone',
    'drug/dea/9809': 'Opium combination product',
    'drug/dea/9220L': 'Levorphanol',
    'drug/dea/7471': 'Phencyclidine (PCP)',
    'drug/dea/9230': 'Pethidine (meperidine)',
    'drug/dea/7400': 'MDA',
    'drug/dea/9313': 'Normorphine',
    'drug/dea/2100': 'Barbituric Acid Derivative Or Salt',
    'drug/dea/9801': 'Fentanyl Base',
    'drug/dea/9670': 'Poppy Straw Concentrate',
    'drug/dea/9665': '14-Hydroxycodeinone',
    'drug/dea/9190': 'Ethylmorphine',
    'drug/dea/2315': 'Secobarbital',
    'drug/dea/7370': 'Tetrahydrocannabinol (synthetic)',
    'drug/dea/9250B': 'Methadone',
    'drug/dea/2012': 'GHB preparations (FDA-approved)',
    'drug/dea/1248': 'Mephedrone',
    'drug/dea/2783': 'Zolpidem',
    'drug/dea/9743': 'Carfentanil',
    'drug/dea/2285': 'Phenobarbital',
    'drug/dea/9273D': 'Dextropropoxyphene, bulk (non-dosage forms)',
    'drug/dea/2765': 'Diazepam',
    'drug/dea/9143': 'Oxycodone',
    'drug/dea/9064': 'Buprenorphine',
    'drug/dea/9050': 'Codeine',
    'drug/dea/9600': 'Opium, raw',
    'drug/dea/9333': 'Thebaine',
    'drug/dea/7315D': 'Lysergide (D-LSD)',
    'drug/dea/7381': 'Mescaline',
    'drug/dea/7455': 'Ethylamine analog of phencyclidine (PCE)',
    'drug/dea/9737': 'Alfentanil',
    'drug/dea/7377': 'Cannabicyclol',
    'drug/dea/9010': 'Alphaprodine',
    'drug/dea/1724': 'Methylphenidate',
    'drug/dea/2010': 'GHB',
    'drug/dea/9780': 'Tapentadol',
    'drug/dea/7379': 'Nabilone',
    'drug/dea/9668': 'Noroxymorphone',
    'drug/dea/2165': 'Butalbital',
    'drug/dea/7438': 'Psilocin',
    'drug/dea/7437': 'Psilocybin',
    'drug/dea/7433': 'Bufotenine',
    'drug/dea/1205': 'Lisdexamfetamine',
    'drug/dea/7540': 'Methylone',
    'drug/dea/9020': 'Anileridine',
    'drug/dea/7431': '5-MeO-DMT',
    'drug/dea/9056': 'Etorphine (except HCl)',
    'drug/dea/7439': '5-MeO-DiPT',
    'drug/dea/9639': 'Opium, powdered',
    'drug/dea/9193': 'Hydrocodone',
    'drug/dea/4000': 'Anabolic Steroids (21 CFR Section 1300.01)',
    'drug/dea/2270': 'Pentobarbital',
    'drug/dea/4187': 'Testosterone',
    'drug/dea/9170': 'Diphenoxylate',
    'drug/dea/1100': 'Amphetamine',
    'drug/dea/9655': 'Paregoric (opium)',
    'drug/dea/9180L': 'Ecgonine',
    'drug/dea/9411': 'Naloxone',
    'drug/dea/9740': 'Sufentanil Base',
    'drug/dea/2125': 'Amobarbital',
    'drug/dea/7369': 'Dronabinol (synthetic, in FDA-approved gelatin capsule)',
    'drug/dea/9046': 'Norcocaine',
    'drug/dea/9630': 'Opium tincture',
    'drug/dea/1615': 'Phendimetrazine'
}

EQ_MAGNITUDES = {
    'M3Onwards': 'More than 3 Magnitude',
    'M4Onwards': 'More than 4 Magnitude',
    'M5Onwards': 'More than 5 Magnitude',
    'M6Onwards': 'More than 6 Magnitude',
    'M7Onwards': 'More than 7 Magnitude',
    'M8Onwards': 'More than 8 Magnitude',
    'M9Onwards': 'More than 9 Magnitude',
    'M3To4': '3 - 4 Magnitude',
    'M4To5': '4 - 5 Magnitude',
    'M5To6': '5 - 6 Magnitude',
    'M6To7': '6 - 7 Magnitude',
    'M7To8': '7 - 8 Magnitude',
    'M8To9': '8 - 9 Magnitude',
}
