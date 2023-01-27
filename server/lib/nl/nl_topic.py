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

_MIN_TOPIC_RANK = 2

_TOPIC_DCID_TO_SV = {
    "dc/topic/Economy": [
        "Amount_EconomicActivity_GrossDomesticProduction_RealValue",
        "UnemploymentRate_Person",
        "Median_Income_Person",
        "GiniIndex_EconomicActivity",
        "dc/svpg/RealGDPByIndustry",
    ],
    "dc/topic/Agriculture": [
        "Area_Farm",
        "Count_Farm",
        "Income_Farm",
        # Number of works in Crop production
        "dc/15lrzqkb6n0y7",
        "dc/svpg/AmountOfFarmInventoryByType",
    ],
    "dc/topic/AgriculturalProduction": [
        "Income_Farm",
        "Amount_FarmInventory_Cotton",
        "Amount_FarmInventory_Rice",
        "Amount_FarmInventory_WheatForGrain",
        "Amout_FarmInventory_CornForGrain",
        "Amount_FarmInventory_BarleyForGrain",
        "Count_FarmInventory_BeefCows",
        "Count_FarmInventory_Broilers",
        "Count_FarmInventory_MilkCows",
        "Count_FarmInventory_SheepAndLambs",
    ]
}

_PEER_GROUP_TO_SV = {
    "dc/svpg/RealGDPByIndustry": [
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSAccommodationFoodServices_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSAdministrativeSupportWasteManagementRemediationServices_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSAgricultureForestryFishingHunting_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSArtsEntertainmentRecreation_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSConstruction_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSEducationalServices_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSFinanceInsurance_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSHealthCareSocialAssistance_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSInformation_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSManagementOfCompaniesEnterprises_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSMiningQuarryingOilGasExtraction_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSOtherServices_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSProfessionalScientificTechnicalServices_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSRealEstateRentalLeasing_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSUtilities_RealValue",
        "Amount_EconomicActivity_GrossDomesticProduction_NAICSWholesaleTrade_RealValue",
        "dc/62n3z7mvfpjx1",
        "dc/qt7ewllmt3826",
        "dc/zz6gwv838v9w",
    ],
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
    ]
}

_SVPG_NAMES = {
    "dc/svpg/RealGDPByIndustry": "Breakdown of GDP by Industry",
    "dc/svpg/AmountOfFarmInventoryByType": "Farm products",
    "dc/svpg/CountOfFarmInventoryByType": "Poultry and Livestock",
}


def get_topics(sv_dcids: List[str]):
  """Returns a list of SV's to use for the topic if the topic is ranked highly during detection."""
  topic_svs = []
  for i, sv in enumerate(sv_dcids):
    topic_svs += get_topic_vars(sv, i)
  return topic_svs


def get_topic_vars(topic: str, rank: int):
  if rank < _MIN_TOPIC_RANK:
    return _TOPIC_DCID_TO_SV.get(topic, [])
  return []


def get_topic_peers(sv_dcids: List[str]):
  """Returns a new div of svpg's expanded to peer svs."""
  ret = {}
  for sv in sv_dcids:
    ret[sv] = _PEER_GROUP_TO_SV.get(sv, [])
  return ret


def svpg_name(sv: str):
  return _SVPG_NAMES.get(sv, sv)
