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
set -e

NAMESPACE="${NAMESPACE:-website}"

# Install argo into the cluster.
kustomize build > install.yaml
# Fix Cluster role/bindings resource to custom namespace
# Solution below seems complicated.
# https://github.com/kubernetes-sigs/kustomize/pull/4704
sed -i  "s/namespace: argocd/namespace: $NAMESPACE/" install.yaml

kubectl apply -f install.yaml

# echo "Waiting for the Argo API server to be ready"
sleep 60

kubectl port-forward svc/argocd-server \
  -n $NAMESPACE 8095:80 > /dev/null 2>&1 &
pid=$!
echo "port-forward pid: $pid"
trap '{
    kill $pid
    echo "port-forward process killed: $pid"
}' EXIT

# Admin login
# grpc-web-root-path must match server.rootpath in kustomization.yaml
INITIAL_PASSWORD=$(kubectl -n $NAMESPACE get \
  secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

argocd login \
  --port-forward \
  --port-forward-namespace $NAMESPACE  \
  --username admin \
  --password $INITIAL_PASSWORD \
  --grpc-web --grpc-web-root-path deploy \
  --plaintext 127.0.0.1:8095
