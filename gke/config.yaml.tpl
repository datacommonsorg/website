# Copyright 2024 Google LLC
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
# Copy this file to `../deploy/helm_charts/envs/<ENV>.yaml` and use that.

# DNS
ip:
domain:

# Helm config
project:
cluster_prefix: "website"

namespace:
  name: "website"

website:
  flaskEnv:
  replicas: 1
  redis:
    enabled: false

serviceAccount:
  name: website-ksa

ingress:
  enabled: true

serviceGroups:
  recon: null
  svg:
    replicas: 1
  observation:
    replicas: 1
  node:
    replicas: 1
  default:
    replicas: 1

nl:
  enabled: false

nodejs:
  enabled: false
