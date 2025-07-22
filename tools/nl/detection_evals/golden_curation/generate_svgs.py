# Copyright 2025 Google LLC
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

import csv
import json
from dataclasses import dataclass
from typing import Dict, List, Set, Tuple

import requests
from absl import app, flags
from utils import QueryInfo, get_hierarchy_format, get_merged_var_str_dict, get_queries

FLAGS = flags.FLAGS

FLAGS = flags.FLAGS

flags.DEFINE_string(
    "input_folder", "input", "The input directory of with files of queries to curate"
)
flags.DEFINE_string(
    "output_folder", "output", "The output directory to save generated embeddings"
)
flags.DEFINE_string(
    "svg_cache",
    "svg_cache.json",
    "file path to a copy of the svg cache generated following instructions at https://g3doc.corp.google.com/datacommons/prophet/tools/README.md#refreshing-statvargroup-cache",
)
_SVG_INDEX = "svg_uae_mem"
_DEFAULT_PLACE = "USA"
_SVG_PREFIX = "dc/g/"
_MAX_SVG_CHILDREN_LEVELS = 3
_NUM_VARS_TO_GET_SVGS_FOR = 25


@dataclass
class SvgCache:
    # keys are sv/svg dcids and values are their parent svgs
    parents: Dict[str, Set[str]]
    # keys are svg dcids and values are their children svgs
    children_svg: Dict[str, Set[str]]


def get_svg_cache(svg_cache_file) -> SvgCache:
    """
    Loads and parses a json file of the svg cache

    Args:
        svg_cache_file (str): Path to the JSON file containing the svg cache.

    Returns:
        SvgCache: An object containing two dictionaries:
            - parents: Maps each SV or SVG DCID to a set of parent SVG DCIDs.
            - children: Maps each SVG DCID to a set of child SVG DCIDs.
    """
    parents = {}
    children = {}
    with open(svg_cache_file, "r") as f:
        svg_cache = json.load(f)
        for svg, svgInfo in svg_cache.get("statVarGroups", {}).items():
            for sv in svgInfo.get("childStatVars", []):
                sv_dcid = sv.get("id", "")
                if not sv_dcid:
                    continue
                if not sv_dcid in parents:
                    parents[sv_dcid] = set()
                parents[sv_dcid].add(svg)
            for child_svg in svgInfo.get("childStatVarGroups", []):
                child_svg_dcid = child_svg.get("id", "")
                if not child_svg_dcid:
                    continue
                if not svg in children:
                    children[svg] = set()
                children[svg].add(child_svg_dcid)
                if not child_svg_dcid in parents:
                    parents[child_svg_dcid] = set()
                parents[child_svg_dcid].add(svg)
    return SvgCache(parents, children)


def get_relevant_svgs(
    var_str: str, var_list: List[str], svg_cache: SvgCache
) -> Set[str]:
    """
    Retrieve a list of relevant SVG identifiers for a variable string. Use the
    list of variable dcids that match the variable string.

    Args:
        var_str (str): The variable string to get svgs for.
        var_list (List[str]): A list of variable dcids that match the variable string.
        svg_cache (SvgCache): An object containing SVG parent and child relationships.

     Returns:
        List[str]: A list of relevant SVG identifiers.
    """
    # Get top _NUM_VARS_TO_GET_SVGS_FOR SVGs based off the top vars
    found_svgs = set()
    for v in var_list:
        if len(found_svgs) >= _NUM_VARS_TO_GET_SVGS_FOR:
            break
        found_svgs.update(svg_cache.parents.get(v, []))
    var_svgs = list(found_svgs)

    # Add all the parents of the var SVGs
    for svg in var_svgs:
        found_svgs.update(svg_cache.parents.get(svg, []))

    # Add all the children of the var SVGs
    for svg in var_svgs:
        found_svgs.update(
            [
                g
                for g in svg_cache.children_svg.get(svg, [])
                if g.startswith(_SVG_PREFIX)
            ]
        )

    # Call NL API to get more relevant SVGs
    request_query = f"{var_str} {_DEFAULT_PLACE}"
    nl_response = requests.post(
        f"http://localhost:8080/api/explore/detect?q={request_query}&idx={_SVG_INDEX}",
        json={},
        timeout=None,
    )
    found_svgs.update(
        nl_response.json()
        .get("debug", {})
        .get("counters", {})
        .get("INFO", {})
        .get("filtered_svs", [[]])[0]
    )
    return found_svgs


def get_svgs_for_var_strs(
    merged_var_str_to_vars: Dict[str, List[str]], svg_cache: SvgCache
) -> Tuple[Dict[str, List[str]], List[str]]:
    """
    For a set of variable strings, get the possible svgs that they could each fall under.

    Args:
        merged_var_str_to_vars (Dict[str, List[str]]): A dictionary mapping variable strings
            to sets of variable names.
        svg_cache (SvgCache): An object used to cache and retrieve SVG representations.

     Returns:
        Tuple[Dict[str, List[str]], List[str]]: A tuple containing:
            - A dictionary mapping each variable string to a list of formatted SVG strings.
            - A list of variable strings for which SVG retrieval failed.
    """
    svgs = {}
    errors = []
    for var_str, vars in merged_var_str_to_vars.items():
        try:
            svg_set = get_relevant_svgs(var_str, list(vars), svg_cache)
        except Exception as e:
            errors.append(var_str)
            print(e)
            continue
        formatted_svgs, _ = get_hierarchy_format(
            list(svg_set), svg_cache.children_svg, _MAX_SVG_CHILDREN_LEVELS
        )
        svgs[var_str] = []
        for svg_strs in formatted_svgs.values():
            svgs[var_str].extend(svg_strs)
    return svgs, errors


def get_svgs(query_info: Dict[str, QueryInfo], svg_cache: SvgCache):
    """
    Retrieves relevant svgs for each variable string in the provided queries.

    Args:
        query_info (Dict[str, QueryInfo]): A dictionary mapping query identifiers to QueryInfo objects, each containing information about a query and its associated variables.
        svg_cache (SvgCache): An object used to cache and retrieve previously generated SVGs.

    Returns:
        Tuple[List[List[Any]], Any]:
            - A list of lists, representing csv rows where each inner list (row) contains the query number, query string, variable string, and the corresponding svg string.
            - An object representing errors encountered during svg retrieval.
    """
    merged_var_str_to_vars = get_merged_var_str_dict(
        [qi.var_str_to_vars for qi in query_info.values()]
    )
    svgs, errors = get_svgs_for_var_strs(merged_var_str_to_vars, svg_cache)

    results = []
    for q in list(query_info.values()):
        for var_str in q.var_str_to_vars.keys():
            curr_svg_results = svgs.get(var_str)
            if curr_svg_results:
                results.extend(
                    [
                        [q.query_num, q.query_str, var_str, svg]
                        for svg in curr_svg_results
                    ]
                )
            else:
                results.extend([q.query_num, q.query_str, var_str, ""])
    return results, errors


def main(_):
    query_sets = get_queries(FLAGS.input_folder)
    svg_cache = get_svg_cache(FLAGS.svg_cache)
    for qs in query_sets:
        print(f"generating results for {qs.filename}")
        svg_results, errors = get_svgs(qs.query_info, svg_cache)
        with open(f"{FLAGS.output_folder}/{qs.filename}_svgs.csv", "w") as f:
            writer = csv.writer(f)
            writer.writerows(svg_results)
        with open(f"{FLAGS.output_folder}/{qs.filename}_errors.txt", "w") as f:
            f.write(json.dumps(errors))
        print(f"finished generating results for {qs.filename}")


if __name__ == "__main__":
    app.run(main)
