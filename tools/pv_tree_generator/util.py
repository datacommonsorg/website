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
    """represent the properties of a statsVar observation"""

    def __init__(self, stat_type, mprop, mqual, mdenom, name, same_level):
        self.stat_type = stat_type
        self.mprop = mprop
        self.mqual = mqual
        self.mdenom = mdenom
        self.name = name
        self.key = (stat_type, mprop, mqual, mdenom)
        self.same_level = same_level # the statsVar is at the same level 
        # as the value node


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

    def __init__(self, pop_type, mprop, stats, mqual, mdenom, pv, dcid, se):
        self.pop_type = pop_type  # population_type
        self.mprop = mprop  # measured property
        self.stats = stats  # stat_type
        self.mqual = mqual  # measurement qualifier
        self.pv = pv  # constraint property-value pairs, dict{string: string}
        self.dcid = dcid
        self.key = (pop_type, stats, mprop, mqual, mdenom) + \
            tuple(sorted(list(pv.keys())))
        self.se = se  # super enum


def read_pop_obs_spec():
    """Read pop obs spec from the config file."""
    result = collections.defaultdict(lambda: collections.defaultdict(list))
    # Read pop_obs_specs with multiple obs_props
    POS_OBS_PROPS_PATH = "./pop_obs_spec_common.textproto"
    pop_obs_spec_list = stat_config_pb2.PopObsSpecList()
    with open(POS_OBS_PROPS_PATH, 'r') as file_common:
        data_common = file_common.read()
    text_format.Parse(data_common, pop_obs_spec_list)
    # create pop_obs_specs objects
    for pos in pop_obs_spec_list.spec:
        dpv = {}
        for pv in pos.dpv:
            dpv[pv.prop] = pv.val
        obs_props = []
        for obs in pos.obs_props:
            obs_props.append(ObsProps(obs.stat_type, obs.mprop,
                                      obs.mqual, obs.mdenom, obs.name, 
                                      obs.same_level))
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


def read_stat_var():
    """ Read all the statistical variables """
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
    # trunk statsVar dcids into smaller size and
    # get the triples
    trunk_size = 10000
    n_trunk = len(sv_dcid)//trunk_size
    sv_triples = {}
    for i in range(n_trunk+1):
        if i == n_trunk:
            trunk_triples = dc.get_triples(sv_dcid[i*trunk_size:])
            sv_triples.update(trunk_triples)
        else:
            trunk_triples = dc.get_triples(
                sv_dcid[i*trunk_size:(i+1)*trunk_size])
            sv_triples.update(trunk_triples)
    # group all the statsVars according to the triples
    stat_vars = collections.defaultdict(list)
    for dcid, triples in sv_triples.items():
        constraint_properties = []
        # sv_dict keeps all the triples of the statsVar
        sv_dict = collections.defaultdict(str)
        for dcid_, prop, val in triples:
            if dcid_ != dcid:
                # triples include measurementDenomator info of other statsvars
                # eg. we will get "dc/gywfwwmg5gsrg, measurementDenominator,
                # Count_Person" in triples of "Count_Peron"
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
        # create super enum, i.e. group statsvars with different p-v pairs:
        # (p,v1); (p,v2) by adding a common value: (p, v),
        # so that v1, v2 would be leaf nodes for value node v;
        se = {}
        if 'crimeType' in prop_val:
            v = prop_val.get('crimeType', '')
            if v in ['AggravatedAssault', 'ForcibleRape', 'Robbery',
                     'MurderAndNonNegligentManslaughter']:
                se = {'crimeType': 'ViolentCrime'}
            elif v in ['MotorVehicleTheft', 'LarcenyTheft', 'Burglary']:
                se = {'crimeType': 'PropertyCrime'}
        if 'testResult' in prop_val:
            v = prop_val.get('testResult', '')
            if v in ['Negative', 'Positive', 'Ready']:
                se = {'testResult': 'TestResult'}
        if 'medicalStatus' in prop_val:
            v = prop_val.get('medicalStatus', '')
            if v in ['ConfirmedCase', 'ConfirmedOrProbableCase', 'PatientDeceased',
                    'PatientHospitalized', 'PatientInICU', 'PatientOnVentilator',
                    'PatientRecovered']:
                se = {'medicalStatus': 'PatientStatus'}
        # create the statsVar object
        sv = StatsVar(sv_dict["populationType"],
                      sv_dict["measuredProperty"],
                      sv_dict["statType"],
                      sv_dict["measurementQualifier"],
                      sv_dict["measurementDenominator"],
                      prop_val,
                      dcid,
                      se)
        stat_vars[sv.key].append(sv)
    stat_vars = removeDuplicateStatsVar(stat_vars)
    return stat_vars
