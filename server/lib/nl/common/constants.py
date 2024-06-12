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
"""Various constants for NL detection."""

from typing import Dict, List

from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import Place

SPECIAL_PLACE_REPLACEMENTS: Dict[str, str] = {'us': 'United States'}

SPECIAL_DCIDS_TO_PLACES: Dict[str, List[str]] = {
    'Earth': ['earth', 'world'],
    # Continents
    'africa': ['africa'],
    'antarctica': ['antarctica'],
    'asia': ['asia'],
    'europe': ['europe'],
    'northamerica': ['north america', 'northamerica'],
    'southamerica': [
        'south america', 'southamerica', 'latin america', 'latinamerica'
    ],
    'oceania': ['oceania', 'australasia'],
    # India gets resolved Indianapolis
    'country/IND': ['india'],
    # special places
    'wikidataId/Q213205': ['san francisco bay area', 'sf bay area', 'bay area'],
    'wikidataId/Q1827082': ['san francisco peninsula', 'sf peninsula'],
    'wikidataId/Q3271856': ['san francisco south bay', 'sf south bay'],
    'wikidataId/Q3271661': ['san francisco north bay', 'sf north bay'],
    'wikidataId/Q2617944': ['san francisco east bay', 'sf east bay'],
}

# Invert the above str: List[str] Dictionary to str: str.
OVERRIDE_PLACE_TO_DCID_FOR_MAPS_API: Dict[str, str] = {}
for dcid, place_list in SPECIAL_DCIDS_TO_PLACES.items():
  for place in place_list:
    OVERRIDE_PLACE_TO_DCID_FOR_MAPS_API[place] = dcid

# Using the AutoComplete Maps API. The textsearch API is more flaky and returns
# may unnecessary results, e.g. businesses, which are easier to ignore in the
# autocomplete API.
MAPS_API = "https://maps.googleapis.com/maps/api/place/autocomplete/json?"

# Source: https://developers.google.com/maps/documentation/places/web-service/autocomplete#types
# Only one can be selected from Table 3 which is most useful for us: https://developers.google.com/maps/documentation/places/web-service/supported_types#table3
# TODO: consider having some fallbacks like (cities) if nothing found in (regions).
AUTOCOMPLETE_MAPS_API_TYPES_FILTER = "(regions)"

# Source: https://developers.google.com/maps/documentation/places/web-service/supported_types#table2
MAPS_GEO_TYPES = frozenset([
    'political',
    'country',
    'city',
    'county',
    'continent',
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
    'administrative_area_level_6',
    'administrative_area_level_7',
    'postal_code',
    'locality',
])

# TODO: Unify the different event maps by using a struct value.

# Override the names from configs.  These have plurals, etc.
EVENT_TYPE_TO_DISPLAY_NAME = {
    EventType.COLD: "Extreme Cold Events",
    EventType.CYCLONE: "Storms",
    EventType.DROUGHT: "Droughts",
    EventType.EARTHQUAKE: "Earthquakes",
    EventType.FIRE: "Fires",
    EventType.FLOOD: "Floods",
    EventType.HEAT: "Exteme Heat Events",
    EventType.WETBULB: "High Wet-bulb Temperature Events",
}

# NOTE: This relies on disaster config's event_type_spec IDs.
# TODO: Consider switching these strings to proto enums and use those directly.
EVENT_TYPE_TO_CONFIG_KEY = {
    EventType.COLD: "cold",
    EventType.CYCLONE: "storm",
    EventType.DROUGHT: "drought",
    EventType.EARTHQUAKE: "earthquake",
    EventType.FIRE: "fire",
    EventType.FLOOD: "flood",
    EventType.HEAT: "heat",
    EventType.WETBULB: "wetbulb",
}

EVENT_CONFIG_KEY_TO_EVENT_TYPE = {
    v: k for k, v in EVENT_TYPE_TO_CONFIG_KEY.items()
}

EVENT_TYPE_TO_DC_TYPES = {
    EventType.COLD: ["ColdTemperatureEvent"],
    EventType.CYCLONE: ["CycloneEvent"],
    EventType.DROUGHT: ["DroughtEvent"],
    EventType.EARTHQUAKE: ["EarthquakeEvent"],
    EventType.FIRE: ["WildlandFireEvent", "WildfireEvent", "FireEvent"],
    EventType.FLOOD: ["FloodEvent"],
    EventType.HEAT: ["HeatTemperatureEvent"],
    EventType.WETBULB: ["WetBulbTemperatureEvent"],
}

# Key is canonical AA types (and excludes county, province, etc.)
CHILD_PLACE_TYPES = {
    ContainedInPlaceType.CONTINENT: ContainedInPlaceType.COUNTRY,
    ContainedInPlaceType.CONTINENTAL_UNION: ContainedInPlaceType.COUNTRY,
    ContainedInPlaceType.GEO_REGION: ContainedInPlaceType.COUNTRY,
    ContainedInPlaceType.UN_GEO_REGION: ContainedInPlaceType.COUNTRY,
    ContainedInPlaceType.COUNTRY: ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.ADMIN_AREA_1: ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.ADMIN_AREA_2: ContainedInPlaceType.CITY,
}

# Types that are larger than a country.
# NOTE: These should be strings.
SUPER_NATIONAL_TYPES = frozenset([
    ContainedInPlaceType.CONTINENT.value,
    ContainedInPlaceType.CONTINENTAL_UNION.value,
    ContainedInPlaceType.GEO_REGION.value,
    ContainedInPlaceType.UN_GEO_REGION.value
])

# For these geos, the maps look empty.
MAP_ONLY_SUPER_NATIONAL_GEOS = frozenset([
    'Earth',
    'africa',
    'asia',
    'europe',
    'northamerica',
    'southamerica',
    'oceania',
    'AustraliaAndNewZealand',
    'Caribbean',
    'CentralAmerica',
    'CentralAsia',
    'ChannelIslands',
    'EasternAfrica',
    'EasternAsia',
    'EasternEurope',
    'EuropeanUnion',
    'LatinAmericaAndCaribbean',
    'Melanesia',
    'MiddleAfrica',
    'NorthernAfrica',
    'NorthernEurope',
    'SouthEasternAsia',
    'SouthernAfrica',
    'SouthernAsia',
    'SouthernEurope',
    'SubSaharanAfrica',
    'WesternAfrica',
    'WesternAsia',
    'WesternEurope',
    # Americas
    'undata-geo/G00134000',
])

# Key is canonical AA types (and excludes county, province, etc.).
# Note also that we don't include CONTINENT because we virtually have no
# data at Continent level.
PARENT_PLACE_TYPES = {
    ContainedInPlaceType.CITY: ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.ADMIN_AREA_2: ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.ADMIN_AREA_1: ContainedInPlaceType.COUNTRY
}

#
# Equivalent place types to AdminArea1 or AdminArea2.  This maps the different ways
# that a user may refer to admin-areas to the canonical AdminArea type.
#
# TODO: As we add more countries, make this map a function of the country as well.
#
ADMIN_DIVISION_EQUIVALENTS = {
    ContainedInPlaceType.STATE:
        ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.EU_NUTS_2:
        ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.PROVINCE:
        ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.DEPARTMENT:
        ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.DIVISION:
        ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.ADMIN_AREA_1:
        ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.EU_NUTS_3:
        ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.COUNTY:
        ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.DISTRICT:
        ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.PARISH:
        ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.MUNICIPALITY:
        ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.ADMIN_AREA_2:
        ContainedInPlaceType.ADMIN_AREA_2,
    # NOTE: This is a hack for since district equivalents for PAK alone is AA level 3
    ContainedInPlaceType.ADMIN_AREA_3:
        ContainedInPlaceType.ADMIN_AREA_2,
}

# Key is canonical AA types (and excludes county, province, etc.)
USA_PLACE_TYPE_REMAP = {
    ContainedInPlaceType.ADMIN_AREA_1: ContainedInPlaceType.STATE,
    ContainedInPlaceType.ADMIN_AREA_2: ContainedInPlaceType.COUNTY,
}

# Key is canonical AA types (and excludes county, province, etc.)
EU_PLACE_TYPE_REMAP = {
    ContainedInPlaceType.ADMIN_AREA_1: ContainedInPlaceType.EU_NUTS_2,
    ContainedInPlaceType.ADMIN_AREA_2: ContainedInPlaceType.EU_NUTS_3,
}

# Key is canonical AA types (and excludes county, province, etc.)
PAK_PLACE_TYPE_REMAP = {
    ContainedInPlaceType.ADMIN_AREA_1:
        ContainedInPlaceType.ADMIN_AREA_1,
    # TODO: Remove this after fixing in the KG.
    ContainedInPlaceType.ADMIN_AREA_2:
        ContainedInPlaceType.ADMIN_AREA_3,
}

EARTH = Place('Earth', 'World', 'Place')
USA = Place('country/USA', 'United States of America', 'Country', 'country/USA')

# Key is US-only map type.
# Value is a list of corresponding parent place types.
USA_ONLY_MAP_TYPES = {
    ContainedInPlaceType.CITY: [
        ContainedInPlaceType.COUNTY,
        ContainedInPlaceType.STATE,
    ],
    ContainedInPlaceType.ZIP: [
        ContainedInPlaceType.COUNTY,
        ContainedInPlaceType.STATE,
    ],
    ContainedInPlaceType.CENSUS_TRACT: [ContainedInPlaceType.COUNTY,]
}

# This is only for US.
# Avoid `CITY` -> `USA` since loading maps, etc. takes a really long time.
DEFAULT_PARENT_PLACES = {
    ContainedInPlaceType.COUNTRY: EARTH,
    ContainedInPlaceType.COUNTY: USA,
    ContainedInPlaceType.STATE: USA,
}

EU_COUNTRIES = frozenset([
    "country/ALB",
    "country/AUT",
    "country/BEL",
    "country/BGR",
    "country/CHE",
    "country/CYP",
    "country/CZE",
    "country/DEU",
    "country/DNK",
    "country/ESP",
    "country/EST",
    "country/FIN",
    "country/FRA",
    "country/FXX",
    "country/GBR",
    "country/GRC",
    "country/HRV",
    "country/HUN",
    "country/IRL",
    "country/ISL",
    "country/ITA",
    "country/LIE",
    "country/LTU",
    "country/LUX",
    "country/LVA",
    "country/MKD",
    "country/MLT",
    "country/MNE",
    "country/NLD",
    "country/NOR",
    "country/POL",
    "country/PRT",
    "country/ROU",
    "country/SRB",
    "country/SVK",
    "country/SVN",
    "country/SWE",
    "country/TUR",
])

NON_EU_MAP_COUNTRIES = [
    'country/BGD',
    'country/CHN',
    'country/IND',
    'country/NPL',
    'country/PAK',
    'country/USA',
]

ADMIN_AREA_MAP_COUNTRIES = frozenset(list(EU_COUNTRIES) + NON_EU_MAP_COUNTRIES)

COUNTRY_DCID_PREFIX = 'country/'

# Key is SV DCID and value is (denominator SV DCID, name snippet for title).
ADDITIONAL_DENOMINATOR_VARS = {
    "MapFacts/Count_park": ("SurfaceArea", "per Square Mile"),
}

QUERY_OK = 'ok'
QUERY_FAILED = 'failed'

TEST_SESSION_ID = '007_999999999'

EARTH_DCID = 'Earth'
DEFAULT_DENOMINATOR = 'Count_Person'

SV_DISPLAY_SHORT_NAME = {
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "SSP245 (intermediate), °C",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "SSP585 (pessimistic), °C",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "SSP245 (intermediate), °C",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "SSP585 (pessimistic), °C",
}

SV_DISPLAY_NAME_OVERRIDE = {
    "Percent_Person_WithArthritis":
        "Arthritis",
    "Percent_Person_WithAsthma":
        "Asthma",
    "Percent_Person_WithCancerExcludingSkinCancer":
        "Cancer (excluding skin cancer)",
    "Percent_Person_WithChronicKidneyDisease":
        "Chronic Kidney Disease",
    "Percent_Person_WithChronicObstructivePulmonaryDisease":
        "Chronic Obstructive Pulmonary Disease",
    "Percent_Person_WithCoronaryHeartDisease":
        "Coronary Heart Disease",
    "Percent_Person_WithDiabetes":
        "Diabetes",
    "Percent_Person_WithHighBloodPressure":
        "High Blood Pressure",
    "Percent_Person_WithHighCholesterol":
        "High Cholesterol",
    "Percent_Person_WithMentalHealthNotGood":
        "Mental Health Issues",
    "Percent_Person_WithPhysicalHealthNotGood":
        "Physical Health Issues",
    "Percent_Person_WithStroke":
        "Stroke",
    "Percent_Person_18OrMoreYears_WithDepression":
        "Depression",
    "Median_Income_Person":
        "Individual Median Income",
    "Median_Income_Household":
        "Household Median Income",
    "Median_Earnings_Person":
        "Individual Median Earnings",
    "dc/e9gftzl2hm8h9":
        "Total Commute Time",
    "dc/6rltk4kf75612":
        "Work at home",
    "dc/vp8cbt6k79t94":
        "Walk to work",
    "dc/hbkh95kc7pkb6":
        "Public Transit",
    "dc/wc8q05drd74bd":
        "Carpool",
    "dc/0gettc3bc60cb":
        "Drive alone",
    "dc/vt2q292eme79f":
        "Others (incl. Taxicab, Motorcycle, Bicycle)",
    "Count_Student":
        "Number of Students",
    "Count_Teacher":
        "Number of Teachers",
    "Percent_Student_AsAFractionOf_Count_Teacher":
        "Student-Teacher Ratio",
    "Count_Person":
        "Population",
    "Amount_EconomicActivity_GrossDomesticProduction_RealValue":
        "GDP (Real Value)",
    "Amount_EconomicActivity_GrossDomesticProduction_Nominal":
        "GDP (Nominal Value)",
    "MapFacts/Count_park":
        "Number of Parks",
    "Annual_Emissions_GreenhouseGas":
        "Greenhouse Gas Emissions",
    "Annual_Emissions_GreenhouseGas_Agriculture":
        "Greenhouse Gas Emissions from Agriculture",
    "Annual_Emissions_GreenhouseGas_FuelCombustionInBuildings":
        "Greenhouse Gas Emissions from Fuel Combustion in Buildings",
    "Annual_Emissions_GreenhouseGas_ForestryAndLandUse":
        "Greenhouse Gas Emissions from Forestry and Land Use",
    "Annual_Emissions_GreenhouseGas_Manufacturing":
        "Greenhouse Gas Emissions from Manufacturing",
    "Annual_Emissions_GreenhouseGas_MineralExtraction":
        "Greenhouse Gas Emissions from Mineral Extraction",
    "Annual_Emissions_GreenhouseGas_ElectricityGeneration":
        "Greenhouse Gas Emissions from Electricity Generation",
    "Annual_Emissions_GreenhouseGas_Transportation":
        "Greenhouse Gas Emissions from Transportation",
    "Annual_Emissions_GreenhouseGas_WasteManagement":
        "Greenhouse Gas Emissions from Waste Management",
    "Annual_Emissions_CarbonDioxide_Agriculture":
        "CO₂ Emissions from Agriculture",
    "Annual_Emissions_CarbonDioxide_FuelCombustionInBuildings":
        "CO₂ Emissions from Fuel Combustion in Buildings",
    "Annual_Emissions_CarbonDioxide_FlourinatedGases":
        "CO₂ Emissions from Fluorinated Gases",
    "Annual_Emissions_CarbonDioxide_FossilFuelOperations":
        "CO₂ Emissions from Fossil Fuel Operations",
    "Annual_Emissions_CarbonDioxide_ForestryAndLandUse":
        "CO₂ Emissions from Forestry and Land Use",
    "Annual_Emissions_CarbonDioxide_Manufacturing":
        "CO₂ Emissions from Manufacturing",
    "Annual_Emissions_CarbonDioxide_MineralExtraction":
        "CO₂ Emissions from Mineral Extraction",
    "Annual_Emissions_CarbonDioxide_Power":
        "CO₂ Emissions from Power Sector",
    "Annual_Emissions_CarbonDioxide_Transportation":
        "CO₂ Emissions from Transportation",
    "Annual_Emissions_CarbonDioxide_WasteManagement":
        "CO₂ Emissions from Waste Management",
    "Monthly_Mean_Income_Person_Years14Onwards_Employed_AllJobs_IncomeActuallyReceived":
        "Mean Monthly Income",
    "Count_Person_NonWorker":
        "People Not Working",
}

SV_DISPLAY_FOOTNOTE_OVERRIDE = {
    'MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245':
        'SSP245 is a medium pathway. It is an update to RCP 4.5 with an additional radiative forcing of 4.5 W/m². RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.',
    'DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585':
        'SSP585 is a pessimistic pathway. It is an update to RCP 8.5 with an additional radiative forcing of 8.5 W/m². RCP 8.5 is more likely than not to result in global temperature rise between 3 °C and 12.6 °C by 2100.',
}

SV_DISPLAY_DESCRIPTION_OVERRIDE = {
    "Annual_Emissions_GreenhouseGas":
        "Annual emissions from all greenhouse gases measured in tonnes of CO₂ equivalents.",
    "Annual_Emissions_GreenhouseGas_Agriculture":
        "Greenhouse gas emissions from the growing of crops and livestock for food and raw materials for non-food consumption (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_GreenhouseGas_FuelCombustionInBuildings":
        "Greenhouse gas emissions from onsite fuel combustion in residential, commercial and institutional buildings (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_GreenhouseGas_ForestryAndLandUse":
        "Greenhouse gas emissions from change in living biomass due to clearing, degradation and fires in forests, grasslands and wetlands (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_GreenhouseGas_Manufacturing":
        "Greenhouse gas emissions from cement, aluminum, steel, and other manufacturing processes (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_GreenhouseGas_MineralExtraction":
        "Greenhouse gas emissions from mining and quarrying of minerals and ores (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_GreenhouseGas_ElectricityGeneration":
        "Greenhouse gas emissions from electricity generation (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_GreenhouseGas_Transportation":
        "Greenhouse gas emissions from on-road vehicles, aviation, shipping, railways and other modes of transportation (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_GreenhouseGas_WasteManagement":
        "Greenhouse gas emissions from solid waste disposal on land, wastewater, waste incineration and any other waste management activity (measured in tonnes of CO₂ equivalents).",
    "Annual_Emissions_CarbonDioxide_Agriculture":
        "CO₂ emissions from the growing of crops and livestock for food and raw materials for non-food consumption (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_FuelCombustionInBuildings":
        "CO₂ emissions from onsite fuel combustion in residential, commercial and institutional buildings (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_FlourinatedGases":
        "CO₂ emissions from the release of fluorinated gases used in refrigeration, air-conditioning, transport, and industry (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_FossilFuelOperations":
        "CO₂ emissions from oil and gas production, refining, and coal mining (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_ForestryAndLandUse":
        "CO₂ emissions from change in living biomass due to clearing, degradation and fires in forests, grasslands and wetlands (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_Manufacturing":
        "CO₂ emissions from cement, aluminum, steel, and other manufacturing processes (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_MineralExtraction":
        "CO₂ emissions from mining and quarrying of minerals and ores (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_Power":
        "CO₂ emissions from electricity generation (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_Transportation":
        "CO₂ emissions from on-road vehicles, aviation, shipping, railways and other modes of transportation (measured in tonnes).",
    "Annual_Emissions_CarbonDioxide_WasteManagement":
        "CO₂ emissions from solid waste disposal on land, wastewater, waste incineration and any other waste management activity (measured in tonnes).",
    "worldBank/EG_ELC_ACCS_ZS":
        "Access to electricity is the percentage of population with access to electricity. Electrification data are collected from industry, national surveys and international sources.",
    "worldBank/EG_ELC_ACCS_UR_ZS":
        "Access to electricity, urban is the percentage of urban population with access to electricity.",
    "worldBank/EG_ELC_ACCS_RU_ZS":
        "Access to electricity, rural is the percentage of rural population with access to electricity.",
    "MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 50% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 1% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 5% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Max Temperature with 95% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Max Temperature with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Max Temperature with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 1% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 5% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 50% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Predicted Min Temperature with 95% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Predicted Min Temperature with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Predicted Min Temperature with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 1% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_1PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 5% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_5PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 50% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_50PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 95% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Max Temperature between 1980-2010, the Predicted Max Temperature difference with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 1% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 1% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_1PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 1% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 5% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 5% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_5PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 5% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 50% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 50% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_50PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 50% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 95% chance, at least once in the decade, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_Historical":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 95% chance, at least once in the year, according to a CMIP6 Ensemble model for historical (past) dates.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP245":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 245 (intermediate) scenario.",
    "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayAYear_CMIP6_Ensemble_SSP585":
        "Relative to the Average Yearly Min Temperature between 1980-2010, the Predicted Min Temperature difference with 95% chance, at least once in the year, according to a CMIP6 Ensemble model as per SSP 585 (pessimistic) scenario.",
    "dc/e9gftzl2hm8h9":
        "Total time spent on a single commute across all workers",
}

# Have a shorter limit to avoid spamming the json.
DBG_LIST_LIMIT = 3

#
# Sometimes the an SV/topic co-occurring with another higher-ranked
# SV/topic may be undesirable.  For example, for the
# [projected temperature extremes] query we don't want to also show
# the current temperature.  This happens because descriptions the
# SVs are close enough.
# This map has a "key" --blocks--> "values" relation. If "key" is
# a higher ranking SV than any of the "values".
#
SV_BLOCKS_MAP = {
    "dc/topic/ProjectedClimateExtremes": [
        "dc/topic/Temperature", "dc/topic/WetBulbTemperature"
    ],
    "dc/topic/WetBulbTemperature": ["dc/topic/Temperature"],
}

# Max number of answer places
MAX_ANSWER_PLACES = 10

# This is used in TOOLFORMER_TABLE mode.  Set to allow "counties in US".
ABSOLUTE_MAX_PLACES_FOR_TABLES = 3250

ROOT_TOPIC = 'dc/topic/Root'

PROJECTED_TEMP_TOPIC = 'dc/topic/ProjectedClimateExtremes'

# Set of stat vars that need to check which facet is being used before doing
# ranking because they have facets that are too fine in granularity.
# This list of svs are svs in the medium embedding index that have a BLS source.
# Generated using this query in BQ: https://paste.googleplex.com/6342636875546624
SVS_TO_CHECK_FACET = frozenset([
    "Count_Establishment_NAICSOtherServices",
    "WagesTotal_Worker_NAICSMiningQuarryingOilGasExtraction",
    "dc/v3qgyhwx13m44",
    "dc/ltwqwtxcq9l23",
    "dc/h1jy2glt2m7e6",
    "Count_Establishment_NAICSFinanceInsurance",
    "dc/rlk1yxmkk1qqg",
    "WagesTotal_Worker_NAICSHealthCareSocialAssistance",
    "Count_Person_Unemployed",
    "dc/tqgf8zv96r5t8",
    "dc/51h3g4mcgj3w4",
    "WagesTotal_Worker_NAICSTotalAllIndustries",
    "dc/bceet4dh33ev",
    "dc/bwr1l8y9we9k7",
    "dc/dchdrg93spxkf",
    "dc/ndg1xk1e9frc2",
    "Count_Establishment_LocalGovernmentOwnedEstablishment_NAICSTotalAllIndustries",
    "Count_Worker_NAICSTotalAllIndustries",
    "WagesTotal_Worker_NAICSArtsEntertainmentRecreation",
    "dc/90nswpkp8wlw5",
    "dc/1j7jmy39fwhw5",
    "dc/qnz3rlypmfvw6",
    "dc/1q3ker7zf14hf",
    "dc/jngmh68j9z4q",
    "dc/z27q5dymqyrnf",
    "Count_Person_InLaborForce",
    "WagesTotal_Worker_NAICSOtherServices",
    "WagesTotal_Worker_NAICSServiceProviding",
    "Count_Worker_NAICSWholesaleTrade",
    "WagesTotal_Worker_NAICSAccommodationFoodServices",
    "dc/c0wxmt45gffxc",
    "dc/fcn7wgvcwtsj2",
    "dc/1jqm2g7cm9m75",
    "dc/8pxklrk2q6453",
    "dc/0hq9z5mspf73f",
    "dc/ntpwcslsbjfc8",
    "dc/n0m3e2r3pxb21",
    "dc/yxxs3hh2g2shd",
    "Count_Worker_NAICSInformation",
    "dc/15lrzqkb6n0y7",
    "dc/w8gp902jnk426",
    "dc/tz59wt1hkl4y",
    "WagesTotal_Worker_NAICSPublicAdministration",
    "Count_Worker_NAICSNonclassifiable",
    "dc/wv0mr2t2f5rj9",
    "Count_Worker_NAICSUtilities",
    "dc/ksynl8pj8w5t5",
    "Count_Establishment_FederalGovernmentOwnedEstablishment_NAICSTotalAllIndustries",
    "Count_Establishment_NAICSServiceProviding",
    "Count_Establishment_NAICSNonclassifiable",
    "WagesTotal_Worker_NAICSManagementOfCompaniesEnterprises",
    "Count_Establishment_NAICSTotalAllIndustries",
    "Count_Worker_NAICSHealthCareSocialAssistance",
    "dc/k4grzkjq201xh",
    "dc/84czmnc1b6sp5",
    "WagesTotal_Worker_NAICSGoodsProducing",
    "dc/w1tfjz3h6138",
    "WagesTotal_Worker_NAICSFinanceInsurance",
    "Count_Worker_NAICSAccommodationFoodServices",
    "Count_Establishment_NAICSUtilities",
    "dc/yn0h4nw4k23f1",
    "dc/x52jxxbwspczh",
    "dc/7bck6xpkc205c",
    "Count_Worker_NAICSProfessionalScientificTechnicalServices",
    "Count_Worker_NAICSAgricultureForestryFishingHunting",
    "dc/107jnwnsh17xb",
    "dc/3jr0p7yjw06z9",
    "dc/fetj39pqls2df",
    "dc/3kwcvm428wpq4",
    "dc/5br285q68be6",
    "dc/lygznlxpkj318",
    "dc/ws19bm1hl105b",
    "dc/hlxvn1t8b9bhh",
    "dc/4ky4sj05bw4nd",
    "WagesTotal_Worker_NAICSProfessionalScientificTechnicalServices",
    "Count_Worker_NAICSServiceProviding",
    "Count_Establishment_NAICSRealEstateRentalLeasing",
    "Count_Worker_NAICSArtsEntertainmentRecreation",
    "dc/n87t9dkckzxc8",
    "Count_Worker_NAICSManagementOfCompaniesEnterprises",
    "Count_Worker_NAICSFinanceInsurance",
    "WagesTotal_Worker_NAICSConstruction",
    "Count_Worker_NAICSConstruction",
    "dc/7w0e0p0dzj82g",
    "dc/mlf5e4m68h2k7",
    "dc/8p97n7l96lgg8",
    "WagesTotal_Worker_NAICSEducationalServices",
    "dc/9yj0bdp6s4ml5",
    "dc/eh7s78v8s14l9",
    "Count_Establishment_NAICSGoodsProducing",
    "WagesTotal_Worker_NAICSInformation",
    "WagesTotal_Worker_NAICSRealEstateRentalLeasing",
    "Count_Worker_NAICSOtherServices",
    "dc/8lqwvg8m9x7z8",
    "dc/dxcbt2knrsgg9",
    "Count_Worker_NAICSGoodsProducing",
    "dc/e2zdnwjjhyj36",
    "Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices",
    "dc/br6elkd593zs1",
    "dc/kl7t3p3de7tlh",
    "Count_Worker_NAICSEducationalServices",
    "WagesTotal_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices",
    "Count_Establishment_NAICSConstruction",
    "dc/9pz1cse6yndtg",
    "dc/dy2k68mmhenfd",
    "WagesTotal_Worker_NAICSAgricultureForestryFishingHunting",
    "dc/wzz9t818m1gk8",
    "dc/4mm2p1rxr5wz4",
    "dc/rfdrfdc164y3b",
    "dc/k3hehk50ch012",
    "Count_Worker_NAICSRealEstateRentalLeasing",
    "Count_Establishment_NAICSPublicAdministration",
    "Count_Establishment_NAICSAdministrativeSupportWasteManagementRemediationServices",
    "dc/vp4cplffwv86g",
    "dc/2etwgx6vecreh",
    "dc/34t2kjrwbjd31",
    "dc/6n6l2wrzv7473",
    "Count_Person_Employed",
    "WagesTotal_Worker_NAICSWholesaleTrade",
    "dc/8b3gpw1zyr7bf",
    "dc/wfktw3b5c50h1",
    "WagesTotal_Worker_NAICSUtilities",
    "dc/9t5n4mk2fxzdg",
    "Count_Establishment_PrivatelyOwnedEstablishment_NAICSTotalAllIndustries",
    "Count_Worker_NAICSPublicAdministration",
    "dc/kcns4cvt14zx2",
    "dc/8cssekvykhys5",
    "dc/nesnbmrncfjrb",
    "dc/95gev5g99r7nc",
    "Count_Worker_NAICSMiningQuarryingOilGasExtraction",
    "dc/qgpqqfzwz03d",
    "dc/1wf1h5esex2d",
    "dc/p69tpsldf99h7",
    "Count_Establishment_StateGovernmentOwnedEstablishment_NAICSTotalAllIndustries",
    "dc/63gkdt13bmsv8",
    "dc/mbn7jcx896cd8",
    "dc/h77bt8rxcjve3",
    "dc/2c2e9bn8p7xz6",
    "UnemploymentRate_Person",
    "dc/8j8w7pf73ekn",
    "dc/9kk3vkzn5v0fb",
    "Count_Establishment_NAICSInformation",
    "dc/6ets5evke9mw5",
    "dc/bb4peddkgmqe7",
    "dc/evcytmdmc9xgd",
    "WagesTotal_Worker_NAICSNonclassifiable",
])
