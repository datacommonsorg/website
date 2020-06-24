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

"""build the property-value tree """

import util
import text_format
import collections

MAX_LEVEL = 6

def build_tree_recursive(pos, level, pop_obs_spec, stat_vars, show_all, parent=None):
    """Recursively build the ui tree"""
    #get the property of the ui node
    if parent:
      property_diff = (set(pos.properties) - set(parent.pop_obs_spec.properties)).pop()
      parent_pv = parent.pv
    else:
      property_diff = pos.properties[0]  # This is single pv pos
      parent_pv = {}
    
    prop_ui_node = util.UiNode(pos, parent_pv, True, property_diff)
    result = {
      'populationType': prop_ui_node.pop_type,
      'show': 'yes',
      'selected': 'no',
      'expanded': 'no',
      'title': text_format.format_title(prop_ui_node.text),
      'type': 'Property',
      'count': 0,
      'children': [],
      'sv_set': set()
    }
    
    #get the child specs of the current node
    child_pos = []
    for c_pos in pop_obs_spec[level+1]:
      if pos.pop_type == c_pos.pop_type and set(pos.properties) < set(c_pos.properties):
        child_pos.append(c_pos)
        
    for sv in stat_vars[pos.key]:
      if sv.match_ui_node(prop_ui_node):
        value_ui_pv = collections.OrderedDict()
        for prop, val in parent_pv.items():
          value_ui_pv[prop] = val
        value_ui_pv[property_diff] = sv.pv[property_diff]
        value_ui_node = util.UiNode(pos, value_ui_pv, False, property_diff)
        
        value_blob = {
          'populationType': value_ui_node.pop_type,
          'show': 'yes',
          'selected': 'no',
          'expanded': 'no',
          'argString': sv.dcid,
          'title': text_format.format_title(value_ui_node.text),
          'type': 'value',
          'enum': value_ui_node.enum,
          'count': 1,
          'children': [],
          'sv_set': set([sv.dcid])
        }
        #add statistical variables as the child of current node
        result['children'].append(value_blob)
    
        if level <= MAX_LEVEL:
          #build the branches recursively
          for child in child_pos:
            branch = build_tree_recursive(child, level + 1, pop_obs_spec,
                                        stat_vars, show_all, value_ui_node)
            if branch['children']:
              value_blob['children'].append(branch)
            value_blob['sv_set'] |= branch['sv_set']
            del branch['sv_set']
        value_blob['count'] = len(value_blob['sv_set'])
      
    result['children'] = text_format.filter_and_sort(property_diff, result['children'], show_all)
    #update the count
    if result['children']:
      for child in result['children']:
        result['sv_set'] |= child['sv_set']
        del child['sv_set']
    result['count'] = len(result['sv_set'])
    return result
    
def build_tree(v, pop_obs_spec, stat_vars, show_all):
    """Build the tree for each vertical."""
    
    #vertical as the root
    root = {
        'show': 'yes',
        'selected': 'no',
        'expanded': 'no',
        'argString': 'top',
        'title': text_format.format_title(v),
        'type': 'Property',
        'count': 0, #count of child nodes
        'children': [],
        'sv_set': set(),#used for counting child nodes
    }
    
    #specs with 0 constaints are of type "value", as the level 1 children of root
    for pos in pop_obs_spec[0]:
      ui_node = util.UiNode(pos, {}, False)
      root['children'].append({
        'populationType': ui_node.pop_type,
        'show': 'yes',
        'selected': 'no',
        'expanded': 'no',
        'argString': ui_node.arg_string,
        'title': text_format.format_title(ui_node.text),
        'type': 'value',
        'children': [],
        'count': 1,
      })
      root['count'] += 1
    
    #build specs with >= 1 constraints recursively
    for pos in pop_obs_spec[1]:
      child = build_tree_recursive(pos, 1, pop_obs_spec, stat_vars, show_all)
      # For certain branch, we would like to put them under 0 pv nodes:
      if (pos.pop_type in ['EarthquakeEvent', 'CycloneEvent', 'MortalityEvent']):
        for pv0 in root['children']:  # hoist logic will break if multiple 0 pv
          if pv0['argString'] == '{},count'.format(pos.pop_type):
            pv0['children'].append(child)
            if 'sv_set' not in pv0:
              pv0['sv_set'] = set()
            pv0['sv_set'] |= child['sv_set']
            break
      else:
        root['children'].append(child)
      root['sv_set'] |= child['sv_set']
      del child['sv_set']
     
     
    #update the count
    for pv0 in root['children']:
      if 'sv_set' in pv0:
        pv0['count'] += len(pv0['sv_set'])
        del pv0['sv_set']
    root['count'] += len(root['sv_set'])
    del root['sv_set']
    
    return root
     
