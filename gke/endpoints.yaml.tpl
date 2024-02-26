# Copyright 2019 Google LLC
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

# This template is used to generate endpoints.yaml which is deployed to Cloud
# Endpoints whenever mixer.proto is updated.

# The configuration schema is defined by service.proto file
# https://github.com/googleapis/googleapis/blob/master/google/api/service.proto
type: google.api.Service
config_version: 3

# Name of the service configuration.
name:

# API title to appear in the user interface (Google Cloud Console).
title:

apis:
- name: datacommons.Mixer

usage:
  rules:
  # All methods can be called without an API Key.
  - selector: "*"
    allow_unregistered_calls: true


backend:
  rules:
    - selector: "datacommons.Mixer.*"
      # Timeout for the ESP and mixer GRPC server.
      deadline: 60