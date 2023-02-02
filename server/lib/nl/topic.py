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
    "dc/topic/SolarPotential": ["dc/svpg/SolarPotentialDetails"]
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
    "dc/svpg/SolarPotentialDetails": [
        "Count_Building_SuitableForSolar",
        "Percent_Building_SuitableForSolar_ProjectSunroof",
        "Amount_SolarPotential",
        "Count_SolarPanelPotential",
        "Median_Amount_SolarGenerationPotential",
        "Count_SolarPanel",
    ]
}

_SVPG_NAMES_OVERRIDE = {"dc/svpg/SolarPotentialDetails": "Solar Potential"}


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
