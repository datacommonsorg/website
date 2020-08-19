from typing import Dict, List, Tuple
from util import PopObsSpec, StatsVar, _read_pop_obs_spec, _read_stat_var
import collections
import text_format
from constants import VERTICALS
import copy
POP_OBS_SPEC = _read_pop_obs_spec()
STATS_VARS = _read_stat_var()

class Root:
    """The root node for all the verticals"""

    def children(self) -> List['ValueNode']:
        """Returns a list of value nodes, i.e. the verticals such as "Demographics", "Economics" """
        valueNodes = []
        for vertical in POP_OBS_SPEC:
            leafs = []  # leaf nodes of each vertical, e.g.: Count_Person, Median_Age_Person are leafs of "Demographics"
            for pos in POP_OBS_SPEC[vertical][0]:
                key = tuple([pos.pop_type]) + \
                    pos.obs_props[0].key + pos.prop_all
                matching_statsVar = []  # List of statsVars matches to the leaf node
                for stats_var in STATS_VARS[key]:
                    if pos.dpv == stats_var.pv:
                        matching_statsVar.append(stats_var)
                if matching_statsVar:
                    leafs.append(valueLeaf(self.getName(pos, matching_statsVar), [
                                 sv.dcid for sv in matching_statsVar], True, pos))
            # property specs that is children of the value node for building the next level of the tree
            props = {}
            for pos in POP_OBS_SPEC[vertical][1]:
                props[pos.cprops[0]] = pos
            valueNodes.append(ValueNode(vertical, leafs, props, None))
        return valueNodes

    def getName(self, pos, stats_vars):
        # get the name of the node
        if pos.obs_props[0].name:
            name = pos.obs_props[0].name
        elif pos.name:
            name = pos.name
        else:
            stats = ''
            if stats_vars[0].stats != 'measuredValue':
                stats = stats_vars[0].stats.replace('Value', '')
            name = '{} {}'.format(stats, stats_vars[0].mprop)
        return name


class PropertyNode:
    """ Represent a property node in the PV tree
        Each Property node has a group of value nodes as childen.
        A value node can have a level of leaf nodes or a group of new properties as its children.
    """

    def __init__(self, pos: PopObsSpec, parent_pvs: Dict[str, str], new_prop: str, vertical: str, level: int):
        self.pv = parent_pvs  # the property value pairs inherited from the parent nodes
        self.pos = pos  # the pob_obs_spec the node represents
        self.prop = new_prop  # the new property the node represents
        self.vertical = vertical
        self.level = level

    def children(self) -> List['ValueNode']:
        """returns a list of value nodes as the children of the property node"""
        # a new level if more than one statsVar observation properties are defined in the pop_obs_spec
        addLevel = (len(self.pos.obs_props) > 1)
        # get the dictionary of the property value to leaf nodes
        matching_stats_vars = collections.defaultdict(list)
        for idx in range(len(self.pos.obs_props)):
            key = tuple([self.pos.pop_type]) + \
                self.pos.obs_props[idx].key + self.pos.prop_all
            for sv in STATS_VARS[key]:
                if (self.pos.dpv.items() <= sv.pv.items() and
                        self.pv.items() <= sv.pv.items()):
                    # matching statsVar found
                    if not sv.se or self.prop not in sv.se:  # no super enum
                        matching_stats_vars[sv.pv[self.prop]].append(
                            valueLeaf(self.pos.obs_props[idx].name, [sv.dcid], addLevel, self.pos))
                    else:  # create new level for super enum
                        matching_stats_vars[sv.se[self.prop]].append(
                            valueLeaf(sv.pv[self.prop], [sv.dcid], True, self.pos))

        # create a list of value Nodes
        value_nodes = []
        for value in matching_stats_vars:
            value_nodes.append(
                ValueNode(value, matching_stats_vars[value], self.child_props(), self))
        return value_nodes

    def child_props(self):
        """returns the dict of new prop and corresponding specs for building the next level"""
        child_pos = collections.defaultdict(list)
        for c_pos in POP_OBS_SPEC[self.vertical][self.level+1]:
            if (self.pos.pop_type == c_pos.pop_type and
                    set(self.pos.cprops) < set(c_pos.cprops)):
                newProp = (set(c_pos.cprops) - set(self.pos.
                                                   cprops)).pop()
                child_pos[newProp] = c_pos
        return child_pos

    def json_blob(self):
        """generate the json blob for the property node"""
        if self.pos.name:
            name = self.pos.name
        else:
            name = self.prop
        result = {
            'populationType': self.pos.pop_type,
            # used for top level reorgnize only
            'mprop': self.pos.obs_props[0].mprop,
            'l': text_format.format_title(name),
            'e': name,
            't': 'p',
            'c': 0,
            'cd': [],
            'sv_set': set(),
        }
        return result


class ValueNode:
    """ Represent a value node in the PV tree
        The value node can be 
            - a real value node representing a statsVar
            - the node of a vertical, such as the node "Demographics"
            - a psudo value node of super enums, such as the node "violent" under crimeType
    """

    def __init__(self, value: str, leafs: List['valueLeaf'], child_props: Dict[str, PopObsSpec], parent: 'PropertyNode'):
        self.value = value
        self.leafs = leafs
        self.child_props = child_props  # A list of child properties and corresponding specs
        self.parent = parent

    def children(self):
        """return a list of property nodes as the children of the value node"""
        propertyNodes = []
        for prop in self.child_props:
            if self.parent:
                vertical = self.parent.vertical
                level = self.parent.level + 1
                pvs = dict(self.parent.pv)
                pvs[self.parent.prop] = self.value
            else:  # top level
                vertical = self.value
                level = 1
                pvs = {}
            propertyNodes.append(PropertyNode(
                self.child_props[prop], pvs, prop, vertical, level))
        return propertyNodes

    def json_blob(self):
        """generate the json blob of a value node, including the node itself and its leaf children"""
        if self.leafs:
            pop_type = self.leafs[0].pop_type
        elif self.parent:
            pop_type = self.parent.pop_type
        else:
            pop_type = ""
        result = {
            'populationType': pop_type,
            'l': text_format.format_title(self.value),
            't': 'v',
            'e': self.value,
            'c': 0,
            'sv_set': set([]),
            'cd': [],
            'sv': []
        }
        for node in self.leafs:
            if node.addLevel:
                value_blob = {
                    'populationType': node.pop_type,
                    'l': text_format.format_title(node.name),
                    't': 'v',
                    'e': node.name,
                    'c': 1,
                    'cd': [],
                    'sv': node.dcids,
                    'sv_set': set(node.dcids)
                }
                result['cd'].append(value_blob)
            else:
                result['sv'].extend(node.dcids)
            result['sv_set'].update(node.dcids)
        if not result['sv']:
            result['t'] = 'p'
        return result


class valueLeaf:
    def __init__(self, name, dcids, addLevel, pos):
        self.name = name
        self.dcids = dcids
        self.addLevel = addLevel
        self.pop_type = pos.pop_type


def build_tree(max_level):
    data = {}
    vertical_nodes = Root().children()
    vertical_nodes.sort(key=lambda node: VERTICALS.index(node.value))
    for vertical in vertical_nodes:
        current_blob = vertical.json_blob()
        data[vertical.value] = current_blob  # build the vertical nodes blobs
        prop_nodes = vertical.children()  # get the property nodes of each vertical
        for node in prop_nodes:
            # build property node blobs
            prop_blob = build_tree_recursive(node, max_level)
            current_blob['cd'].append(prop_blob)
        reorgnize(current_blob) 

    stats_var_path = {}
    for v in data:
        post_process(data[v], [VERTICALS.index(v)], stats_var_path)
        del data[v]['sv_set']
    return data, stats_var_path


def build_tree_recursive(node: PropertyNode, max_level):
    result = node.json_blob()  # build the property node blobs
    value_nodes = node.children()  # get the child value nodes
    for value in value_nodes:
        # build the child value node blobs
        value_blob = value.json_blob()
        result['cd'].append(value_blob)
        prop_children = value.children()
        if node.level < max_level:
            for prop in prop_children:
                # build the next level
                prop_blob = build_tree_recursive(prop, max_level)
                value_blob['cd'].append(prop_blob)
    result['cd'] = text_format.filter_and_sort(node.prop, result['cd'], False)
    return result


def post_process(root, path, statsvar_path):
    """process the built tree"""
    # build the map from statsVar dcid to its path in the tree
    if root['t'] == 'v':
        for sv in root['sv']:
            statsvar_path[sv] = path 
    # remove unused fields
    if 'populationType' in root:
        del root['populationType']
    if 'mprop' in root:
        del root['mprop']
    # recurse
    if 'cd' in root:
        idx = 0
        for node in root['cd']:
            # build the path
            nextPath = path + [idx]
            post_process(node, nextPath, statsvar_path)
            idx += 1
            # update the sv_set for counting
            root['sv_set'].update(node['sv_set'])
            del node['sv_set']
    # update the count
    root['c'] = len(root['sv_set']) 
    return root, statsvar_path

def reorgnize(vertical):
    """move certain property nodes as child of certain leaf nodes"""
    target_leaf_node = {}
    target_property_node = collections.defaultdict(list)
    # find the target leaf nodes and property ndoes
    for node in vertical['cd']:
        if node["populationType"] in ['EarthquakeEvent', 'CycloneEvent',
                                      'MortalityEvent']:
            if node['t'] == 'p' and node['mprop'] == 'count':
                target_property_node[node['populationType']].append(node)
            if node['t'] == 'v':
                target_leaf_node[node['populationType']] = node
    # set the property nodes as child of corresponding leaf nodes
    for pop_type in target_leaf_node:
        leaf = target_leaf_node[pop_type]
        for node in target_property_node[pop_type]:
            leaf['cd'].append(node)
            vertical['cd'].remove(node)
    return
