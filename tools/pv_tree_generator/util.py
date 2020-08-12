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
import collections
import stat_config_pb2
import dc_request as dc


class PopObsSpec(object):
    """Represents a StatisticalPopulation & Observation spec."""

    def __init__(self, pop_type, mprop, stats, properties, cpv, name):
        self.pop_type = pop_type  # population type, string
        self.mprop = mprop  # measured property, string
        self.stats = stats  # stat_type, string
        self.properties = properties  # properties, list of string
        # constrained property-value pairs, dict{string: string}
        self.cpv = cpv
        self.name = name
        self.prop_all = tuple(sorted(properties + list(cpv.keys())))
        self.key = (pop_type, mprop, stats) + self.prop_all


class StatVar(object):
    """Represents a StatisticalVariable"""

    def __init__(self, pop_type, mprop, stats, pv, dcid, se):
        self.pop_type = pop_type  # population_type, string
        self.mprop = mprop  # measured property, string
        self.stats = stats  # stat_type, string
        self.pv = pv  # property-value pairs, dict{string: string}
        self.dcid = dcid
        self.key = (pop_type, mprop, stats) + tuple(sorted(list(pv.keys())))
        self.se = se

    def match_ui_node(self, ui_node):
        # check if the statistical variable should be under the ui_node
        pospec = ui_node.pop_obs_spec
        if set(self.pv.keys()) != set(pospec.prop_all):
            return False
        if not pospec.cpv.items() <= self.pv.items():
            return False
        if not ui_node.pv.items() <= self.pv.items():
            return False
        return True


class UiNode:
    """Class holds the data of a node in the pv menu tree. """

    def __init__(self, pop_obs_spec, pv, is_prop, prop=None):
        self.pop_obs_spec = pop_obs_spec  # pop_obs_spec for this node.
        self.is_prop = is_prop  # is the node a "Property" or a "Value" node.
        self.prop = prop  # the property it represents
        self.pv = pv  # ordered dict of property-value this node inherits
        # from its parent.

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


def removeDuplicateStatsVar(stat_vars):
    """chose statsVars with human readable dcids when multiple statsvars 
    have the same triples"""
    for key in stat_vars:
        stat_vars_dup = collections.defaultdict(list)
        # stat_vars_dup stores the statsvars with same triples
        for sv in stat_vars[key]:
            full_key = [sv.pop_type, sv.mprop, sv.stats]
            for prop, val in sv.pv.items():
                full_key.extend([prop, val])
            full_key.sort()
            stat_vars_dup[tuple(full_key)].append(sv)
        for full_key in stat_vars_dup:
            if len(stat_vars_dup[full_key]) > 1:
                # duplicated statsvars found
                human_readable = []
                for sv in stat_vars_dup[full_key]:
                    if sv.dcid[0:3] != "dc/":
                        # found all the human readable ones,
                        # i.e. dcid does not start with dc/
                        human_readable.append(sv)
                if len(human_readable) >= 1:
                    # TEMPORARY: keep all human readable statsvars for now
                    keep = human_readable
                else:
                    keep = [stat_vars_dup[full_key][0]]
                for sv in stat_vars_dup[full_key]:
                    if sv not in keep:
                        # remove other duplicated statsvars
                        stat_vars[sv.key].remove(sv)
    return stat_vars


def _read_stat_var():
    """Read all the statistical variables"""

    sv_dcid = dc.get_sv_dcids()
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
    sv_triples = dc.get_triples(sv_dcid)
    stat_vars = collections.defaultdict(list)
    for dcid, triples in sv_triples.items():
        constraint_properties = []
        # sv_dict keeps all the triples of the statsVar
        sv_dict = collections.defaultdict(str)
        for dcid_, prop, val in triples:
            if dcid_ != dcid:
                # triples include measurementDenomator info of other statsvars
                # eg. we will get "dc/gywfwwmg5gsrg, measurementDenominator, Count_Person"
                # in triples of "Count_Peron"
                continue
            if prop == "constraintProperties":
                constraint_properties.append(val)
            else:
                sv_dict[prop] = val 
        # prop_val keeps all the constraint pv pairs
        prop_val = {}
        for property in constraint_properties:
            if property not in sv_dict:
                raise Exception('constraint property:{} not found in statistical'
                                'variable with dcid: {}'.format(property, dcid))
            prop_val[property] = sv_dict[property]
        # add measurement constraints such as measurementDenominator to prop_val 
        measurementConstraints = ["measurementDenominator", "measurementQualifier"]
        for constraint in measurementConstraints:
            if constraint in sv_dict:
                prop_val[constraint] = sv_dict[constraint]
        # Super enum
        se = {}  
        if 'crimeType' in prop_val:
            v = prop_val.get('crimeType', '')
            if v in ['AggravatedAssault', 'ForcibleRape', 'Robbery',
                     'MurderAndNonNegligentManslaughter']:
                se = {'crimeType': 'ViolentCrime'}
            elif v in ['MotorVehicleTheft', 'LarcenyTheft', 'Burglary']:
                se = {'crimeType': 'PropertyCrime'}
        # create the statsVar object
        sv = StatVar(sv_dict["populationType"], sv_dict["measuredProperty"],
                     sv_dict["statType"], prop_val, dcid, se)
        stat_vars[sv.key].append(sv)
    stat_vars = removeDuplicateStatsVar(stat_vars)
    return stat_vars
