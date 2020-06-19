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
import stat_config_pb2
import collections
from google.protobuf import text_format

class PopObsSpec(object):
  """Represents a StatisticalPopulation & Observation spec."""
  def __init__(self, pop_type, mprop, stats, ps, cpv, text):
      self.pop_type = pop_type #population type, string
      self.mprop = mprop #measured property, string
      self.stats = stats #stat_type, string
      self.ps = ps #properties, list of string
      self.cpv = cpv #constrained property-value pairs, dict{string: string}
      self.text = text #name, string
      self.key = (pop_type, mprop, stats) + tuple(sorted(ps + list(cpv.keys())))

  def __str__(self):
      print_ = "pop_type: " + self.pop_type + '\n'
      print_ += "mprop: " + self.mprop + '\n'
      print_ += "stats: " + self.stats + '\n'
      print_ += "properties: " + str(self.ps) + '\n'
      print_ += "cpv:" + str(self.cpv) + '\n'
      print_ += "name: " + self.text + '\n\n'
      return print_
  
  def __repr__(self):
      return self.__str__()


def _read_pop_obs_spec():
  """Read pop obs spec from the config file."""
  
  # Read pop obs spec
  POS_COMMON_PATH = "./pop_obs_spec_common.textproto"
  pop_obs_spec_list = stat_config_pb2.PopObsSpecList()
    
  with open(POS_COMMON_PATH, 'r') as file_common:
    data_common = file_common.read()
  text_format.Parse(data_common, pop_obs_spec_list)
  
  #result = {'vertical name': {number of cprops: [PobObsSpec]}}
  result = collections.defaultdict(lambda: collections.defaultdict(list))
  for pos in pop_obs_spec_list.spec:
    cpv = {}
    for pv in pos.dpv:
      cpv[pv.prop] = pv.val
    for v in pos.vertical:
      result[v][len(pos.cprop)].append(
        PopObsSpec(pos.pop_type, pos.mprop, pos.stat_type, list(pos.cprop),
                   cpv, pos.name))
  #print(result)
  return result
  

    
if __name__ == "__main__":
  _read_pop_obs_spec()
