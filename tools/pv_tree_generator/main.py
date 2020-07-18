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
import util
import constants
from build_tree import build_tree


def main():
    pop_obs_spec = util._read_pop_obs_spec()
    stat_vars = util._read_stat_var()
    f_json = open("./hierarchy.json", "w")
    data = {}
    for vertical in constants.VERTICALS:
        root = build_tree(vertical, pop_obs_spec[vertical], stat_vars)
        data[vertical] = root
    json.dump(data, f_json)
    return


if __name__ == "__main__":
    main()
