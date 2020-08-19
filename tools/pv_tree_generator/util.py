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


class ObsProps(object):
    """represent the properties of a statsVar"""

    def __init__(self, stat_type, mprop, mqual, mdenom, sfactor, name):
        self.stat_type = stat_type
        self.mprop = mprop
        self.mqual = mqual
        self.mdenom = mdenom
        self.sfactor = sfactor
        self.name = name
        self.key = (stat_type, mprop, mqual, mdenom, sfactor)


class PopObsSpec(object):
    """Represents a UI node with multiple statsVars specified in obs_Props"""

    def __init__(self, pop_type, cprops, dpv, name, obs_props):
        self.pop_type = pop_type  # population type, string
        self.cprops = cprops  # properties, list of string
        # constrained property-value pairs, dict{string: string}
        self.dpv = dpv
        self.name = name
        self.prop_all = tuple(sorted(cprops + list(dpv.keys())))
        self.obs_props = obs_props  # list of ObsProps


class StatsVar(object):
    """Represents a StatisticalVariable"""

    def __init__(self, pop_type, mprop, stats, mqual, mdenom, sfactor, pv, dcid, se):
        self.pop_type = pop_type  # population_type
        self.mprop = mprop  # measured property
        self.stats = stats  # stat_type
        self.mqual = mqual  # measurement qualifier
        self.pv = pv  # constraint property-value pairs, dict{string: string}
        self.dcid = dcid
        self.key = (pop_type, stats, mprop, mqual, mdenom,
                    sfactor) + tuple(sorted(list(pv.keys())))
        self.se = se

    def match_ui_node(self, ui_node):
        # check if the statistical variable should be under the ui_node
        pospec = ui_node.pop_obs_spec
        if set(self.pv.keys()) != set(pospec.prop_all):
            return False
        if not pospec.dpv.items() <= self.pv.items():
            return False
        if not ui_node.pv.items() <= self.pv.items():
            return False
        return True


class UiNode:
    """Class holds the data of a node in the pv menu tree. """

    def __init__(self, pop_obs_spec, obs_props, pv, is_prop, prop=None):
        self.pop_obs_spec = pop_obs_spec  # pop_obs_spec for this node.
        self.obs_props = obs_props  # the Ui node represent one ObsProps
        self.is_prop = is_prop  # is the node a "Property" or a "Value" node.
        self.prop = prop  # the property it represents
        self.pv = pv  # ordered dict of property-value this node inherits
        # from its parent.
        self.key = tuple([pop_obs_spec.pop_type]) + \
            obs_props.key + pop_obs_spec.prop_all

    @property
    def pop_type(self):
        return self.pop_obs_spec.pop_type

    @property
    def mprop(self):
        return self.obs_props.mprop

    @property
    def stats(self):
        return self.obs_props.stat_type

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
            if self.obs_props.name:
                return self.obs_props.name
            elif self.prop:
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
    # POS_COMMON_PATH = "./test.textproto"
    pop_obs_spec_list = stat_config_pb2.PopObsSpecList()

    with open(POS_COMMON_PATH, 'r') as file_common:
        data_common = file_common.read()
    text_format.Parse(data_common, pop_obs_spec_list)

    result = collections.defaultdict(lambda: collections.defaultdict(list))
    for pos in pop_obs_spec_list.spec:
        dpv = {}
        for pv in pos.dpv:
            dpv[pv.prop] = pv.val
        obs_props = []
        for obs in pos.obs_props:
            obs_props.append(ObsProps(obs.stat_type, obs.mprop,
                                      obs.mqual, obs.mdenom, obs.sfactor, obs.name))
        # handle the old specs
        if not pos.obs_props:
            obs_props.append(
                ObsProps(pos.stat_type, pos.mprop, "", "", "", ""))
        for v in pos.vertical:
            result[v][len(pos.cprop)].append(PopObsSpec(
                pos.pop_type, list(pos.cprop), dpv, pos.name, obs_props))
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
    # sv_dcid = ["Count_Person","GrowthRate_Amount_EconomicActivity_GrossDomesticProduction", "Amount_EconomicActivity_GrossDomesticProduction_Nominal", "Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity",
    # "Count_Person_Upto5Years", "Count_CriminalActivities_Arson", "Count_CriminalActivities_ViolentCrime",
    # "Count_CriminalActivities_AggravatedAssault", "Count_CycloneEvent", "Count_EarthquakeEvent", "Count_FloodEvent",
    # "Count_EarthquakeEvent_M3To4", "Count_CycloneEvent_ExtratropicalCyclone", "Count_Person_EnrolledInGrade1ToGrade4", "Count_Person_EnrolledInGrade5ToGrade8", "Count_Person_EducationalAttainmentNoSchoolingCompleted","Count_Person_EducationalAttainmentNurserySchool", "Count_Person_EducationalAttainmentKindergarten"]
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
        sv = StatsVar(sv_dict["populationType"], sv_dict["measuredProperty"],
                      sv_dict["statType"], sv_dict["measurementQualifier"], sv_dict["measurementDenominator"], sv_dict["scalingFactor"], prop_val, dcid, se)
        stat_vars[sv.key].append(sv)
    stat_vars = removeDuplicateStatsVar(stat_vars)
    return stat_vars
