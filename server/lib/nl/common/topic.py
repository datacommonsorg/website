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

import logging
import time
from typing import Dict, List

from flask import current_app

from server.lib import fetch
from server.lib.nl.common import utils
import server.lib.nl.common.counters as ctr

TOPIC_RANK_LIMIT = 3

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
        "sdg/SI_POV_DAY1",
        "dc/svpg/SI_POV_DAY1_ByAge",
        "dc/svpg/SI_POV_DAY1_ByGender",
        "dc/svpg/SI_POV_DAY1_ByResidence",
        "sdg/SP_ACS_BSRVH2O",
        "sdg/SP_ACS_BSRVSAN",
        "sdg/SI_POV_EMP1.AGE--Y_GE15",
        "dc/svpg/SI_POV_EMP1.AGE--Y_GE15_ByGender",
    ],
    "dc/topic/SDG_2": [
        "sdg/SN_ITK_DEFC", "sdg/SH_STA_STNT.AGE--Y0T4",
        "sdg/SH_STA_WAST.AGE--Y0T4"
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
        "sdg/SH_STA_MORT.SEX--F",
        "sdg/SH_FPL_MTMM.AGE--Y15T49__SEX--F",
        "sdg/SP_DYN_ADKL.AGE--Y15T19__SEX--F",
        "sdg/SH_STA_ANEM.AGE--Y15T49__SEX--F",
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
    "dc/svpg/SI_POV_DAY1_ByAge": [
        "sdg/SI_POV_DAY1.AGE--Y0T14",
        "sdg/SI_POV_DAY1.AGE--Y15T64",
        "sdg/SI_POV_DAY1.AGE--Y_GE65",
    ],
    "dc/svpg/SI_POV_DAY1_ByGender": [
        "sdg/SI_POV_DAY1.SEX--F",
        "sdg/SI_POV_DAY1.SEX--M",
    ],
    "dc/svpg/SI_POV_DAY1_ByResidence": [
        "sdg/SI_POV_DAY1.URBANISATION--U",
        "sdg/SI_POV_DAY1.URBANISATION--R",
    ],
    "dc/svpg/SI_POV_EMP1.AGE--Y_GE15_ByGender": [
        "sdg/SI_POV_EMP1.AGE--Y_GE15__SEX--F",
        "sdg/SI_POV_EMP1.AGE--Y_GE15__SEX--M",
    ],
    "dc/svpg/SDG_3_WomensHealth": [
        "sdg/SH_STA_MORT.SEX--F",
        "sdg/SH_FPL_MTMM.AGE--Y15T49__SEX--F",
        "sdg/SP_DYN_ADKL.AGE--Y15T19__SEX--F",
        "sdg/SH_STA_ANEM.AGE--Y15T49__SEX--F",
    ],
    "dc/svpg/SDG_3_PreventableChildDeaths": [
        "sdg/SH_DYN_IMRT.AGE--Y0",
        "sdg/SH_DYN_MORT.AGE--Y0T4",
        "sdg/SH_DYN_NMRT.AGE--M0",
    ],
    "dc/svpg/SDG_3_EpidemicEradication": [
        "sdg/SH_HIV_INCD",
        "sdg/SH_TBS_INCD",
        "sdg/SH_HAP_HBSAG.AGE--Y0T4",
        "sdg/SH_TRP_INTVN",
    ],
    "dc/svpg/SDG_3_HealthInsurance": [
        "sdg/SH_ACS_UNHC",
        "sdg/SH_XPD_EARN10",
        "sdg/SH_XPD_EARN25",
    ],
    "dc/svpg/SDG_3_HealthWorkerDensity": [
        "sdg/SH_MED_DEN.OCCUPATION--ISCO08_221",
        "sdg/SH_MED_DEN.OCCUPATION--ISCO08_222_322",
        "sdg/SH_MED_DEN.OCCUPATION--ISCO08_2262",
        "sdg/SH_MED_DEN.OCCUPATION--ISCO08_2261",
    ],
    "dc/svpg/SDG_3_TobaccoAndAlcohol": [
        "sdg/SH_PRV_SMOK.AGE--Y_GE15",
        "sdg/SH_SUD_ALCOL.AGE--Y_GE15",
    ],
}

SVPG_NAMES_OVERRIDE = {
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
    "dc/svpg/SI_POV_DAY1_ByAge":
        "Population below international poverty line by age",
    "dc/svpg/SI_POV_DAY1_ByGender":
        "Population below international poverty line by gender",
    "dc/svpg/SI_POV_DAY1_ByResidence":
        ""
        "Population below international poverty line in rural vs. urban areas",
    "dc/svpg/SI_POV_EMP1.AGE--Y_GE15_ByGender":
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

SVPG_DESC_OVERRIDE = {
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

TOPIC_NAMES_OVERRIDE = {
    "dc/topic/ProjectedClimateExtremes": "Projected Climate Extremes",
    "dc/topic/ClimateChange": "Climate Change",
    "dc/topic/SolarPotential": "Solar Potential",
    "dc/topic/WorkCommute": "Commute",
}


# TODO: Consider having a default max limit.
def get_topic_vars_recurive(topic: str,
                            rank: int = 0,
                            ordered: bool = False,
                            max_svs: int = 0,
                            cur_svs: int = 0):
  if not utils.is_topic(topic) or rank >= TOPIC_RANK_LIMIT:
    return []
  svs = _TOPIC_DCID_TO_SV_OVERRIDE.get(topic, [])
  if not svs:
    svs = _members([topic], 'relevantVariable', ordered)[topic]
  new_svs = []
  for sv in svs:
    if utils.is_topic(sv):
      in_new_svs = get_topic_vars_recurive(sv, rank, ordered, max_svs, cur_svs)
      new_svs.extend(in_new_svs)
      cur_svs += len(in_new_svs)
    else:
      new_svs.append(sv)
      cur_svs += 1
    if max_svs > 0 and cur_svs > max_svs:
      logging.info(f'{topic} -> {new_svs}')
      return new_svs
  return new_svs


def get_topic_vars(topic: str, ordered: bool = False):
  if not utils.is_topic(topic):
    return []
  svs = _TOPIC_DCID_TO_SV_OVERRIDE.get(topic, [])
  if not svs:
    svs = _members([topic], 'relevantVariable', ordered)[topic]
    logging.info(f'{topic} -> {svs}')
  return svs


def get_parent_topics(topic_or_sv: str):
  # This is an SV, so get parent SVPGs, if any
  if utils.is_sv(topic_or_sv):
    psvpg = _parents_raw([topic_or_sv], 'member')
    psvpg_ids = [p['dcid'] for p in psvpg]
    # Get its actual topic, if any.
    topics = psvpg_ids + [topic_or_sv]
  else:
    topics = [topic_or_sv]
  if not topics:
    return []
  parents = _parents_raw(topics, 'relevantVariable')
  logging.info(f'{topic_or_sv} -> {parents}')
  return parents


def get_child_topics(topics: List[str]):
  children = _members_raw(topics, 'relevantVariable')
  resp = []
  for pvals in children.values():
    for p in pvals:
      if 'value' in p:
        del p['value']
      if 'dcid' not in p:
        continue
      if not utils.is_topic(p['dcid']):
        continue
      if p['dcid'] in topics:
        continue
      resp.append(p)
  return resp


def get_topic_peergroups(sv_dcids: List[str], ordered: bool = False):
  """Returns a new div of svpg's expanded to peer svs."""
  ret = {}
  for sv in sv_dcids:
    if utils.is_svpg(sv):
      ret[sv] = _get_svpg_vars(sv, ordered)
    else:
      ret[sv] = []
  return ret


def get_topic_name(topic_dcid: str) -> str:
  if topic_dcid in TOPIC_NAMES_OVERRIDE:
    return TOPIC_NAMES_OVERRIDE[topic_dcid]
  resp = fetch.property_values(nodes=[topic_dcid], prop='name')[topic_dcid]
  if resp:
    return resp[0]
  return topic_dcid.split('/')[-1]


def svpg_name(sv: str):
  name = SVPG_NAMES_OVERRIDE.get(sv, '')
  if not name:
    resp = fetch.property_values(nodes=[sv], prop='name')[sv]
    if resp:
      name = resp[0]
  return name


def svpg_description(sv: str):
  name = SVPG_DESC_OVERRIDE.get(sv, '')
  if not name:
    resp = fetch.property_values(nodes=[sv], prop='description')[sv]
    if resp:
      name = resp[0]
  return name


def _get_svpg_vars(svpg: str, ordered: bool) -> List[str]:
  svs = _PEER_GROUP_TO_OVERRIDE.get(svpg, [])
  if not svs:
    svs = _members([svpg], 'member', ordered)[svpg]
  return svs


# Takes a list of ordered vars which may contain SV and topic,
# opens up "highly ranked" topics into SVs and returns it
# ordered.
def open_top_topics_ordered(svs: List[str],
                            counters: ctr.Counters) -> List[str]:
  opened_svs = []
  sv_set = set()
  start = time.time()
  for rank, var in enumerate(svs):
    for sv in _open_topic_in_var(var, rank, counters):
      if sv not in sv_set:
        opened_svs.append(sv)
        sv_set.add(sv)
  counters.timeit('open_top_topics_ordered', start)
  return opened_svs


def _open_topic_in_var(sv: str, rank: int, counters: ctr.Counters) -> List[str]:
  if utils.is_sv(sv):
    return [sv]
  if utils.is_topic(sv):
    topic_vars = get_topic_vars_recurive(sv, rank)
    peer_groups = get_topic_peergroups(topic_vars)

    # Classify into two lists.
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = svpg_name(v)
        svpgs.append((title, peer_groups[v]))
      else:
        just_svs.append(v)

    svs = just_svs
    for (title, svpg) in svpgs:
      svs.extend(svpg)

    counters.info('topics_processed',
                  {sv: {
                      'svs': just_svs,
                      'peer_groups': svpgs,
                  }})

    return svs

  return []


def _members(nodes: List[str],
             prop: str,
             ordered: bool = False) -> Dict[str, List[str]]:
  val_map = {}
  if ordered:
    for n in nodes:
      resp = current_app.config['TOPIC_CACHE'].get_members(n)
      val_map[n] = [v['dcid'] for v in resp]
    nodes_copy = [n for n, v in val_map.items() if not v]
  else:
    # TODO: Once the caller stops using it, deprecate it.
    val_map.update(fetch.property_values(nodes=nodes_copy, prop=prop))
  return val_map


def _members_raw(nodes: List[str], _: str) -> Dict[str, List[str]]:
  val_map = {}
  for n in nodes:
    val_map[n] = current_app.config['TOPIC_CACHE'].get_members(n)
  return val_map


def _parents_raw(nodes: List[str], prop: str) -> Dict[str, List[Dict]]:
  parent_list = []
  for n in nodes:
    plist = current_app.config['TOPIC_CACHE'].get_parents(n, prop)
    parent_list.extend(plist)
  return parent_list
