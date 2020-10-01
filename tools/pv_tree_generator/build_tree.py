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

from itertools import chain, combinations
from typing import Dict, List, Iterator
from util import PopObsSpec, StatsVar, read_pop_obs_spec, read_stat_var
import collections
import text_format
from constants import VERTICALS
import copy


def get_root_children(pop_obs_spec_all, stats_vars_all) -> List['ValueNode']:
    """Returns the list of vertical nodes, such as "Demographics", "Economics".
    """
    valueNodes = []
    for vertical in pop_obs_spec_all:
        # leaf nodes of each vertical,
        # e.g.: Count_Person, Median_Age_Person are leafs of "Demographics"
        leafs = []
        for pos in pop_obs_spec_all[vertical][0]:
            key = tuple([pos.pop_type]) + \
                pos.obs_props[0].key + pos.prop_all
            # List of statsVars matches to the leaf node
            matching_statsVar = []
            for stats_var in stats_vars_all[key]:
                if pos.dpv == stats_var.pv:
                    matching_statsVar.append(stats_var)
            if matching_statsVar:
                leafs.append(
                    ValueLeaf(get_root_leaf_name(pos, matching_statsVar),
                              [sv.dcid for sv in matching_statsVar], True, pos,
                              [], stats_vars_all))
        # property specs that is children of the value node for building
        # the next level of the tree
        props = []
        for pos in pop_obs_spec_all[vertical][1]:
            props.append((pos.cprops[0], pos))
        valueNodes.append(
            ValueNode(vertical, leafs, props, None, pop_obs_spec_all[vertical],
                      stats_vars_all))
    return valueNodes


def get_root_leaf_name(pos: PopObsSpec, stats_vars: List[StatsVar]):
    """ Get the name of the leaf nodes of verticals, e.g.: Count_Person"""
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


class ValueLeaf:
    """ A leaf node is represents a statsVar, unless there're duplicated ones.
        A leaf node can either create a new level nodes under the
        value node, or shown as the value node on the ui.
    """

    def __init__(self, name: str, dcids: List[str], addLevel: bool,
                 pos: PopObsSpec, leafs: 'ValueLeaf', stats_vars_all):
        # when there's both super enum and multiple obs_props,
        # the Value leaf has its child leafs
        self.name = name
        self.dcids = dcids
        self.addLevel = addLevel
        self.pop_type = pos.pop_type
        self.leafs = leafs
        self.pos = pos
        self.stats_vars_all = stats_vars_all

    def json_blob(self, cpvs: Dict[str, str]):
        result = {
            'populationType': self.pop_type,
            'sv': self.dcids,
            'l': text_format.format_title(self.name),
            't': 'v',
            'e': self.name,
            'c': 1,
            'cd': [],
            'sv_set': set(self.dcids),
        }
        for node in self.leafs:
            if node.addLevel:
                result['cd'].append(node.json_blob(cpvs))
            else:
                # add the statsVar dcids to the value ndoe
                result['sv'].extend(node.dcids)
            result['sv_set'].update(node.dcids)
        if not result['sv']:
            result['t'] = 'p'
        if result['cd']:
            result['cd'] = text_format.filter_and_sort(self.name, result['cd'])
        if result['t'] == 'v':
            result['d'] = find_denominators(self.pos, cpvs, self.stats_vars_all,
                                            result['sv'])

        return result


def powerset(iterable: List) -> Iterator:
    """Returns all subsets of a set.

    powerset([1,2,3]) --> () (1,) (2,) (3,) (1,2) (1,3) (2,3) (1,2,3)
    https://docs.python.org/3/library/itertools.html#itertools-recipes
    """
    s = list(iterable)
    return chain.from_iterable(combinations(s, r) for r in range(len(s) + 1))


def find_denominators(pop_obs: PopObsSpec, cpvs: Dict[str, str],
                      stats_vars_all: Dict[str, List[StatsVar]],
                      stats_vars_to_exclude: List[str]) -> List[str]:
    """Finds possible StatVars that can be used as per capita denominators for
    a StatVar.

    The dpvs of "pop_obs" and "cpvs" are combined to form the final pv mapping.
    A denominator is included if its pvs are a subset of the final pv mapping.
    E.g., if dpvs is {'age': '15YearsOnwards'} and cpvs is {'gender': 'female'},
    the denominators are 'Count_Person', 'Count_Person_Female',
    'Count_Person_15OrMoreYears', and 'Count_Person_Female_15OrMoreYears'.

    Args:
        pop_obs: Population measured by the StatVar.
        cpvs: Constraint property-value pairs from the root to the
            node with "pop_obs".
        stats_vars_all: Mapping from keys to candidate StatVars.
        stats_vars_to_exclude: StatVars to exclude from the answer.
    """
    denominators = set()
    pvs_merged = {**pop_obs.dpv, **cpvs}
    pv_key_subsets = list(
        tuple(sorted(subset)) for subset in powerset(pvs_merged.keys()))
    for obs_prop in pop_obs.obs_props:
        # This key should capture denominators with out PVs
        matching_statvars = tuple()
        for subset in pv_key_subsets:
            key = (pop_obs.pop_type,) + obs_prop.key + subset
            matching_statvars += tuple(stats_vars_all.get(key, ()))
        for sv in matching_statvars:
            if (set(sv.pv.items()) <= set(pvs_merged.items()) and
                    sv.dcid not in stats_vars_to_exclude):
                denominators.add(sv.dcid)
    return list(sorted(denominators))


class PropertyNode:
    """ Represent a property node in the PV tree
        Each Property node has a group of value nodes as childen.
        A value node can have a level of leaf nodes or
        a group of new properties as its children.
    """

    def __init__(self, pos: PopObsSpec, parent_pvs: Dict[str, str],
                 new_prop: str, level: int, pop_obs_spec, stats_vars_all):
        # the property value pairs inherited from the parent nodes
        self.pv = parent_pvs
        self.pos = pos  # the pob_obs_spec the node represents
        self.prop = new_prop  # the new property the node represents
        self.level = level
        self.pop_obs_spec = pop_obs_spec
        self.stats_vars_all = stats_vars_all

    def children(self) -> List['ValueNode']:
        """ Returns a list of value nodes as the children of the property node.
        """
        # Add a new level if more than one statsVar observation properties
        # are defined in the pop_obs_spec
        addLevel = (len(self.pos.obs_props) > 1)
        # get the dictionary of the property value to leaf nodes
        matching_stats_vars = collections.defaultdict(list)
        for idx in range(len(self.pos.obs_props)):
            key = tuple([self.pos.pop_type]) + \
                self.pos.obs_props[idx].key + self.pos.prop_all
            for sv in self.stats_vars_all[key]:
                if (self.pos.dpv.items() <= sv.pv.items() and
                        self.pv.items() <= sv.pv.items()):
                    # matching statsVar found
                    if not sv.se or self.prop not in sv.se:  # no super enum
                        # create a new level if
                        # the obs_prop is not specified as the same level
                        # and there's more than one obs_prop
                        matching_stats_vars[sv.pv[self.prop]].append(
                            ValueLeaf(self.pos.obs_props[idx].name, [sv.dcid],
                                      (addLevel and
                                       not self.pos.obs_props[idx].same_level),
                                      self.pos, [], self.stats_vars_all))
                    else:  # create new level for super enum
                        if (addLevel and
                                not self.pos.obs_props[idx].same_level):
                            # This handles the case of super enum
                            # with multiple obs_props. We create a leaf node
                            # of super enum, and add the statsVars of each
                            # obs_props as the eafs of the super enum
                            sv_added = False
                            for se_leaf in matching_stats_vars[sv.se[
                                    self.prop]]:
                                if se_leaf.name == sv.pv[self.prop]:
                                    # if the super enum exists
                                    se_leaf.leafs.append(
                                        ValueLeaf(self.pos.obs_props[idx].name,
                                                  [sv.dcid], True, self.pos, [],
                                                  self.stats_vars_all))
                                    sv_added = True
                            if not sv_added:
                                # if the super enum does not exist
                                # create the super enum leaf and its child
                                se_leaf = ValueLeaf(sv.pv[self.prop], [], True,
                                                    self.pos, [],
                                                    self.stats_vars_all)
                                se_leaf.leafs.append(
                                    ValueLeaf(self.pos.obs_props[idx].name,
                                              [sv.dcid], True, self.pos, [],
                                              self.stats_vars_all))
                                matching_stats_vars[sv.se[self.prop]].append(
                                    se_leaf)
                        else:
                            # there's no additional level under super enum
                            matching_stats_vars[sv.se[self.prop]].append(
                                ValueLeaf(sv.pv[self.prop], [sv.dcid], True,
                                          self.pos, [], self.stats_vars_all))

        # create a list of value Nodes
        value_nodes = []
        child_props = self.child_props()
        for value in matching_stats_vars:
            value_nodes.append(
                ValueNode(value, matching_stats_vars[value], child_props, self,
                          self.pop_obs_spec, self.stats_vars_all))
        return value_nodes

    def child_props(self):
        """ Returns a list of new prop and
            corresponding specs for building the next level"""
        child_pos = []
        for c_pos in self.pop_obs_spec[self.level + 1]:
            if (self.pos.pop_type == c_pos.pop_type and
                    set(self.pos.cprops) < set(c_pos.cprops)):
                newProp = (set(c_pos.cprops) - set(self.pos.cprops)).pop()
                child_pos.append((newProp, c_pos))
        return child_pos

    def json_blob(self):
        """ Generate the json blob for the property node"""
        if self.pos.name:
            name = self.pos.name
        else:
            name = self.prop
        result = {
            'populationType': self.pos.pop_type,
            # mprop is used for top level reorgnize only
            'mprop': self.pos.obs_props[0].mprop,
            'l': text_format.format_title(name),
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
            - a pseudo value node of super enums, such as the node
              "violent" under crimeType
    """

    def __init__(self, value: str, leafs: List[ValueLeaf],
                 child_props: Dict[str, PopObsSpec], parent: 'PropertyNode',
                 pop_obs_spec, stats_vars_all):
        self.value = value
        self.leafs = leafs
        # A list of child properties and corresponding specs
        self.child_props = child_props
        self.parent = parent
        self.pop_obs_spec = pop_obs_spec
        self.stats_vars_all = stats_vars_all

    def children(self):
        """ Return a list of property nodes as the children of the value node.
        """
        propertyNodes = []
        for prop, pos in self.child_props:
            if self.parent:
                level = self.parent.level + 1
                pvs = dict(self.parent.pv)
                pvs[self.parent.prop] = self.value
            else:  # top level
                level = 1
                pvs = {}
            propertyNodes.append(
                PropertyNode(pos, pvs, prop, level, self.pop_obs_spec,
                             self.stats_vars_all))
        return propertyNodes

    def json_blob(self, cpvs: Dict[str, str]):
        """ Generate the json blob of a value node, including the node itself
            and its leaf children. """
        if self.leafs:
            pop_type = self.leafs[0].pop_type
        elif self.parent:
            pop_type = self.parent.pop_type
        else:
            pop_type = ""
        result = {
            'populationType': pop_type,
            'sv': [],
            'l': text_format.format_title(self.value),
            't': 'v',
            'e': self.value,
            'c': 0,
            'sv_set': set([]),
            'cd': [],
        }
        for node in self.leafs:
            if node.addLevel:
                result['cd'].append(node.json_blob(cpvs))
            else:
                # add the statsVar dcids to the value ndoe
                result['sv'].extend(node.dcids)
            result['sv_set'].update(node.dcids)
        if not result['sv']:
            result['t'] = 'p'
        if result['cd']:
            result['cd'] = text_format.filter_and_sort(self.value, result['cd'])
        if result['t'] == 'v':
            result['d'] = []
            if self.parent:
                result['d'] = find_denominators(self.parent.pos, cpvs,
                                                self.stats_vars_all,
                                                result['sv'])
        return result


def build_tree(max_level):
    """ Build the tree from root level"""
    pop_obs_spec = read_pop_obs_spec()
    stats_vars = read_stat_var()
    data = {}
    vertical_nodes = get_root_children(pop_obs_spec, stats_vars)
    vertical_nodes.sort(key=lambda node: VERTICALS.index(node.value))
    for vertical in vertical_nodes:
        current_blob = vertical.json_blob({})
        # build the vertical nodes blobs
        data[vertical.value] = current_blob
        # get the property nodes of each vertical
        prop_nodes = vertical.children()
        for node in prop_nodes:
            # build property node blobs
            prop_blob = build_tree_recursive(node, max_level)
            if (prop_blob['cd']):
                current_blob['cd'].append(prop_blob)
        reorgnize(current_blob)

    stats_var_path = {}
    for v in data:
        post_process(data[v], [VERTICALS.index(v)], stats_var_path)
        del data[v]['sv_set']
    return data, stats_var_path


def build_tree_recursive(node: PropertyNode,
                         max_level,
                         cpvs: Dict[str, str] = {}):
    """ Build a property node and its children recusively
        until the maximum level."""
    result = node.json_blob()  # build the property node blobs
    value_nodes = node.children()  # get the child value nodes
    for value in value_nodes:
        # build the child value node blobs
        value_blob = value.json_blob(cpvs)
        result['cd'].append(value_blob)
        prop_children = value.children()
        cpvs_new = dict(cpvs)
        cpvs_new[node.prop] = value.value
        if node.level < max_level:
            for prop in prop_children:
                # build the next level
                prop_blob = build_tree_recursive(prop, max_level, cpvs_new)
                if (prop_blob['cd']):
                    value_blob['cd'].append(prop_blob)
    result['cd'] = text_format.filter_and_sort(node.prop, result['cd'])
    return result


def post_process(root, path, statsvar_path):
    """ After the tree is built, this function:
        - removes the unused fields such as "population Type" in the tree
        - count the number of statsVars under each node
        - create a map of the statsVar dcid and one of its path in the tree
    """
    # Build the map from statsVar dcid to its path in the tree
    # The path is a list of numbers,
    # e.g. path of Count_Person_Upto5Years is [0, 3, 0].
    # It means its path is Oth node ("Demographics") -> 3rd node ("Age")
    # -> 0th node ("Less than 5 Years").
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
    """ Move certain property nodes as child of certain leaf nodes"""
    target_leaf_node = {}
    target_property_node = collections.defaultdict(list)
    # find the target leaf nodes and property nodes
    for node in vertical['cd']:
        if node["populationType"] in [
                'EarthquakeEvent', 'CycloneEvent', 'MortalityEvent'
        ]:
            if node['t'] == 'p' and node['mprop'] == 'count':
                target_property_node[node['populationType']].append(node)
            if node['t'] == 'v':
                target_leaf_node[node['populationType']] = node
    # set the property nodes as children of corresponding leaf nodes
    for pop_type in target_leaf_node:
        leaf = target_leaf_node[pop_type]
        for node in target_property_node[pop_type]:
            leaf['cd'].append(node)
            vertical['cd'].remove(node)
    # move certain leaf node as the child of certain top level property node
    target_leaf = None
    target_property = None
    for node in vertical['cd']:
        if node['t'] == 'v' and node['sv'] == [
                'CumulativeCount_Person_COVID19PCRTest'
        ]:
            target_leaf = node
        if node['t'] == 'p' and node['l'] == "Medical Tests":
            target_property = node
    if target_property and target_leaf:
        target_property['cd'].append(target_leaf)
        vertical['cd'].remove(target_leaf)
    return


def get_top_level(data):
    """ Create a smaller copy of the tree that only contains the top level"""
    top = copy.deepcopy(data)
    for v in top:
        remove_children(top[v], 0, 1)
    return top


def remove_children(root, cur_level, max_level):
    """ Remove the children at level > max_level """
    if 'cd' in root:
        if cur_level >= max_level:
            del root['cd']
        else:
            for node in root['cd']:
                remove_children(node, cur_level + 1, max_level)
    return
