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

import collections
import util
import text_format

MAX_LEVEL = 6
SEARCH_SPECS, SEARCH_VALS = util._read_search_pvs()

def build_tree_recursive(pos, level, pop_obs_spec, stat_vars, place_mapping,  
    parent=None):
    """Recursively build the ui tree"""
    #get the property of the ui node
    if parent:
        property_diff = (set(pos.properties) - set(parent.pop_obs_spec.
            properties)).pop()
        parent_pv = parent.pv
    else:
        property_diff = pos.properties[0]  # This is single pv pos
        parent_pv = {}

    prop_ui_node = util.UiNode(pos, parent_pv, True, property_diff)
    result = {
        'populationType': prop_ui_node.pop_type,
        'title': text_format.format_title(prop_ui_node.text),
        'type': 'prop',
        'count': 0,
        'children': [],
        'sv_set': set(),
        'search_count': 0,
        'search_sv_set': set(),
        'mprop': prop_ui_node.mprop, 
        'placeTypes': [],
    }
    
    #get the child specs of the current node
    child_pos = []
    for c_pos in pop_obs_spec[level+1]:
        if (pos.pop_type == c_pos.pop_type and 
            set(pos.properties) < set(c_pos.properties)):
                child_pos.append(c_pos)

    child_values = []
    for sv in stat_vars[pos.key]:
        if sv.match_ui_node(prop_ui_node) and sv.pv[property_diff] not in child_values:
            value_ui_pv = collections.OrderedDict()
            for prop, val in parent_pv.items():
                value_ui_pv[prop] = val
            value_ui_pv[property_diff] = sv.pv[property_diff]
            child_values.append(sv.pv[property_diff])
            value_ui_node = util.UiNode(pos, value_ui_pv, False, property_diff)
            
            in_search = True
            for prop, val in value_ui_pv.items():
                in_search = (in_search and (value_ui_node.pop_type, 
                    value_ui_node.mprop, prop) in SEARCH_SPECS and val in SEARCH_VALS)
                if not in_search:
                    break

            value_blob = {
                'populationType': value_ui_node.pop_type,
                'argString': sv.dcid,
                'title': text_format.format_title(value_ui_node.text),
                'type': 'val',
                'enum': value_ui_node.enum,
                'count': 1,
                'children': [],
                'sv_set': set([sv.dcid]),
                'search_count': 1 if in_search else 0,
                'search_sv_set': set([sv.dcid]) if in_search else set(),
                'mprop': value_ui_node.mprop,
                'placeTypes': sorted(place_mapping[sv.dcid]),
            }
            # add statistical variables as the child of current node
            result['children'].append(value_blob)

            if level <= MAX_LEVEL:
                #build the branches recursively
                for child in child_pos:
                    branch = build_tree_recursive(child, level + 1, 
                        pop_obs_spec, stat_vars, place_mapping, value_ui_node)
                    if branch['children']:
                        value_blob['children'].append(branch)
                    value_blob['sv_set'] |= branch['sv_set']
                    value_blob['search_sv_set'] |= branch['search_sv_set']
                    del branch['sv_set']
                    del branch['search_sv_set']
            value_blob['count'] = len(value_blob['sv_set'])
            value_blob['search_count'] = len(value_blob['search_sv_set'])

    result['children'] = text_format.filter_and_sort(property_diff, 
        result['children'], False)
    
    #update the count
    if result['children']:
        place_types_set = set()
        for child in result['children']:
            result['sv_set'] |= child['sv_set']
            result['search_sv_set'] |= child['search_sv_set']
            del child['sv_set']
            del child['search_sv_set']
            place_types_set.update(child['placeTypes'])
        result['placeTypes'] = sorted(list(place_types_set))

    result['count'] = len(result['sv_set'])
    result['search_count'] = len(result['search_sv_set'])
    return result

def build_tree(v, pop_obs_spec, stat_vars, place_mapping):
    """Build the tree for each vertical."""

    #vertical as the root
    root = {
        'argString': 'top',
        'title': text_format.format_title(v),
        'type': 'prop', 
        'count': 0, #count of child nodes
        'children': [],
        'sv_set': set(),#used for counting child nodes
        'search_count': 0,
        'search_sv_set': set(),
        'placeTypes': [],
    }

    # specs with 0 constaints are of type "value", 
    # as the level 1 children of root
    for pos in pop_obs_spec[0]:
        search_count = (1 if (pos.pop_type, pos.mprop, '') in SEARCH_SPECS else 0)
        ui_node = util.UiNode(pos, {}, False)
        for sv in stat_vars[pos.key]:
            if pos.cpv == sv.pv:
                root['children'].append({
                    'populationType': ui_node.pop_type,
                    'argString': sv.dcid,
                    'title': text_format.format_title(ui_node.text),
                    'type': 'val', 
                    'children': [],
                    'count': 1,
                    'search_count': search_count,
                    'mprop': ui_node.mprop, 
                    'placeTypes': sorted(place_mapping[sv.dcid]),
                })
                root['placeTypes'] = sorted(list(set(root['placeTypes'])|
                    set(place_mapping[sv.dcid])))
                break # to avoid duplicates related to measurementMethod
            root['count'] += 1
            root['search_count'] += search_count

    # build specs with >= 1 constraints recursively
    
    for pos in pop_obs_spec[1]:
        child = build_tree_recursive(pos, 1, pop_obs_spec, stat_vars, 
                                     place_mapping)
        # For certain branch, we would like to put them under 0 pv nodes:
        if (pos.pop_type in ['EarthquakeEvent', 'CycloneEvent', 
            'MortalityEvent']):
            for pv0 in root['children']: 
                # hoist logic will break if multiple 0 pv
                if (pv0['populationType'] == pos.pop_type and 
                    pv0['mprop'] == 'count'):
                    pv0['children'].append(child)
                    if 'sv_set' not in pv0:
                        pv0['sv_set'] = set()
                        pv0['search_sv_set'] = set()
                    pv0['sv_set'] |= child['sv_set']
                    pv0['search_sv_set'] |= child['search_sv_set']
                    break
        else:
            root['children'].append(child)
        root['sv_set'] |= child['sv_set']
        root['search_sv_set'] |= child['search_sv_set']
        del child['sv_set']
        del child['search_sv_set']
        root['placeTypes'] = sorted(list(set(root['placeTypes'])|
                    set(child['placeTypes'])))

    # update the count
    for pv0 in root['children']:
        if 'sv_set' in pv0:
            pv0['count'] += len(pv0['sv_set'])
            pv0['search_count'] += len(pv0['search_sv_set'])
            del pv0['sv_set']
            del pv0['search_sv_set']
    root['count'] += len(root['sv_set'])
    root['search_count'] += len(root['search_sv_set'])
    del root['sv_set']
    del root['search_sv_set']
    return traverseTree(root)

def traverseTree(root):
    if 'populationType' in root:
        del root['populationType']
    if 'mprop' in root:
        del root['mprop']
    if 'children' in root:
        for node in root['children']:
            traverseTree(node)
    return root