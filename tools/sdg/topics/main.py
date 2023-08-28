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

import json
import logging
import os
from typing import Dict, List, Set

import requests

logging.getLogger().setLevel(logging.INFO)

_SDG_ROOT = "dc/g/SDG"
_SDG_TOPIC_JSON = '../../../server/config/nl_page/sdg_topic_cache.json'
_SDG_MINI_TOPIC_JSON = '../../../server/config/nl_page/sdgmini_topic_cache.json'
API_ROOT = "https://autopush.api.datacommons.org"
API_PATH_SVG_INFO = API_ROOT + '/v1/bulk/info/variable-group'
API_PATH_PV = API_ROOT + '/v1/bulk/property/values/out'

#
# This comes from https://country-profiles.unstatshub.org/irl.
# TODO: Some Series (like SH_DYN_IMRTN are defined as SV sdg/SH_DYN_IMRTN.AGE--Y0)
#
TRIMMED_GOAL_SERIES = [
    "SI_POV_DAY1,SI_COV_MATNL,SI_COV_POOR,SI_COV_CHLD,SI_COV_UEMP,SI_COV_VULN,SI_COV_WKINJRY,SI_COV_BENFTS,SI_COV_DISAB,SI_COV_PENSN,SP_ACS_BSRVH2O,SP_ACS_BSRVSAN,VC_DSR_LSGP,VC_DSR_AGLN,VC_DSR_HOLN,VC_DSR_CILN,SD_XPD_ESED",
    "SN_ITK_DEFC,AG_PRD_FIESMSI,AG_PRD_FIESMSIN,AG_PRD_FIESSI,AG_PRD_FIESSIN,ER_GRF_ANIMRCNTN,ER_GRF_PLNTSTOR,ER_RSK_LBREDS,AG_PRD_ORTIND,AG_PRD_AGVAS,AG_XPD_AGSGB,AG_FPA_CFPI",
    "SH_STA_MMR,SH_DYN_IMRTN,SH_DYN_MORT,SH_DYN_IMRT,SH_DYN_MORTN,SH_DYN_NMRTN,SH_DYN_NMRT,SH_HIV_INCD,SH_TBS_INCID,SH_HAP_HBSAG,SH_TRP_INTVN,SH_DTH_NCOM,SH_DTH_RNCOM,SH_STA_SCIDE,SH_STA_SCIDEN,SH_SUD_ALCOL,SH_ALC_CONSPT,SH_STA_TRAF,SP_DYN_ADKL,SH_ACS_UNHC,SH_XPD_EARN25,SH_XPD_EARN10,SH_AAP_ASMORT,SH_STA_WASH,SH_STA_POISN,SH_PRV_SMOK,SH_ACS_DTP3,SH_ACS_PCV3,SH_ACS_HPV,SH_MED_HEAWOR",
    "SE_PRE_PARTN,SE_ADT_EDUCTRN,SE_ADT_ACTS,SE_PRE_GPIPARTN,SE_GPI_PART,SE_GPI_ICTS,SE_IMP_FPOF,SE_ADT_FUNS",
    "SG_GEN_PARL,SG_GEN_LOCGELS,IC_GEN_MGTL,IC_GEN_MGTN,IT_MOB_OWN",
    "SH_H2O_SAFE,SH_SAN_SAFE,SH_SAN_DEFECT,EN_WWT_WWDS,EN_H2O_OPAMBQ,EN_H2O_RVAMBQ,EN_H2O_GRAMBQ,EN_H2O_WBAMBQ,ER_H2O_WUEYST,ER_H2O_STRESS,ER_H2O_IWRMD,EG_TBA_H2CO,EG_TBA_H2COAQ,EG_TBA_H2CORL,EN_WBE_PMPR",
    "EG_ELC_ACCS,EG_EGY_CLEAN,EG_FEC_RNEW,EG_EGY_PRIM",
    "NY_GDP_PCAP,SL_EMP_PCAP,SL_EMP_AEARN,SL_TLF_UEM,SL_TLF_NEET,SL_EMP_FTLINJUR,SL_EMP_INJUR,SL_LBR_NTLCPL,FB_ATM_TOTL,FB_CBK_BRCH,FB_BNK_ACCSS,DC_TOF_TRDCMDL,DC_TOF_TRDDBMDL",
    "IS_RDP_FRGVOL,IS_RDP_PFVOL,IS_RDP_PORFVOL,NV_IND_MANFPC,NV_IND_MANF,SL_TLF_MANF,NV_IND_SSIS,EN_ATM_CO2,EN_ATM_CO2MVA,EN_ATM_CO2GDP,GB_XPD_RSDV,GB_POP_SCIERD,NV_IND_TECH,IT_MOB_2GNTWK,IT_MOB_3GNTWK,IT_MOB_4GNTWK",
    "SI_HEI_TOTL,SI_POV_50MI,VC_VOV_GDSD,SL_EMP_GTOTL,FI_FSI_FSANL,FI_FSI_FSERA,FI_FSI_FSKA,FI_FSI_FSKNL,FI_FSI_FSLS,TM_TRF_ZERO,DC_TRF_TOTDL",
    "EN_ATM_PM25",
    "EN_MAT_DOMCMPG,EN_MAT_DOMCMPC,EN_EWT_GENPCAP,EN_EWT_RCYR,EN_EWT_RCYPCAP,EN_HAZ_PCAP,EN_HAZ_GENGDP,EN_HAZ_TRTDISR,EN_EWT_RCYR,EN_EWT_RCYPCAP,ER_FFS_PRTSST,ER_FFS_PRTSPC,ER_FFS_PRTSPR",
    "VC_DSR_AFFCT,VC_DSR_MORT,VC_DSR_MTMP,VC_DSR_MTMN,VC_DSR_DAFF,VC_DSR_PDAN,VC_DSR_PDLN,SG_DSR_LGRGSR,SG_DSR_SILS",
    "ER_MRN_MARINT,ER_MRN_MARIN,ER_MRN_MPA,ER_RDE_OSEX",
    "AG_LND_FRST,ER_PTD_FRWRT,ER_PTD_TERRS,AG_LND_FRSTBIOPHA,AG_LND_FRSTCERT,AG_LND_FRSTCHG,AG_LND_FRSTMGT,AG_LND_FRSTPRCT,ER_PTD_MOTN,ER_MTN_GRNCVI,ER_RSK_LSTI,ER_CBD_SMTA,DC_ODA_BDVDL,DC_ODA_BDVDL",
    "VC_VOV_PHYL,VC_HTF_DETV,VC_PRR_PHYV,VC_PRR_ROBB,VC_PRS_UNSEC,SG_REG_BRTH,VC_VOV_GDSD",
    "GR_G14_GDP,GC_GOB_TAXD,DC_ODA_SIDSG,DC_ODA_LDCG,DC_ODA_LLDC,DC_ODA_SIDS,DC_ODA_LDCS,DC_ODA_LLDCG,DC_ODA_TOTG,DC_ODA_TOTL,GF_FRN_FDI,BX_TRF_PWKR,IT_NET_BBP,IT_USE_ii99",
]

# Remap all the 67 missing SVs, here is a start:
# SERIES_OVERRIDE = {
#   'SI_COV_MATNL': 'SI_COV_MATNL.SEX--F',
#   'AG_PRD_AGLN': 'AG_PRD_AGLH',
#   'AG_PRD_HOLN': 'AG_PRD_HOLH',
# }


# Given a topic like dc/topic/sdg_1, returns the SVs from TRIMMED_GOAL_SERIES
def get_trimmed_children(topic):
  idx = int(topic.replace('dc/topic/sdg_', '')) - 1
  svs = []
  for series in TRIMMED_GOAL_SERIES[idx].split(','):
    svs.append(f'sdg/{series}')
  return svs


# TODO: Fix all SVS so this is empty.
def sv_existence_check():
  all_svs = [
      f'sdg/{sv}' for line in TRIMMED_GOAL_SERIES for sv in line.split(',')
  ]
  resp = call_api(API_PATH_PV, {'property': 'name', 'nodes': all_svs})
  num_missing = 0
  for data in resp.get('data', []):
    if not data.get('values'):
      num_missing += 1
      print(f"Missing {data['node']}")

  print(f'\nIMPORTANT: Missing {num_missing} out of {len(all_svs)} Series!\n')


def call_api(url, req):
  headers = {'Content-Type': 'application/json'}
  # Set MIXER_API_KEY to the autopush API key
  mixer_api_key = os.environ.get('MIXER_API_KEY', '')
  if mixer_api_key:
    headers['x-api-key'] = mixer_api_key
  # Send the request and verify the request succeeded
  response = requests.post(url, json=req, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer: "{}"'.format(
            response.status_code, response.reason, response.content))
  return response.json()


def _svg2t(svg):
  # NOTE: Use small "sdg" to avoid overlap with prior topics.
  return svg.replace('dc/g/SDG', 'dc/topic/sdg').replace('dc/g/', 'dc/topic/')


def download_svg_recursive(svgs: List[str], nodes: List[Dict],
                           processed: Set[str], filterset: Set[str]):
  resp = call_api(API_PATH_SVG_INFO, {'nodes': svgs})

  recurse_nodes = set()
  for data in resp.get('data', []):
    svg_id = data.get('node', '')
    if not svg_id:
      continue

    info = data.get('info', '')
    if not info:
      continue

    tid = _svg2t(svg_id)
    if tid in processed:
      continue

    # TODO: Put stuff that has the same `pt` together.
    members = []
    for csv in info.get('childStatVars', []):
      if not csv.get('hasData') or not csv.get('id'):
        continue
      members.append(csv['id'])

    for csvg in info.get('childStatVarGroups', []):
      if not csvg.get('id'):
        continue
      members.append(_svg2t(csvg['id']))
      if not filterset or csvg['id'] in filterset:
        recurse_nodes.add(csvg['id'])

    nodes.append({
        'dcid': [tid],
        'name': [info.get('absoluteName', '')],
        'typeOf': ['Topic'],
        'relevantVariableList': members
    })
    processed.add(tid)

  if recurse_nodes:
    download_svg_recursive(sorted(list(recurse_nodes)), nodes, processed,
                           filterset)


def download_full_sdg_svgs():
  nodes = []
  processed = set()
  download_svg_recursive([_SDG_ROOT], nodes, processed, None)
  return nodes


def generate_full():
  nodes = download_full_sdg_svgs()
  nodes.sort(key=lambda x: x['dcid'])
  with open(_SDG_TOPIC_JSON, 'w') as fp:
    json.dump({'nodes': nodes}, fp, indent=2)


def generate_trimmed():
  # Print missing SVs
  sv_existence_check()

  # Generate just the top-level nodes.
  processed = set()
  nodes = []
  # Filter to only get the Goals.
  filterset = set([f'dc/g/SDG_{i}' for i in range(1, 18)])
  download_svg_recursive([_SDG_ROOT], nodes, processed, filterset)

  # Replace the SVG children with trimmed SVs.
  for n in nodes:
    dcid = n['dcid'][0]
    if dcid.startswith('dc/topic/sdg_'):
      n['relevantVariableList'] = get_trimmed_children(dcid)

  with open(_SDG_MINI_TOPIC_JSON, 'w') as fp:
    json.dump({'nodes': nodes}, fp, indent=2)


def main():
  generate_trimmed()
  generate_full()


if __name__ == "__main__":
  main()
