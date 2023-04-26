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
"""Module for NL topics"""

from typing import List

from server.lib import util
from server.lib.nl import utils
import server.services.datacommons as dc

_MIN_TOPIC_RANK = 2

_TOPIC_DCID_TO_SV_OVERRIDE = {
    "dc/topic/Agriculture": [
        "Area_Farm",
        "Count_Farm",
        "Income_Farm",
        # Number of works in Crop production
        "dc/15lrzqkb6n0y7",
        "dc/svpg/AmountOfFarmInventoryByType",
    ],
    "dc/topic/Income": [
        "dc/svpg/IndividualIncome",
        "dc/svpg/HouseholdIncome",
    ],
    "dc/topic/Jobs": ["dc/svpg/JobsPeerGroup"],
    "dc/topic/MedicalConditions": ["dc/svpg/MedicalConditionsPeerGroup"],
    "dc/topic/ProjectedClimateExtremes": [
        "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp",
        "dc/svpg/ProjectedClimateExtremes_LowestMinTemp",
    ],
    "dc/topic/ClimateChange": [
        "event/heat",
        "event/cold",
        "event/flood",
        "event/fire",
        "event/drought",
        "event/wetbulb",
        "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp",
        "dc/svpg/ProjectedClimateExtremes_LowestMinTemp",
        "dc/svpg/ClimateChange_FEMARisk",
    ],
    # TODO(nhdiaz): Remove after demos. This topic is only used for a custom DC.
    "dc/topic/SolarPotential": [
        "Count_Building_SuitableForSolar",
        "Percent_Building_SuitableForSolar_ProjectSunroof",
        "Amount_SolarPotential",
        "dc/svpg/SolarEnergyGenerationPotential",
        "Count_SolarPanelPotential",
        "dc/svpg/SolarPanelPotential",
        "Amount_CarbonDioxideAbatement",
        "Count_SolarPanel",
    ],
    "dc/topic/WorkCommute": ["dc/svpg/WorkCommutePeerGroup"],
    "dc/topic/GreenhouseGasEmissionsBySource": [
        "dc/svpg/GreenhouseGasEmissionsBySource"
    ],
    "dc/topic/CarbonDioxideEmissionsBySource": [
        "dc/svpg/CarbonDioxideEmissionsBySource"
    ],
    "dc/topic/AgricultureEmissionsByGas": ["dc/svpg/AgricultureEmissionsByGas"],
    "dc/topic/FossilFuelOperationsEmissionsByGas": [
        "dc/svpg/FossilFuelOperationsEmissionsByGas"
    ],
    "dc/topic/ManufacturingEmissionsByGas": [
        "dc/svpg/ManufacturingEmissionsByGas"
    ],
    "dc/topic/PowerEmissionsByGas": ["dc/svpg/PowerEmissionsByGas"],
    "dc/topic/TransportationEmissionsByGas": [
        "dc/svpg/TransportationEmissionsByGas"
    ],
    "dc/topic/SDG_1": [
        "sdg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX",
        "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByAge",
        "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByGender",
        "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByResidence",
        "sdg/SP_ACS_BSRVH2O_ALLAREA_E",
        "sdg/SP_ACS_BSRVSAN_ALLAREA_E",
        "sdg/SI_POV_EMP1_15gte_M_A_BOTHSEX",
        "dc/svpg/SI_POV_EMP1_15gte_M_A_ByGender",
    ],
    "dc/topic/SDG_2": [
        "sdg/SN_ITK_DEFC_E", "sdg/SH_STA_STNT_lt5Y_M", "sdg/SH_STA_WAST_lt5Y_CA"
    ],
    "dc/topic/SDG_3": [
        "dc/svpg/SDG_3_WomensHealth",
        "dc/svpg/SDG_3_PreventableChildDeaths",
        "dc/svpg/SDG_3_EpidemicEradication",
        "dc/svpg/SDG_3_HealthInsurance",
        "dc/svpg/SDG_3_TobaccoAndAlcohol",
        "dc/svpg/SDG_3_HealthWorkerDensity",
    ],
    "dc/topic/MaternalHealth": [
        "sdg/SH_STA_MORT_E_FEMALE",
        "sdg/SH_FPL_MTMM_15-49_CA_FEMALE",
        "sdg/SP_DYN_ADKL_15-19_C_FEMALE",
        "sdg/SH_STA_ANEM_15-49_E_FEMALE",
    ]
}

_PEER_GROUP_TO_OVERRIDE = {
    "dc/svpg/AmountOfFarmInventoryByType": [
        "AmountFarmInventory_WinterWheatForGrain",
        "Amount_FarmInventory_BarleyForGrain",
        "Amount_FarmInventory_CornForSilageOrGreenchop",
        "Amount_FarmInventory_Cotton",
        "Amount_FarmInventory_DurumWheatForGrain",
        "Amount_FarmInventory_Forage",
        "Amount_FarmInventory_OatsForGrain",
        "Amount_FarmInventory_OtherSpringWheatForGrain",
        "Amount_FarmInventory_PeanutsForNuts",
        "Amount_FarmInventory_PimaCotton",
        "Amount_FarmInventory_Rice",
        "Amount_FarmInventory_SorghumForGrain",
        "Amount_FarmInventory_SorghumForSilageOrGreenchop",
        "Amount_FarmInventory_SugarbeetsForSugar",
        "Amount_FarmInventory_SunflowerSeed",
        "Amount_FarmInventory_UplandCotton",
        "Amount_FarmInventory_WheatForGrain",
        "Amout_FarmInventory_CornForGrain",
    ],
    "dc/svpg/JobsPeerGroup": [
        "Count_Worker_NAICSAccommodationFoodServices",
        "Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices",
        "Count_Worker_NAICSAgricultureForestryFishingHunting",
        "Count_Worker_NAICSConstruction",
        "Count_Worker_NAICSEducationalServices",
        "Count_Worker_NAICSHealthCareSocialAssistance",
        # Manufacturing
        "dc/ndg1xk1e9frc2",
        "Count_Worker_NAICSFinanceInsurance",
        "Count_Worker_NAICSInformation",
        "Count_Worker_NAICSArtsEntertainmentRecreation",
        "Count_Worker_NAICSMiningQuarryingOilGasExtraction",
        "Count_Worker_NAICSOtherServices",
        # Transportation and Warehousing
        "dc/8p97n7l96lgg8",
        "Count_Worker_NAICSUtilities",
        # Retail Trade
        "dc/p69tpsldf99h7",
        "Count_Worker_NAICSRealEstateRentalLeasing",
        "Count_Worker_NAICSPublicAdministration",
        "Count_Worker_NAICSWholesaleTrade",
        "Count_Worker_NAICSProfessionalScientificTechnicalServices",
        "Count_Worker_NAICSPublicAdministration",

        # This is an almost dup of
        # Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices
        # "dc/f18sq8w498j4f",
        # Subsumed by Retail Trade
        # "dc/4mm2p1rxr5wz4",
        # "Count_Worker_NAICSManagementOfCompaniesEnterprises",
    ],
    "dc/svpg/MedicalConditionsPeerGroup": [
        "Percent_Person_WithArthritis",
        "Percent_Person_WithAsthma",
        "Percent_Person_WithCancerExcludingSkinCancer",
        "Percent_Person_WithChronicKidneyDisease",
        "Percent_Person_WithChronicObstructivePulmonaryDisease",
        "Percent_Person_WithCoronaryHeartDisease",
        "Percent_Person_WithDiabetes",
        "Percent_Person_WithHighBloodPressure",
        "Percent_Person_WithHighCholesterol",
        "Percent_Person_WithMentalHealthNotGood",
        "Percent_Person_WithPhysicalHealthNotGood",
        "Percent_Person_WithStroke",
    ],
    "dc/svpg/SolarEnergyGenerationPotential": [
        "Amount_SolarGenerationPotential_FlatRoofSpace",
        "Amount_SolarGenerationPotential_NorthFacingRoofSpace",
        "Amount_SolarGenerationPotential_EastFacingRoofSpace",
        "Amount_SolarGenerationPotential_SouthFacingRoofSpace",
        "Amount_SolarGenerationPotential_WestFacingRoofSpace",
    ],
    "dc/svpg/SolarPanelPotential": [
        "Count_SolarPanelPotential_FlatRoofSpace",
        "Count_SolarPanelPotential_NorthFacingRoofSpace",
        "Count_SolarPanelPotential_EastFacingRoofSpace",
        "Count_SolarPanelPotential_SouthFacingRoofSpace",
        "Count_SolarPanelPotential_WestFacingRoofSpace",
    ],
    "dc/svpg/IndividualIncome": [
        "Median_Income_Person",
        "Median_Earnings_Person",
    ],
    "dc/svpg/HouseholdIncome": ["Median_Income_Household",],
    "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp": [
        "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP26",
        "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP45",
        "ProjectedMax_Until_2050_DifferenceRelativeToBaseDate1981To2010_Max_Temperature_RCP60",
    ],
    "dc/svpg/ProjectedClimateExtremes_LowestMinTemp": [
        "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP26",
        "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP45",
        "ProjectedMin_Until_2050_DifferenceRelativeToBaseDate1981To2010_Min_Temperature_RCP60",
    ],
    "dc/svpg/ClimateChange_FEMARisk": [
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_AvalancheEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_CoastalFloodEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_ColdWaveEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_DroughtEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_EarthquakeEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_HailEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_HeatWaveEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_HurricaneEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_IceStormEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_LandslideEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_LightningEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_RiverineFloodingEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_StrongWindEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_TornadoEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_TsunamiEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_VolcanicActivityEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_WildfireEvent",
        "FemaNaturalHazardRiskIndex_NaturalHazardImpact_WinterWeatherEvent",
    ],
    "dc/svpg/WorkCommutePeerGroup": [
        "dc/6rltk4kf75612",  # WFH
        "dc/vp8cbt6k79t94",  # Walk
        "dc/hbkh95kc7pkb6",  # Public Transport
        "dc/wc8q05drd74bd",  # Carpooled car/truck/van
        "dc/0gettc3bc60cb",  # Drove alone in car/truck/van
        "dc/vt2q292eme79f",  # Taxicab/Motorcycle/Bicycle/etc
    ],
    "dc/svpg/GreenhouseGasEmissionsBySource": [
        "Annual_Emissions_GreenhouseGas_Agriculture",
        "Annual_Emissions_GreenhouseGas_FuelCombustionInBuildings",
        "Annual_Emissions_GreenhouseGas_ForestryAndLandUse",
        "Annual_Emissions_GreenhouseGas_Manufacturing",
        "Annual_Emissions_GreenhouseGas_MineralExtraction",
        "Annual_Emissions_GreenhouseGas_ElectricityGeneration",
        "Annual_Emissions_GreenhouseGas_Transportation",
        "Annual_Emissions_GreenhouseGas_WasteManagement",
    ],
    "dc/svpg/CarbonDioxideEmissionsBySource": [
        "Annual_Emissions_CarbonDioxide_Agriculture",
        "Annual_Emissions_CarbonDioxide_FuelCombustionInBuildings",
        "Annual_Emissions_CarbonDioxide_FlourinatedGases",
        "Annual_Emissions_CarbonDioxide_FossilFuelOperations",
        "Annual_Emissions_CarbonDioxide_ForestryAndLandUse",
        "Annual_Emissions_CarbonDioxide_Manufacturing",
        "Annual_Emissions_CarbonDioxide_MineralExtraction",
        "Annual_Emissions_CarbonDioxide_Power",
        "Annual_Emissions_CarbonDioxide_Transportation",
        "Annual_Emissions_CarbonDioxide_WasteManagement",
    ],
    "dc/svpg/AgricultureEmissionsByGas": [
        "Annual_Emissions_CarbonDioxide_Agriculture",
        "Annual_Emissions_Methane_Agriculture",
        "Annual_Emissions_NitrousOxide_Agriculture",
        "Annual_Emissions_CarbonDioxideEquivalent100YearGlobalWarmingPotential_Agriculture",
        "Annual_Emissions_CarbonDioxideEquivalent20YearGlobalWarmingPotential_Agriculture"
    ],
    "dc/svpg/PowerEmissionsByGas": [
        "Annual_Emissions_CarbonDioxide_Power",
        "Annual_Emissions_Methane_Power", "Annual_Emissions_NitrousOxide_Power",
        "Annual_Emissions_CarbonDioxideEquivalent100YearGlobalWarmingPotential_Power",
        "Annual_Emissions_CarbonDioxideEquivalent20YearGlobalWarmingPotential_Power"
    ],
    "dc/svpg/ManufacturingEmissionsByGas": [
        "Annual_Emissions_CarbonDioxide_Manufacturing",
        "Annual_Emissions_Methane_Manufacturing",
        "Annual_Emissions_NitrousOxide_Manufacturing",
        "Annual_Emissions_CarbonDioxideEquivalent100YearGlobalWarmingPotential_Manufacturing",
        "Annual_Emissions_CarbonDioxideEquivalent20YearGlobalWarmingPotential_Manufacturing"
    ],
    "dc/svpg/FossilFuelOperationsEmissionsByGas": [
        "Annual_Emissions_CarbonDioxide_FossilFuelOperations",
        "Annual_Emissions_Methane_FossilFuelOperations",
        "Annual_Emissions_NitrousOxide_FossilFuelOperations",
        "Annual_Emissions_CarbonDioxideEquivalent100YearGlobalWarmingPotential_FossilFuelOperations",
        "Annual_Emissions_CarbonDioxideEquivalent20YearGlobalWarmingPotential_FossilFuelOperations"
    ],
    "dc/svpg/TransportationEmissionsByGas": [
        "Annual_Emissions_CarbonDioxide_Transportation",
        "Annual_Emissions_Methane_Transportation",
        "Annual_Emissions_NitrousOxide_Transportation",
        "Annual_Emissions_CarbonDioxideEquivalent100YearGlobalWarmingPotential_Transportation",
        "Annual_Emissions_CarbonDioxideEquivalent20YearGlobalWarmingPotential_Transportation"
    ],
    "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByAge": [
        "sdg/SI_POV_DAY1_lt15Y_ALLAREA_G_BOTHSEX",
        "sdg/SI_POV_DAY1_15-64_ALLAREA_G_BOTHSEX",
        "sdg/SI_POV_DAY1_65gte_ALLAREA_G_BOTHSEX",
    ],
    "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByGender": [
        "sdg/SI_POV_DAY1_ALLAGE_ALLAREA_G_FEMALE",
        "sdg/SI_POV_DAY1_ALLAGE_ALLAREA_G_MALE",
    ],
    "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByResidence": [
        "sdg/SI_POV_DAY1_ALLAGE_URBAN_G_BOTHSEX",
        "sdg/SI_POV_DAY1_ALLAGE_RURAL_G_BOTHSEX",
    ],
    "dc/svpg/SI_POV_EMP1_15gte_M_A_ByGender": [
        "sdg/SI_POV_EMP1_15gte_M_A_FEMALE",
        "sdg/SI_POV_EMP1_15gte_M_A_MALE",
    ],
    "dc/svpg/SDG_3_WomensHealth": [
        "sdg/SH_STA_MORT_E_FEMALE",
        "sdg/SH_FPL_MTMM_15-49_CA_FEMALE",
        "sdg/SP_DYN_ADKL_15-19_C_FEMALE",
        "sdg/SH_STA_ANEM_15-49_E_FEMALE",
    ],
    "dc/svpg/SDG_3_PreventableChildDeaths": [
        "sdg/SH_DYN_IMRT_lt1Y_E_BOTHSEX",
        "sdg/SH_DYN_MORT_lt5Y_E_BOTHSEX",
        "sdg/SH_DYN_NMRT_lt1M_E_BOTHSEX",
    ],
    "dc/svpg/SDG_3_EpidemicEradication": [
        "sdg/SH_HIV_INCD_ALLAGE_E_BOTHSEX",
        "sdg/SH_TBS_INCD_E",
        "sdg/SH_HAP_HBSAG_lt5Y_E",
        "sdg/SH_TRP_INTVN_CA",
    ],
    "dc/svpg/SDG_3_HealthInsurance": [
        "sdg/SH_ACS_UNHC_E",
        "sdg/SH_XPD_EARN10_G",
        "sdg/SH_XPD_EARN25_G",
    ],
    "dc/svpg/SDG_3_HealthWorkerDensity": [
        "sdg/SH_MED_DEN_C_PHYS",
        "sdg/SH_MED_DEN_C_NURSMID",
        "sdg/SH_MED_DEN_C_PHAR",
        "sdg/SH_MED_DEN_C_DENT",
    ],
    "dc/svpg/SDG_3_TobaccoAndAlcohol": [
        "sdg/SH_PRV_SMOK_15gte_E_BOTHSEX",
        "sdg/SH_SUD_ALCOL_15gte_NA_BOTHSEX",
    ],
}

_SVPG_NAMES_OVERRIDE = {
    "dc/svpg/JobsPeerGroup":
        "Categories of Jobs",
    "dc/svpg/MedicalConditionsPeerGroup":
        "Medical Conditions",
    "dc/svpg/SolarEnergyGenerationPotential":
        "Solar Energy Generation Potential",
    "dc/svpg/SolarPanelPotential":
        "Solar Panel Potential",
    "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp":
        "Projected highest increase in max temperature under different scenarios",
    "dc/svpg/ProjectedClimateExtremes_LowestMinTemp":
        "Projected highest decrease in min temperature under different scenarios",
    "dc/svpg/ClimateChange_FEMARisk":
        "Risk due to various Natural Hazards",
    "dc/svpg/IndividualIncome":
        "Individual Income",
    "dc/svpg/HouseholdIncome":
        "Houshold Income",
    "dc/svpg/WorkCommutePeerGroup":
        "Modes of Commute",
    "dc/svpg/GreenhouseGasEmissionsBySource":
        "Greenhouse Gas Emissions by Source",
    "dc/svpg/CarbonDioxideEmissionsBySource":
        "Carbon Dioxide Emissions by Source",
    "dc/svpg/AgricultureEmissionsByGas":
        "Emissions from Agriculture Sector",
    "dc/svpg/FossilFuelOperationsEmissionsByGas":
        "Emissions from Fossil Fuel Operations",
    "dc/svpg/ManufacturingEmissionsByGas":
        "Emissions from Manufacturing Sector",
    "dc/svpg/PowerEmissionsByGas":
        "Emissions from Power Sector",
    "dc/svpg/TransportationEmissionsByGas":
        "Emissions from Transportation Sector",
    "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByAge":
        "Population below international poverty line by age",
    "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByGender":
        "Population below international poverty line by gender",
    "dc/svpg/SI_POV_DAY1_ALLAGE_ALLAREA_G_BOTHSEX_ByResidence":
        ""
        "Population below international poverty line in rural vs. urban areas",
    "dc/svpg/SI_POV_EMP1_15gte_M_A_ByGender":
        "Employed population below international poverty line by gender",
    "dc/svpg/SDG_3_WomensHealth":
        "Women's health",
    "dc/svpg/SDG_3_PreventableChildDeaths":
        "Preventable newborn and children deaths",
    "dc/svpg/SDG_3_EpidemicEradication":
        "Ending epidemics",
    "dc/svpg/SDG_3_HealthInsurance":
        "Health coverage and financial risk",
    "dc/svpg/SDG_3_HealthWorkerDensity":
        "Health worker density",
    "dc/svpg/SDG_3_TobaccoAndAlcohol":
        "Tobacco and alcohol",
}

_SVPG_DESC_OVERRIDE = {
    "dc/svpg/MedicalConditionsPeerGroup":
        "Estimates of the percentage of people living with these medical conditions, provided by the CDC.",
    "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp":
        "Highest temperature likely to be reached by 2050 compared to average observed "
        "max temperature of 30 years. Reported values are differences in temperature.",
    "dc/svpg/ProjectedClimateExtremes_LowestMinTemp":
        "Lowest temperature likely to be reached by 2050 compared to average observed "
        "min temperature of 30 years. Reported values are differences in temperature.",
    "dc/svpg/GreenhouseGasEmissionsBySource":
        "Breakdown of annual emissions of all greenhouse gases by emission sources (measured in tonnes of CO₂ equivalents).",
    "dc/svpg/CarbonDioxideEmissionsBySource":
        "Breakdown of annual CO₂ emissions by emission sources (measured in tonnes).",
}

_TOPIC_NAMES_OVERRIDE = {
    "dc/topic/ProjectedClimateExtremes": "Projected Climate Extremes",
    "dc/topic/ClimateChange": "Climate Change",
    "dc/topic/SolarPotential": "Solar Potential",
    "dc/topic/WorkCommute": "Commute",
}


def get_topics(sv_dcids: List[str]):
  """Returns a list of SV's to use for the topic if the topic is ranked highly during detection."""
  topic_svs = []
  for i, sv in enumerate(sv_dcids):
    topic_svs += get_topic_vars(sv, i)
  return topic_svs


def get_topic_vars(topic: str, rank: int):
  if not utils.is_topic(topic) or rank >= _MIN_TOPIC_RANK:
    return []
  svs = _TOPIC_DCID_TO_SV_OVERRIDE.get(topic, [])
  if not svs:
    # Lookup KG
    svs = util.property_values(nodes=[topic], prop='relevantVariable')[topic]
  return svs


def get_topic_peers(sv_dcids: List[str]):
  """Returns a new div of svpg's expanded to peer svs."""
  ret = {}
  for sv in sv_dcids:
    if utils.is_svpg(sv):
      ret[sv] = _get_svpg_vars(sv)
    else:
      ret[sv] = []
  return ret


def get_topic_name(topic_dcid: str) -> str:
  if topic_dcid in _TOPIC_NAMES_OVERRIDE:
    return _TOPIC_NAMES_OVERRIDE[topic_dcid]
  resp = util.property_values(nodes=[topic_dcid], prop='name')[topic_dcid]
  if resp:
    return resp[0]
  return topic_dcid.split('/')[-1]


def svpg_name(sv: str):
  name = _SVPG_NAMES_OVERRIDE.get(sv, '')
  if not name:
    resp = util.property_values(nodes=[sv], prop='name')[sv]
    if resp:
      name = resp[0]
  return name


def svpg_description(sv: str):
  name = _SVPG_DESC_OVERRIDE.get(sv, '')
  if not name:
    resp = util.property_values(nodes=[sv], prop='description')[sv]
    if resp:
      name = resp[0]
  return name


def _get_svpg_vars(svpg: str) -> List[str]:
  svs = _PEER_GROUP_TO_OVERRIDE.get(svpg, [])
  if not svs:
    svs = util.property_values(nodes=[svpg], prop='member')[svpg]
  return svs
