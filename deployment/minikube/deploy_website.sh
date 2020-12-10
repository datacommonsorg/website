#!/bin/bash
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

set -e

# Update Mixer Submodule
git submodule foreach git pull origin master

# Update yaml file
../generate_yaml.sh dev

# Use local docker image with Minikube.
eval $(minikube docker-env)

# Build Docker Image [Run after code change]
# The build would take a few mintues the first time. Subsquent build should only take a few seconds with docker caching.
cd ../../
DOCKER_BUILDKIT=1 docker build --tag website:local .
cd deployment/minikube

# Apply deployment and service
kubectl delete deployment website-app -n website
kubectl apply -f deployment.yaml -f service.yaml