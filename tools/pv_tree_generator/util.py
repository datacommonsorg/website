# Lint as: python3

# Copyright 2020 Google LLC
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

"""utility functions used to build the property-value tree structure """
from google.protobuf import text_format
import datacommons as dc
import stat_config_pb2
import collections
from constants import API_KEY

class PopObsSpec(object):
  """Represents a StatisticalPopulation & Observation spec."""
  def __init__(self, pop_type, mprop, stats, properties, cpv, name):
      self.pop_type = pop_type #population type, string
      self.mprop = mprop #measured property, string
      self.stats = stats #stat_type, string
      self.properties = properties #properties, list of string
      self.cpv = cpv #constrained property-value pairs, dict{string: string}
      self.name = name
      self.propAll = tuple(sorted(properties + list(cpv.keys())))
      self.key = (pop_type, mprop, stats) + self.propAll
      
class StatVar(object):
    """Represents a StatisticalVariable"""
    def __init__(self, pop_type , mprop , stats , pv , dcid):
      self.pop_type = pop_type #population_type, string
      self.mprop = mprop #measured property, string
      self.stats = stats #stat_type, string
      self.pv = pv #property-value pairs, dict{string: string}
      self.dcid = dcid
      self.key = (pop_type, mprop, stats) + tuple(sorted(list(pv.keys())))
      
    def match_ui_node(self, ui_node):
      #check if the statistical variable should be under the ui_node
      pospec = ui_node.pop_obs_spec
      if set(self.pv.keys()) != set(pospec.propAll):
        return False
      if not pospec.cpv.items() <= self.pv.items():
        return False
      if not ui_node.pv.items() <= self.pv.items():
        return False
      return True

class UiNode:
    """Class holds the data of a node in the pv menu tree. """
    def __init__(self, pop_obs_spec, pv, is_prop, prop=None):
      self.pop_obs_spec = pop_obs_spec #pop_obs_spec for this node.
      self.is_prop = is_prop #is the node a "Property" or a "Value" node.
      self.prop = prop #the property it represents
      self.pv = pv #An ordered dict of property-value this node inherits from its parent.

    @property
    def pop_type(self):
      return self.pop_obs_spec.pop_type

    @property
    def mprop(self):
      return self.pop_obs_spec.mprop

    @property
    def stats(self):
      return self.pop_obs_spec.stats

    @property
    def cpv(self):
      return self.pop_obs_spec.cpv

    @property
    def text(self):
      """Return the display text."""
      if self.is_prop:  # This is a Property
        if self.pop_obs_spec.name:
          return self.pop_obs_spec.name
        else:
          return self.prop
      else:  # This is a Value
        if self.prop:
          return self.pv[self.prop]
        elif self.pop_obs_spec.name:
          return self.pop_obs_spec.name
        else:
          stats = ''
          if self.stats != 'measuredValue':
            stats = self.stats.replace('Value', '')
          return '{} {}'.format(stats, self.mprop)

    @property
    def arg_string(self):
      """Return the arg string for url."""
      pv = self.pv.copy()
      if 'crimeType' in pv and 'subType' in pv:
        pv['crimeType'] = pv['subType']
        del pv['subType']
      if self.is_prop:
        return ''
      result = '{},{}'.format(self.pop_type, self.mprop)
      for p, v in pv.items():
        result += ',{},{}'.format(p, v)
      for p, v in self.cpv.items():
        result += ',{},{}'.format(p, v)
      return result

    @property
    def enum(self):
      if not self.is_prop and self.prop:
        return self.pv[self.prop]
      else:
        return ''

def _read_pop_obs_spec():
  """Read pop obs spec from the config file."""
  
  # Read pop obs spec
  POS_COMMON_PATH = "./pop_obs_spec_common.textproto"
  pop_obs_spec_list = stat_config_pb2.PopObsSpecList()
    
  with open(POS_COMMON_PATH, 'r') as file_common:
    data_common = file_common.read()
  text_format.Parse(data_common, pop_obs_spec_list)
  
  result = collections.defaultdict(lambda: collections.defaultdict(list))
  for pos in pop_obs_spec_list.spec:
    cpv = {}
    for pv in pos.dpv:
      cpv[pv.prop] = pv.val
    for v in pos.vertical:
      result[v][len(pos.cprop)].append(
        PopObsSpec(pos.pop_type, pos.mprop, pos.stat_type, list(pos.cprop),
                   cpv, pos.name))
  return result
  
def _read_stat_var():
    """Read all the statistical variables"""
    #read the dcid of all statistical variables

    #currently we read it from the downloaded .csv file
    #in the future, we will change to query it from bigquery,
    #or from calling API of datacommons
    sv_dcid = open("statistical_variables_dcid.txt",'r').read().splitlines()

    #get the triples for each statistical variable and store it as StatVar
    """
    example of triples for one statsitical variable
    ('dc/014es05x0d5l', 'measurementMethod', 'CensusACS5yrSurvey')
    ('dc/014es05x0d5l', 'constraintProperties', 'income')
    ('dc/014es05x0d5l', 'income', 'USDollar75000Onwards')
    ('dc/014es05x0d5l', 'age', 'Years15Onwards')
    ('dc/014es05x0d5l', 'statType', 'measuredValue')
    ('dc/014es05x0d5l', 'placeOfBirth', 'BornInStateOfResidence')
    ('dc/014es05x0d5l', 'measuredProperty', 'count')
    ('dc/014es05x0d5l', 'incomeStatus', 'WithIncome')
    ('dc/014es05x0d5l', 'constraintProperties', 'placeOfBirth')
    ('dc/014es05x0d5l', 'typeOf', 'StatisticalVariable')
    ('dc/014es05x0d5l', 'populationType', 'Person')
    ('dc/014es05x0d5l', 'provenance', 'dc/cweckx1')
    ('dc/014es05x0d5l', 'constraintProperties', 'incomeStatus')
    ('dc/014es05x0d5l', 'constraintProperties', 'age')
    """
    dc.set_api_key(API_KEY)
    sv_triples = dc.get_triples(sv_dcid)
    statVars = collections.defaultdict(list)
    for dcid, triples in sv_triples.items():
      constraintProperties = set()
      sv_dict = collections.defaultdict(str)
      for _, prop, val in triples:
        if prop == "constraintProperties":
          constraintProperties.add(val)
        else:
          sv_dict[prop] = val
          
      prop_val = {}
      for property in constraintProperties:
        if property in sv_dict:
          prop_val[property] = sv_dict[property]
        
      sv = StatVar(sv_dict["populationType"], sv_dict["measuredProperty"], sv_dict["statType"], prop_val, dcid)
      statVars[sv.key].append(sv)
    return statVars

