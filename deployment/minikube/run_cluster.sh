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

# Start Minikube dashboard
minikube start --memory=4g
# Create namespace
kubectl create namespace website
# Mount the GCP credential
kubectl create secret generic website-robot-key --from-file=website-robot-key.json --namespace=website
kubectl create secret generic mixer-robot-key --from-file=mixer-robot-key.json --namespace=website
# Bring up dashboard
minikube dashboard