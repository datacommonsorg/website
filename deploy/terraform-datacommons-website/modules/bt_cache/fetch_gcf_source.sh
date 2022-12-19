#!/bin/bash
# Copyright 2022 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
set -x

rm -rf source
mkdir source

curl -o source/common.go \
    https://raw.githubusercontent.com/datacommonsorg/tools/6d4171ed471b1d538ee45cdd63f2a7598b442be4/bigtable_automation/gcf/common.go

curl -o source/private.go \
    https://raw.githubusercontent.com/datacommonsorg/tools/6d4171ed471b1d538ee45cdd63f2a7598b442be4/bigtable_automation/gcf/private.go

curl -o source/dataflow_launcher.go \
    https://raw.githubusercontent.com/datacommonsorg/tools/6d4171ed471b1d538ee45cdd63f2a7598b442be4/bigtable_automation/gcf/dataflow_launcher.go

curl -o source/go.sum \
    https://raw.githubusercontent.com/datacommonsorg/tools/6d4171ed471b1d538ee45cdd63f2a7598b442be4/bigtable_automation/gcf/go.sum

curl -o source/go.mod \
    https://raw.githubusercontent.com/datacommonsorg/tools/6d4171ed471b1d538ee45cdd63f2a7598b442be4/bigtable_automation/gcf/go.mod

cd source
zip -r bt_automation_go_source.zip .
