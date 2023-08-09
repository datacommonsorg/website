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


"""
Recursively fetch SDG hierarchy 

# Dependencies
pip install requests click dataclasses

# Usage
# Step 1: (Skip this step unless you need to update the sdg hierarchy) Fetch initial sdg variable grouping (this takes 10+ minutes)
python sdg_helper.py fetch-sdgs --outfile ../config/sdgs.new.json

# Step 2: Enrich the sdgs with country availability and recommended chart types 
python sdg_helper.py enrich-sdgs --infile ../config/sdgs.new.json --outfile ../config/sdgs-enriched.new.json
"""

import json
import os
import sys
from dataclasses import asdict, dataclass, is_dataclass
from typing import Dict, List

import click
import requests
from requests.adapters import HTTPAdapter, Retry

requests_session = requests.Session()

retries = Retry(total=10,
                backoff_factor=1,
                status_forcelist=[ 500, 502, 503, 504 ])

requests_session.mount('https://', HTTPAdapter(max_retries=retries))

API_HOST = 'api.datacommons.org'
API_SCHEME = 'https'
API_KEY = os.environ.get('DC_API_KEY', '')
SDG_GROUP_ROOT = 'dc/g/SDG'

@dataclass
class VariableGroup:
  dcid: str
  name: str
  childGroupDcids: List[str]
  childVariableDcids: List[str]
  parentGroupDcids: List[str]
  decendentVariableCount: List[str]


@dataclass
class Variable:
  dcid: str
  name: str
  searchNames: List[str]
  parentGroupDcids: List[str]
  definition: str


@dataclass
class ResultSet:
  variablesById: Dict[str, Variable]
  variableIds: List[str]
  variableGroupsById: Dict[str, VariableGroup]
  variableGroupIds: List[str]

class DataclassJSONEncoder(json.JSONEncoder):
  def default(self, o):
    if is_dataclass(o):
      return asdict(o)
    return super().default(o)

def json_dumps_dataclass(o, **options):
  return json.dumps(o, cls=DataclassJSONEncoder, **options)

class DataCommonsClient:
  def __init__(self, api_host=API_HOST, api_scheme=API_SCHEME, api_key=API_KEY):
    if not api_key:
      raise(Exception("No API key found. Please set your Data Commons API key with the environment variable DC_API_KEY"))
    self.api_host = api_host
    self.api_scheme = api_scheme
    self.api_key = api_key
  
  def get_variable_group_info(self, dcid) -> object:
    url = f'https://{self.api_host}/v1/info/variable-group/{dcid}?key={self.api_key}'
    
    return requests_session.get(url).json()

  def get_variable_info(self, dcid):
    url = f'https://{self.api_host}/v1/info/variable/{dcid}?key={self.api_key}'

    f'https://datacommons.org/api/variable-group/info'

def fetch_variable_groups(client: DataCommonsClient, dcid: str, recursive: bool = True) -> List[object]:
  """
  Recursively fetch all variable groups at the starting root dcid.
  Returns results as a flat list
  """
  results = []
  result = client.get_variable_group_info(dcid)

  if len(result) > 0:
    results.append(result)
  if recursive:
    for stat_var_group in result["info"].get("childStatVarGroups",[]):
      results.extend(fetch_variable_groups(client, stat_var_group["id"]))
  return results

def normalize_variable_groups(result_groups) -> ResultSet:
  """
  Normalizes variable groups and simplify data format
  """
  result = ResultSet(
    variablesById={},
    variableIds=[],
    variableGroupsById={},
    variableGroupIds=[]
  )

  for result_group in result_groups:
    variable_group = VariableGroup(
      dcid=result_group["node"],
      name=result_group["info"]["absoluteName"],
      childGroupDcids=[g["id"] for g in result_group["info"].get("childStatVarGroups",[])],
      childVariableDcids= [v["id"] for v in result_group["info"].get("childStatVars",[])],
      parentGroupDcids=result_group["info"]["parentStatVarGroups"],
      decendentVariableCount=result_group["info"].get("descendentStatVarCount",0)
    )
    result.variableGroupsById[variable_group.dcid] = variable_group
    result.variableGroupIds.append(variable_group.dcid)

    for result_variable in result_group["info"].get("childStatVars",[]):
      variable = Variable(
        dcid=result_variable["id"],
        name=result_variable["displayName"],
        searchNames=result_variable["searchNames"],
        parentGroupDcids=[variable_group.dcid],
        definition=result_variable["definition"],
      )
      result.variablesById[variable.dcid] = variable
      result.variableIds.append(variable.dcid)

  return result


@click.group()
def cli():
  pass

@cli.command()
@click.option('--outfile', default=None)
def fetch_sdgs(outfile):
  client = DataCommonsClient()
  with (open(outfile, 'w') if outfile else sys.stdout) as outfile_writer:
    result_groups = fetch_variable_groups(client, SDG_GROUP_ROOT)
    result_set = normalize_variable_groups(result_groups)
    outfile_writer.write(json_dumps_dataclass(result_set, indent=4))


@cli.command()
@click.option('--infile', required=True)
@click.option('--outfile', default=None)
def enrich_sdgs(infile, outfile):
  client = DataCommonsClient()
  # get top-level sdgs
  result = fetch_variable_groups(client, SDG_GROUP_ROOT, recursive=False)


  sdg_groups = [g["id"] for g in result[0]["info"]["childStatVarGroups"]]
  sdg_result_set = json.loads(open(infile).read())


@cli.command()
def fetch_sdg_groups():
  client = DataCommonsClient()
  result = fetch_variable_groups(client, SDG_GROUP_ROOT, recursive=False)
  sdg_groups = [g["id"] for g in result[0]["info"]["childStatVarGroups"]]
  print(json.dumps(sdg_groups,indent=4))

if __name__ == '__main__':
  cli()
