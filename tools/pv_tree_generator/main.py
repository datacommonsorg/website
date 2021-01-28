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
from build_tree import build_tree, get_top_level

MAX_LEVEL = 6


def main():
    f_json = open("../../static/data/hierarchy_statsvar.json", "w")
    f_json_top = open("../../static/data/hierarchy_top.json", "w")
    f_json_statsvar_path = open("../../static/data/statsvar_path.json", "w")
    data, statsvar_path_all = build_tree(MAX_LEVEL)
    data_top = get_top_level(data)
    json.dump(data, f_json, indent=1)
    json.dump(data_top, f_json_top, indent=1)
    json.dump(statsvar_path_all, f_json_statsvar_path, indent=1)
    return


if __name__ == "__main__":
    main()
