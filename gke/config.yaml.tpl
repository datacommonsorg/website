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


# This is a yaml template to create gcp/gke configuration.
# Copy this file to `config.yaml` and use that.

project:
domain:
ip:
region:
  primary:
  others:
    -
nodes: 1
storage_project:
tmcf_csv_bucket:
tmcf_csv_folder:
