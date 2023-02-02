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

from lib.nl import utils
import services.datacommons as dc

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
    "dc/topic/Jobs": ["dc/svpg/JobsPeerGroup"],
    "dc/topic/MedicalConditions": ["dc/svpg/MedicalConditionsPeerGroup"],
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
        "dc/ndg1xk1e9frc2",
        "Count_Worker_NAICSFinanceInsurance",
        "Count_Worker_NAICSInformation",
        "Count_Worker_NAICSArtsEntertainmentRecreation",
        "dc/f18sq8w498j4f",
        "Count_Worker_NAICSMiningQuarryingOilGasExtraction",
        "dc/4mm2p1rxr5wz4",
        "Count_Worker_NAICSOtherServices",
        "dc/8p97n7l96lgg8",
        "Count_Worker_NAICSUtilities",
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
}

_SVPG_NAMES_OVERRIDE = {
    "dc/svpg/JobsPeerGroup": "Categories of Jobs",
    "dc/svpg/MedicalConditionsPeerGroup": "Medical Conditions",
    "dc/svpg/SolarEnergyGenerationPotential":
        "Solar Energy Generation Potential",
    "dc/svpg/SolarPanelPotential":
        "Solar Panel Potential",

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
    svs = dc.property_values(nodes=[topic], prop='relevantVariable')[topic]
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


def svpg_name(sv: str):
  name = _SVPG_NAMES_OVERRIDE.get(sv, '')
  if not name:
    resp = dc.property_values(nodes=[sv], prop='name')[sv]
    if resp:
      name = resp[0]
  return name


def _get_svpg_vars(svpg: str) -> List[str]:
  svs = _PEER_GROUP_TO_OVERRIDE.get(svpg, [])
  if not svs:
    svs = dc.property_values(nodes=[svpg], prop='member')[svpg]
  return svs
