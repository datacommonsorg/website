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


def build_tree_recursive(pos, level, pop_obs_spec, stat_vars,
                         parent=None):
    """Recursively build the ui tree"""
    # get the property of the ui node
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
        'l': text_format.format_title(prop_ui_node.text),
        't': 'p',
        'c': 0,
        'cd': [],
        'sv_set': set(),
    }

    # get the child specs of the current node
    child_pos = []
    for c_pos in pop_obs_spec[level+1]:
        if (pos.pop_type == c_pos.pop_type and
                set(pos.properties) < set(c_pos.properties)):
            child_pos.append(c_pos)

    child_prop_vals = []
    for sv in stat_vars[pos.key]:
        if sv.match_ui_node(prop_ui_node) and sv.pv[property_diff]:
            if sv.pv[property_diff] not in child_prop_vals:
                # if this is the first statsvar of this node, build the node
                # and corresponding child nodes
                child_prop_vals.append(sv.pv[property_diff])
                value_ui_pv = collections.OrderedDict()
                for prop, val in parent_pv.items():
                    value_ui_pv[prop] = val
                value_ui_pv[property_diff] = sv.pv[property_diff]
                value_ui_node = util.UiNode(
                    pos, value_ui_pv, False, property_diff)
                value_blob = {
                    'populationType': value_ui_node.pop_type,
                    'sv': [sv.dcid],
                    'l': text_format.format_title(value_ui_node.text),
                    't': 'v',
                    'e': value_ui_node.enum,
                    'c': 1,
                    'sv_set': set([sv.dcid]),
                }
                if sv.se:
                    value_blob['se'] = sv.se
                # add statistical variables as the child of current node
                result['cd'].append(value_blob)

                if level <= MAX_LEVEL:
                    # build the branches recursively
                    for child in child_pos:
                        branch = build_tree_recursive(
                            child, level + 1, pop_obs_spec, stat_vars, value_ui_node)
                        if branch['cd']:
                            if 'cd' not in value_blob:
                                value_blob['cd'] = []
                            value_blob['cd'].append(branch)
                        value_blob['sv_set'] |= branch['sv_set']
                        del branch['sv_set']
                value_blob['c'] = len(value_blob['sv_set'])
            else:
                # if this is a duplicated statsVar
                # append the statsVar to the right node, increase the count by 1
                for child in result['cd']:
                    if child['e'] == sv.pv[property_diff]:
                        child['sv'].append(sv.dcid)

    result['cd'] = text_format.filter_and_sort(property_diff,
                                               result['cd'], False)

    # update the count
    if result['cd']:
        for child in result['cd']:
            result['sv_set'] |= child['sv_set']
            del child['sv_set']

    result['c'] = len(result['sv_set'])
    result = group_super_enum(result)
    return result


def build_tree(v, pop_obs_spec, stat_vars, vertical_idx):
    """Build the tree for each vertical."""

    # vertical as the root
    root = {
        'sv': ['top'],
        'l': text_format.format_title(v),
        't': 'p',
        'c': 0,  # count of child nodes
        'cd': [],
        'sv_set': set(),  # used for counting child nodes
    }
    # specs with 0 constaints are of type "value",
    # as the level 1 cd of root
    for pos in pop_obs_spec[0]:
        ui_node = util.UiNode(pos, {}, False)
        childStatsVars = []
        # find all the statsvars belong to the node
        for sv in stat_vars[pos.key]:
            if pos.cpv == sv.pv:
                childStatsVars.append(sv.dcid)
                root['c'] += 1
        if len(childStatsVars) > 0:
            root['cd'].append({
                'populationType': ui_node.pop_type,
                'sv': childStatsVars,
                'l': text_format.format_title(ui_node.text),
                't': 'v',
                'c': len(childStatsVars),
                'mprop': ui_node.mprop,
            })

    # build specs with >= 1 constraints recursively
    for pos in pop_obs_spec[1]:
        child = build_tree_recursive(pos, 1, pop_obs_spec, stat_vars,
                                     )
        # For certain branch, we would like to put them under 0 pv nodes:
        if (pos.pop_type in ['EarthquakeEvent', 'CycloneEvent',
                             'MortalityEvent']):
            for pv0 in root['cd']:
                # hoist logic will break if multiple 0 pv
                if (pv0['populationType'] == pos.pop_type and pv0['mprop'] == 'count'):
                    if 'cd' not in pv0:
                        pv0['cd'] = []
                    pv0['cd'].append(child)
                    if 'sv_set' not in pv0:
                        pv0['sv_set'] = set()
                    pv0['sv_set'] |= child['sv_set']
                    break
        else:
            root['cd'].append(child)
        root['sv_set'] |= child['sv_set']
        del child['sv_set']

    # update the count
    for pv0 in root['cd']:
        if 'sv_set' in pv0:
            pv0['c'] += len(pv0['sv_set'])
            del pv0['sv_set']
    root['c'] += len(root['sv_set'])
    del root['sv_set']
    statsvar_path = {}
    return traverseTree(root, [vertical_idx], statsvar_path)


def traverseTree(root, path, statsvar_path):
    if root['t'] == 'v':
        for sv in root['sv']:
            statsvar_path[sv] = path
    if 'populationType' in root:
        del root['populationType']
    if 'mprop' in root:
        del root['mprop']
    if 'se' in root:
        del root['se']
    if 'cd' in root:
        idx = 0
        for node in root['cd']:
            nextPath = path + [idx]
            traverseTree(node, nextPath, statsvar_path)
            idx += 1
    return root, statsvar_path


def getTopLevel(root, max_level):
    return removeChildren(root, 0, max_level)


def removeChildren(root, cur_level, max_level):
    if 'cd' in root:
        if cur_level >= max_level:
            del root['cd']
        else:
            for node in root['cd']:
                removeChildren(node, cur_level+1, max_level)
    return root


def group_super_enum(json_blob):
    """Group the nodes by super enum."""
    new_children = []
    grouping = collections.defaultdict(list)
    direct_enum = set()
    for child in json_blob['cd']:
        if 'se' in child:
            # Now only group by one super enum.
            assert len(child['se']) == 1
            v = list(child['se'].values())[0]
            grouping[v].append(child)
        else:
            new_children.append(child)
            direct_enum.add(child['e'])
    # Add a layer for super enum
    for v, children in grouping.items():
        if v in direct_enum:
            for child in new_children:
                if child['e'] == v:
                    child['cd'] = children
                    child['c'] += len(children)
                    break
        else:
            direct_enum.add(v)
            enum_blob = children[0].copy()  # Shallow copy
            enum_blob['cd'] = children
            enum_blob['l'] = text_format.format_title(v)
            enum_blob['c'] = len(children)
            enum_blob['t'] = 'p'
            del enum_blob['sv']
            new_children.append(enum_blob)
    json_blob['cd'] = new_children
    return json_blob
