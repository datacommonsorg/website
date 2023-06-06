#!/bin/bash
# Copyright 2023 Google LLC
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

# Serves static content from experimental directory
cd experimental

# Create symbolic links to compiled datacommons js and  css 
ln -s ../../../server/dist/datacommons.js ./sdg-static/datacommons/datacommons.js
ln -s ../../../server/dist/css/nl_interface.min.css ./sdg-static/datacommons/nl_interface.min.css
ln -s ../../../server/dist/css/ranking.min.css ./sdg-static/datacommons/ranking.min.css

# Start static webserver
python3 -m http.server 8081