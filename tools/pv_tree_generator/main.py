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
"""main function for building the PV-tree and generate the json file"""

import json
import logging
import util
import constants
from build_tree import build_tree, getTopLevel
import copy


def main():
    pop_obs_spec = util._read_pop_obs_spec()
    stat_vars = util._read_stat_var()
    f_json = open("../../static/data/hierarchy_statsvar.json", "w")
    f_json_top = open("../../static/data/hierarchy_top.json", "w")
    f_json_statsvar_path = open("../../static/data/statsvar_path.json", "w")
    data = {}
    data_top = {}
    statsvar_path_all = {}
    # for idx, vertical in enumerate(constants.VERTICALS):
    for idx, vertical in enumerate(["Economics", "Demographics"]):
        logging.info(vertical)
        root, statsvar_path = build_tree(
            vertical, pop_obs_spec[vertical], stat_vars, idx)
        statsvar_path_all.update(statsvar_path)
        data[vertical] = root
        root_top = getTopLevel(copy.deepcopy(root), 1)
        data_top[vertical] = root_top
    json.dump(data, f_json, indent=1)
    json.dump(data_top, f_json_top, indent=1)
    json.dump(statsvar_path_all, f_json_statsvar_path, indent=1)
    return


if __name__ == "__main__":
    main()
