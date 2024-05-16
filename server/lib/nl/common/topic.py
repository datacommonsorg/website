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

import time
from typing import Dict, List

from flask import current_app

from server.lib import fetch
from server.lib.nl.common import utils
import server.lib.nl.common.counters as ctr
from server.lib.nl.explore.params import DCNames

TOPIC_RANK_LIMIT = 3
MAX_TOPIC_SVS = 30

_TOPIC_DCID_TO_SV_OVERRIDE = {
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
    "dc/topic/AgricultureEmissionsByGas": ["dc/svpg/AgricultureEmissionsByGas"],
    "dc/topic/ManufacturingEmissionsByGas": [
        "dc/svpg/ManufacturingEmissionsByGas"
    ],
    "dc/topic/PowerEmissionsByGas": ["dc/svpg/PowerEmissionsByGas"],
    "dc/topic/TransportationEmissionsByGas": [
        "dc/svpg/TransportationEmissionsByGas"
    ],
    # TODO(chejennifer): Try removing after bug with multi SVs is fixed (and
    # when electrification demo looks ok without this topic)
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
    "dc/topic/MaternalHealth": [
        "sdg/SH_STA_MORT.SEX--F",
        "sdg/SH_FPL_MTMM.AGE--Y15T49__SEX--F",
        "sdg/SP_DYN_ADKL.AGE--Y15T19__SEX--F",
        "sdg/SH_STA_ANEM.AGE--Y15T49__SEX--F",
    ]
}

_PEER_GROUP_TO_OVERRIDE = {
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
    "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp": [
        "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP245",
        "DiffRelativeToAvg_1980_2010_MaxTemp_Daily_Hist_95PctProb_Greater_Atleast1DayADecade_CMIP6_Ensemble_SSP585",
    ],
    "dc/svpg/ProjectedClimateExtremes_LowestMinTemp": [
        "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP245",
        "DiffRelativeToAvg_1980_2010_MinTemp_Daily_Hist_95PctProb_LessThan_Atleast1DayADecade_CMIP6_Ensemble_SSP585",
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
}

SVPG_NAMES_OVERRIDE = {
    "dc/svpg/MedicalConditionsPeerGroup":
        "Medical Conditions",
    "dc/svpg/SolarEnergyGenerationPotential":
        "Solar Energy Generation Potential",
    "dc/svpg/SolarPanelPotential":
        "Solar Panel Potential",
    "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp":
        "Predicted relative max temperature (95% likely), under different scenarios",
    "dc/svpg/ProjectedClimateExtremes_LowestMinTemp":
        "Predicted relative min temperature (95% likely), under different scenarios",
    "dc/svpg/ClimateChange_FEMARisk":
        "Risk due to various Natural Hazards",
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

    # Temperature Prediction SVPGs.
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerDecade_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Max Temperature Likely (95%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerDecade_MaxTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Max Temperature Likely (50%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerDecade_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Max Temperature Likely (5%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerYear_MaxTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Max Temperature Likely (95%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerYear_MaxTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Max Temperature Likely (50%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerYear_MaxTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Max Temperature Likely (5%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerDecade_MinTemperatureLikely95PctAtLeastOncePerDecadeByScenario':
        'Min Temperature Likely (95%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerDecade_MinTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Min Temperature Likely (50%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerDecade_MinTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Min Temperature Likely (5%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerYear_MinTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Min Temperature Likely (95%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerYear_MinTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Min Temperature Likely (50%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerYear_MinTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Min Temperature Likely (5%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Relative Max Temperature Likely (95%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MaxTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Relative Max Temperature Likely (50%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Relative Max Temperature Likely (5%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MaxTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Relative Max Temperature Likely (95%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MaxTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Relative Max Temperature Likely (50%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MaxTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Relative Max Temperature Likely (5%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MinTemperatureLikely95PctAtLeastOncePerDecadeByScenario':
        'Relative Min Temperature Likely (95%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MinTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Relative Min Temperature Likely (50%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MinTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Relative Min Temperature Likely (5%) In The Decade, By Scenario',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MinTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Relative Min Temperature Likely (95%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MinTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Relative Min Temperature Likely (50%) In The Year, By Scenario',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MinTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Relative Min Temperature Likely (5%) In The Year, By Scenario',
}

TOPIC_AND_SVPG_DESC_OVERRIDE = {
    "dc/svpg/MedicalConditionsPeerGroup":
        "Estimates of the percentage of people living with these medical conditions, provided by the CDC.",
    "dc/svpg/ProjectedClimateExtremes_HighestMaxTemp":
        "Predicted Max Temperature differences, relative to the yearly average from 1980-2010, with a 95% chance.",
    "dc/svpg/ProjectedClimateExtremes_LowestMinTemp":
        "Predicted Min Temperature differences, relative to the yearly average from 1980-2010, with a 95% chance.",
    "dc/svpg/GreenhouseGasEmissionsBySource":
        "Breakdown of annual emissions of all greenhouse gases by emission sources (measured in tonnes of CO₂ equivalents).",
    "dc/svpg/CarbonDioxideEmissionsBySource":
        "Breakdown of annual CO₂ emissions by emission sources (measured in tonnes).",

    # Temperature Prediction SVPGs.
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerDecade_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Predicted Max Temperature, at least once in a decade, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerDecade_MaxTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Predicted Max Temperature, at least once in a decade, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerDecade_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Predicted Max Temperature, at least once in a decade, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerYear_MaxTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Predicted Max Temperature, at least once in a year, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerYear_MaxTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Predicted Max Temperature, at least once in a year, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerYear_MaxTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Predicted Max Temperature, at least once in a year, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerDecade_MinTemperatureLikely95PctAtLeastOncePerDecadeByScenario':
        'Predicted Min Temperature, at least once in a decade, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerDecade_MinTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Predicted Min Temperature, at least once in a decade, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerDecade_MinTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Predicted Min Temperature, at least once in a decade, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerYear_MinTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Predicted Min Temperature, at least once in a year, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerYear_MinTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Predicted Min Temperature, at least once in a year, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerYear_MinTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Predicted Min Temperature, at least once in a year, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Predicted Max Temperature differences, at least once in a decade, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MaxTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Predicted Max Temperature differences, at least once in a decade, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MaxTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Predicted Max Temperature differences, at least once in a decade, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature95PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MaxTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Predicted Max Temperature differences, at least once in a year, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature50PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MaxTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Predicted Max Temperature differences, at least once in a year, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MaxTemperature5PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MaxTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Predicted Max Temperature differences, at least once in a year, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MinTemperatureLikely95PctAtLeastOncePerDecadeByScenario':
        'Predicted Min Temperature differences, at least once in a decade, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MinTemperatureLikely50PctAtLeastOncePerDecadeByScenario':
        'Predicted Min Temperature differences, at least once in a decade, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerDecadeDifferenceToBaseline_MinTemperatureLikely5PctAtLeastOncePerDecadeByScenario':
        'Predicted Min Temperature differences, at least once in a decade, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature95PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MinTemperatureLikely95PctAtLeastOncePerYearByScenario':
        'Predicted Min Temperature differences, at least once in a year, relative to the yearly average from 1980-2010, with a 95% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature50PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MinTemperatureLikely50PctAtLeastOncePerYearByScenario':
        'Predicted Min Temperature differences, at least once in a year, relative to the yearly average from 1980-2010, with a 50% chance across different CMIP6 scenarios.',
    'dc/svpg/dc/topic/MinTemperature5PercentLikelyAtLeastOncePerYearDifferenceToBaseline_MinTemperatureLikely5PctAtLeastOncePerYearByScenario':
        'Predicted Min Temperature differences, at least once in a year, relative to the yearly average from 1980-2010, with a 5% chance across different CMIP6 scenarios.',
}

TOPIC_NAMES_OVERRIDE = {
    "dc/topic/ProjectedClimateExtremes": "Projected Climate Extremes",
    "dc/topic/ClimateChange": "Climate Change",
    "dc/topic/SolarPotential": "Solar Potential",
}


# TODO: Consider having a default max limit.
def get_topic_vars_recurive(topic: str,
                            rank: int = 0,
                            dc: str = DCNames.MAIN_DC.value,
                            max_svs: int = MAX_TOPIC_SVS,
                            cur_svs: int = 0):
  if not utils.is_topic(topic) or rank >= TOPIC_RANK_LIMIT:
    return []
  svs = _TOPIC_DCID_TO_SV_OVERRIDE.get(topic, [])
  if not svs:
    svs = _members(topic, 'relevantVariable', dc)
  new_svs = []
  for sv in svs:
    if utils.is_topic(sv):
      in_new_svs = get_topic_vars_recurive(sv, rank, dc, max_svs, cur_svs)
      new_svs.extend(in_new_svs)
      cur_svs += len(in_new_svs)
    else:
      new_svs.append(sv)
      cur_svs += 1
    if max_svs > 0 and cur_svs > max_svs:
      return new_svs
  return new_svs


def get_topic_vars(topic: str, dc: str):
  if not utils.is_topic(topic):
    return []
  svs = _TOPIC_DCID_TO_SV_OVERRIDE.get(topic, [])
  if not svs:
    svs = _members(topic, 'relevantVariable', dc)
  return svs


def get_parent_topics(topic_or_sv: str, dc: str = DCNames.MAIN_DC.value):
  # This is an SV, so get parent SVPGs, if any
  if utils.is_sv(topic_or_sv):
    psvpg = _parents_raw([topic_or_sv], 'member', dc)
    psvpg_ids = [p['dcid'] for p in psvpg]
    # Get its actual topic, if any.
    topics = psvpg_ids + [topic_or_sv]
  else:
    topics = [topic_or_sv]
  if not topics:
    return []
  parents = _parents_raw(topics, 'relevantVariable', dc)
  return parents


def get_child_topics(topics: List[str], dc: str = DCNames.MAIN_DC.value):
  children = _members_raw(topics, 'relevantVariable', dc)
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


def get_topic_peergroups(sv_dcids: List[str], dc: str = DCNames.MAIN_DC.value):
  """Returns a new div of svpg's expanded to peer svs."""
  ret = {}
  for sv in sv_dcids:
    if utils.is_svpg(sv):
      ret[sv] = _get_svpg_vars(sv, dc)
    else:
      ret[sv] = []
  return ret


def get_topic_extended_svgs(topic: str, dc: str = DCNames.MAIN_DC.value):
  if 'TOPIC_CACHE' in current_app.config:
    return current_app.config['TOPIC_CACHE'][dc].get_extended_svgs(topic)
  else:
    return fetch.property_values(nodes=[topic], prop='extendedVariable')[topic]


def svpg_name(sv: str, dc: str = DCNames.MAIN_DC.value):
  name = SVPG_NAMES_OVERRIDE.get(sv, '')
  if not name:
    if 'TOPIC_CACHE' in current_app.config:
      name = current_app.config['TOPIC_CACHE'][dc].get_name(sv)
    if not name:
      resp = fetch.property_values(nodes=[sv], prop='name')[sv]
      if resp:
        name = resp[0]
  return name


def svpg_description(sv: str):
  name = TOPIC_AND_SVPG_DESC_OVERRIDE.get(sv, '')
  if not name:
    resp = fetch.property_values(nodes=[sv], prop='description')[sv]
    if resp:
      name = resp[0]
  return name


def _get_svpg_vars(svpg: str, dc: str) -> List[str]:
  svs = _PEER_GROUP_TO_OVERRIDE.get(svpg, [])
  if not svs:
    svs = _members(svpg, 'member', dc)
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


def _members(node: str, prop: str, dc: str) -> List[str]:
  val_list = []
  if 'TOPIC_CACHE' in current_app.config:
    resp = current_app.config['TOPIC_CACHE'][dc].get_members(node)
    val_list = [v['dcid'] for v in resp]
  else:
    val_list = _prop_val_ordered(node, prop + 'List')
  return val_list


def _members_raw(nodes: List[str], prop: str, dc: str) -> Dict[str, List[str]]:
  val_map = {}
  if 'TOPIC_CACHE' in current_app.config:
    for n in nodes:
      val_map[n] = current_app.config['TOPIC_CACHE'][dc].get_members(n)
  else:
    val_map = fetch.raw_property_values(nodes=nodes, prop=prop)
  return val_map


def _parents_raw(nodes: List[str], prop: str, dc: str) -> Dict[str, List[Dict]]:
  parent_list = []
  if 'TOPIC_CACHE' in current_app.config:
    for n in nodes:
      plist = current_app.config['TOPIC_CACHE'][dc].get_parents(n, prop)
      parent_list.extend(plist)
  else:
    parents = fetch.raw_property_values(nodes=nodes, prop=prop, out=False)
    for pvals in parents.values():
      for p in pvals:
        if 'value' in p:
          del p['value']
        if 'dcid' not in p:
          continue
        id = p['dcid']
        if prop == 'relevantVariable' and not utils.is_topic(id):
          continue
        if prop == 'member' and not utils.is_svpg(id):
          continue
        parent_list.append(p)
  return parent_list


# Reads Props that are strings encoding ordered DCIDs.
def _prop_val_ordered(node: str, prop: str) -> List[str]:
  sv_list = fetch.property_values(nodes=[node], prop=prop)[node]
  svs = []
  if sv_list:
    sv_list = sv_list[0]
    svs = [v.strip() for v in sv_list.split(',') if v.strip()]
  return svs
