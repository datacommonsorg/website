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
    ContainedInPlaceType.COUNTRY: ContainedInPlaceType.ADMIN_AREA_1,
    ContainedInPlaceType.ADMIN_AREA_1: ContainedInPlaceType.ADMIN_AREA_2,
    ContainedInPlaceType.ADMIN_AREA_2: ContainedInPlaceType.CITY,
}

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

USA = Place('country/USA', 'USA', 'Country', 'country/USA')

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
    ContainedInPlaceType.COUNTRY: Place('Earth', 'Earth', 'Place'),
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
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP26":
        "RCP 2.6 (optimistic), °C",
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP45":
        "RCP 4.5 (intermediate), °C",
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP60":
        "RCP 6.0 (slightly pessimistic), °C",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP26":
        "RCP 2.6 (optimistic), °C",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP45":
        "RCP 4.5 (intermediate), °C",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP60":
        "RCP 6.0 (slightly pessimistic), °C",
}

SV_DISPLAY_NAME_OVERRIDE = {
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP26":
        "Highest temperature increase by 2050 per RCP 2.6 (optimistic) scenario (°C)",
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP45":
        "Highest temperature increase by 2050 per RCP 4.5 (intermediate) scenario (°C)",
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP60":
        "Highest temperature increase by 2050 per RCP 6.0 (slightly pessimistic) scenario (°C)",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP26":
        "Highest temperature decrease by 2050 per RCP 2.6 (optimistic) scenario (°C)",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP45":
        "Highest temperature decrease by 2050 per RCP 4.5 (intermediate) scenario (°C)",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP60":
        "Highest temperature decrease by 2050 per RCP 6.0 (slightly pessimistic) scenario (°C)",
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
    "Median_Income_Person":
        "Individual Median Income",
    "Median_Income_Household":
        "Household Median Income",
    "Median_Earnings_Person":
        "Individual Median Earnings",
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
        "Others (incl. Taxcab, Motorcyle, Bicycle)",
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
        "CO₂ Emissions from Flourinated Gases",
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
}

SV_DISPLAY_FOOTNOTE_OVERRIDE = {
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP26":
        "RCP 2.6 is likely to keep global temperature rise below 2 °C by 2100.",
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP45":
        "RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.",
    "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP60":
        "RCP 6.0 simulates conditions through 2100 making the global temperature rise between 3 °C and 4 °C by 2100.",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP26":
        "RCP 2.6 is likely to keep global temperature rise below 2 °C by 2100.",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP45":
        "RCP 4.5 is more likely than not to result in global temperature rise between 2 °C and 3 °C by 2100.",
    "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP60":
        "RCP 6.0 simulates conditions through 2100 making the global temperature rise between 3 °C and 4 °C by 2100.",
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
