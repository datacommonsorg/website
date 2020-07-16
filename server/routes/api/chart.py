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

"""This module defines the routes for retrieving chart config and metadata.

The client side will request chart configuration including chart type,
statistical variables, etc. from endpoints in this module.
"""

import copy
import json
import urllib

from flask import Blueprint, current_app, url_for

from cache import cache
from routes.api.stats import get_stats_url_fragment
from routes.api.place import statsvars


# Define blueprint
bp = Blueprint(
    "api_chart",
    __name__,
    url_prefix='/api/chart'
)


# Temporary hack before we clean up place stats var cache.
MAPPING = {
    "Count_Person": "TotalPopulation",
    "Count_Person_Male": "MalePopulation",
    "Count_Person_Female": "FemalePopulation",
    "Count_Person_MarriedAndNotSeparated": "MarriedPopulation",
    "Count_Person_Divorced": "DivorcedPopulation",
    "Count_Person_NeverMarried": "NeverMarriedPopulation",
    "Count_Person_Separated": "SeparatedPopulation",
    "Count_Person_Widowed": "WidowedPopulation",
    "Median_Age_Person": "MedianAge",
    "Median_Income_Person": "MedianIncome",
    "Count_Person_BelowPovertyLevelInThePast12Months": "BelowPovertyLine",
    "Count_HousingUnit": "HousingUnits",
    "Count_Household": "Households",
    "Count_CriminalActivities_CombinedCrime": "TotalCrimes",
    "UnemploymentRate_Person": "UnemploymentRate",
    "CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase": "NYTCovid19CumulativeCases",
    "CumulativeCount_MedicalConditionIncident_COVID_19_PatientDeceased": "NYTCovid19CumulativeDeaths",
    "IncrementalCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase": "NYTCovid19IncrementalCases",
    "IncrementalCount_MedicalConditionIncident_COVID_19_PatientDeceased": "NYTCovid19IncrementalDeaths"
}


def filter_charts(charts, all_stats_vars):
    """Filter charts from template specs based on statsitical variable.

    The input charts might have statistical variables that do not exist in the
    valid statstical variable set for a given place. This function filters and
    keep the ones that are valid.

    Args:
        charts: An array of chart specs.
        all_stats_vars: All valid statistical variable that can be used.

    Returns:
        An array of chart specs that could be used.
    """
    result = []
    for chart in charts:
        chart_copy = copy.copy(chart)
        chart_copy['statsVars'] = [
            x for x in chart['statsVars']
            if x in all_stats_vars or MAPPING.get(x, '') in all_stats_vars]
        if chart_copy['statsVars']:
            result.append(chart_copy)
    return result


def build_url(dcid, stats_vars, stats_var_info):
    anchor = "&ptpv="
    parts = []
    for stats_var in stats_vars:
        parts.append(stats_var_info[stats_var])
    anchor += '__'.join(parts)
    anchor += '&place=' + dcid
    return urllib.parse.unquote(url_for('tools.timeline', _anchor=anchor))


@bp.route('/config/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def config(dcid):
    """
    Get chart config for a given place.
    """
    all_stats_vars = set(statsvars(dcid))
    # Build the chart config by filtering the source configuration based on
    # available statistical variables.
    cc = []
    for src_section in current_app.config['CHART_CONFIG']:
        target_section = {
            "label": src_section["label"],
            "charts": filter_charts(
                src_section.get('charts', []), all_stats_vars),
            "children": []
        }
        for child in src_section.get('children', []):
            child_charts = filter_charts(child['charts'], all_stats_vars)
            if child_charts:
                target_section['children'].append({
                    'label': child["label"],
                    'charts': child_charts
                })
        if target_section['charts'] or target_section['children']:
            cc.append(target_section)

    # Gather all stats vars within the final chart config
    used_stats_vars = set()
    for section in cc:
        for chart in section['charts']:
            used_stats_vars.update(set(chart['statsVars']))
        for child in section['children']:
            for chart in child['charts']:
                used_stats_vars.update(set(chart['statsVars']))

    # Get the stats var info, ie, the partial url used for GNI.
    stats_var_info = get_stats_url_fragment(list(used_stats_vars))

    # Population the GNI url to each chart.
    for i in range(len(cc)):
        # Populate gni url for charts
        for j in range(len(cc[i]['charts'])):
            cc[i]['charts'][j]['exploreUrl'] = build_url(
                dcid, cc[i]['charts'][j]['statsVars'], stats_var_info)
        # Populate gni url for children
        for j in range(len(cc[i].get('children', []))):
            for k in range(len(cc[i]['children'][j]['charts'])):
                cc[i]['children'][j]['charts'][k]['exploreUrl'] = build_url(
                    dcid,
                    cc[i]['children'][j]['charts'][k]['statsVars'],
                    stats_var_info
                )
    return json.dumps(cc)
