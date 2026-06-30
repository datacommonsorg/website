#!/usr/bin/env bash
# Copyright 2026 Google LLC
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

# This script verifies if a Kubernetes cluster has sufficient capacity to host
# a deployment of the Data Commons Website and/or Mixer using the official
# Kubernetes SIGs 'cluster-capacity' tool. It renders the target environment
# configurations, extracts the pod specifications, and runs the native scheduler
# simulation to verify that the required number of replicas can be scheduled.
#
# Requires:
#   - generate_deployment_config.sh to be present at ./scripts/generate_deployment_config.sh.
#   - cluster-capacity to be installed and in the PATH.
#   - kubectl to be authenticated with the target cluster.
#
# Usage:
#   ./scripts/check_deployment_feasibility.sh -p <profile> [-c <kube-context>] [additional flags]
#
# Options:
#   -p    The Skaffold profile name (passed to generate_deployment_config.sh, required)
#   -c    The kubectl context to check against (optional, auto-detected if omitted)
#   -h    Display this help message
#
# Any trailing/additional flags (like -w or -m) will be forwarded directly to
# generate_deployment_config.sh.

set -eo pipefail

# Resolve script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Import utils for colors and logging
source ${DIR}/utils.sh

# Helper Functions
usage() {
    cat << EOF
Usage: $0 -p <profile> [-c <kube-context>] [additional flags for generate_deployment_config.sh]

Options:
  -p    The Skaffold profile name (required)
  -c    The kubectl context to check against (optional, auto-detected if omitted)
  -h    Display this help message

Any trailing flags (like -w or -m) will be seamlessly forwarded to generate_deployment_config.sh.

Example:
  $0 -p website-prod -w website-tag-123
EOF
    exit 1
}

# Parse Script Arguments
CONTEXT=""
PROFILE=""
FORWARD_ARGS=()

while getopts ":c:p:h" opt; do
    case ${opt} in
        c ) CONTEXT="$OPTARG" ;;
        p ) PROFILE="$OPTARG" ;;
        h ) usage ;;
        \? ) usage ;;
    esac
done
shift $((OPTIND - 1))

# Capture any remaining args to pass directly to generate_deployment_config.sh
FORWARD_ARGS+=("$@")

if [[ -z "$PROFILE" ]]; then
    log_error "-p (profile) is a required parameter."
    usage
fi

# Auto-detect context if not specified
if [[ -z "$CONTEXT" ]]; then
    log_notice "No kubectl context specified. Attempting to auto-detect..."
    
    # 1. Get the values file path from skaffold.yaml
    VALUES_FILE=$(yq eval ".profiles[] | select(.name == \"$PROFILE\") | .manifests.helm.releases[0].valuesFiles[0]" "$DIR/../skaffold.yaml" 2>/dev/null || true)
    
    if [[ -n "$VALUES_FILE" && -f "$DIR/../$VALUES_FILE" ]]; then
        # 2. Extract the project ID
        PROJECT_ID=$(yq eval '.project // .mixer.hostProject' "$DIR/../$VALUES_FILE" 2>/dev/null || true)
        
        if [[ -n "$PROJECT_ID" && "$PROJECT_ID" != "null" ]]; then
            log_notice "Found GCP project ID '$PROJECT_ID' for profile '$PROFILE'."
            
            # 3. Find matching kubectl contexts
            MATCHING_CONTEXTS=$(kubectl config get-contexts -o name | grep "$PROJECT_ID" || true)
            
            if [[ -n "$MATCHING_CONTEXTS" ]]; then
                # Select the first matching context
                CONTEXT=$(echo "$MATCHING_CONTEXTS" | head -n 1)
                NUM_MATCHES=$(echo "$MATCHING_CONTEXTS" | wc -l | tr -d ' ')
                
                if (( NUM_MATCHES > 1 )); then
                    log_warn "Multiple matching contexts found for project '$PROJECT_ID':"
                    echo "$MATCHING_CONTEXTS" | sed 's/^/  - /' >&2
                    log_warn "Defaulting to the first one: '$CONTEXT'"
                else
                    log_success "Auto-detected kubectl context: '$CONTEXT'"
                fi
            else
                log_error "Could not find any kubectl contexts matching project ID '$PROJECT_ID'."
                
                # Help first-time users by finding clusters via gcloud and printing setup commands
                if command -v gcloud &> /dev/null; then
                    log_notice "Attempting to find GKE clusters in project '$PROJECT_ID' using gcloud..."
                    CLUSTERS=$(gcloud container clusters list --project "$PROJECT_ID" --format="value(name,location)" 2>/dev/null || true)
                    
                    if [[ -n "$CLUSTERS" ]]; then
                        echo "" >&2
                        log_notice "=========================================================================" >&2
                        log_notice "💡 HOW TO SETUP YOUR KUBECTL CONTEXT" >&2
                        log_notice "=========================================================================" >&2
                        log_notice "It looks like you haven't configured your local kubectl context for GKE yet." >&2
                        log_notice "Found the following cluster(s) in project '$PROJECT_ID':" >&2
                        echo "" >&2
                        while read -r name location; do
                            [[ -z "$name" ]] && continue
                            echo "  - Cluster: $name (Location: $location)" >&2
                            echo "    To configure your local context, run this command:" >&2
                            echo "    gcloud container clusters get-credentials $name --location $location --project $PROJECT_ID" >&2
                            echo "" >&2
                        done <<< "$CLUSTERS"
                        log_notice "=========================================================================" >&2
                        echo "" >&2
                    fi
                fi
            fi
        fi
    fi
    
    if [[ -z "$CONTEXT" ]]; then
        log_error "Failed to auto-detect kubectl context. Please specify one using -c <kube-context>."
        exit 1
    fi
fi

# Prerequisites Validation
PREREQS_FAILED=false
for cmd in kubectl yq helm; do
    if ! command -v "$cmd" &> /dev/null; then
        log_error "Required command '$cmd' is not installed."
        PREREQS_FAILED=true
    fi
done

if ! command -v cluster-capacity &> /dev/null; then
    log_error "'cluster-capacity' is not installed."
    echo ""
    echo "========================================================================="
    echo "🔧 HOW TO INSTALL 'cluster-capacity'"
    echo "========================================================================="
    echo "This script uses the official Kubernetes SIGs 'cluster-capacity' tool to"
    echo "perform an accurate scheduling simulation using the native Kubernetes"
    echo "scheduler engine."
    echo ""
    echo "Choose one of the following installation methods:"
    echo ""
    echo "Method 1: Using Go"
    echo "  go install github.com/kubernetes-sigs/cluster-capacity/cmd/cluster-capacity@latest"
    echo "  (Make sure \$GOPATH/bin or ~/go/bin is in your PATH)"
    echo ""
    echo "Method 2: Build from Source"
    echo "  git clone https://github.com/kubernetes-sigs/cluster-capacity.git"
    echo "  cd cluster-capacity"
    echo "  make build"
    echo "  sudo mv cluster-capacity /usr/local/bin/"
    echo ""
    echo "Method 3: Download a Release Binary"
    echo "  Download the latest pre-compiled binary for your OS from:"
    echo "  https://github.com/kubernetes-sigs/cluster-capacity/releases"
    echo "========================================================================="
    echo ""
    PREREQS_FAILED=true
fi

if [ "$PREREQS_FAILED" = true ]; then
    exit 1
fi

if [[ ! -f "$DIR/generate_deployment_config.sh" ]]; then
    log_error "Could not find '$DIR/generate_deployment_config.sh'."
    exit 1
fi

# Target Context Switch
log_notice "Switching to kubectl context: $CONTEXT..."
if ! kubectl config use-context "$CONTEXT" &> /dev/null; then
    log_error "Failed to switch to context '$CONTEXT'. Does it exist?"
    exit 1
fi

# Workspace Setup & Manifest Generation
TMP_OUT=$(mktemp -d)
trap 'rm -rf "$TMP_OUT"' EXIT

log_notice "Generating fully rendered configurations for profile '$PROFILE'..."
if ! "$DIR/generate_deployment_config.sh" -o "$TMP_OUT" "$PROFILE" ${FORWARD_ARGS[@]+"${FORWARD_ARGS[@]}"} > /dev/null; then
    log_error "Configuration generation script failed."
    exit 1
fi

# Flag to track overall feasibility
FEASIBLE=true

# Split multi-document YAML files into individual resource files
SPLIT_DIR="$TMP_OUT/split"
mkdir -p "$SPLIT_DIR"
for manifest in "$TMP_OUT"/*.yaml; do
    [ -e "$manifest" ] || continue
    base_name=$(basename "$manifest" .yaml)
    yq eval -s "\"$SPLIT_DIR/${base_name}_\" + \$index" "$manifest" > /dev/null
done

# Iterate through all generated manifests to verify scheduling feasibility
for manifest in "$SPLIT_DIR"/*; do
    [ -e "$manifest" ] || continue
    
    # Check kind of resource
    KIND=$(yq eval '.kind' "$manifest" 2>/dev/null || echo "None")
    
    if [[ "$KIND" == "Deployment" || "$KIND" == "StatefulSet" || "$KIND" == "Pod" ]]; then
        NAME=$(yq eval '.metadata.name' "$manifest")
        log_notice "--------------------------------------------------"
        log_notice "Verifying feasibility for $KIND/$NAME..."
        
        # Determine number of requested replicas
        REPLICAS=1
        if [[ "$KIND" == "Deployment" || "$KIND" == "StatefulSet" ]]; then
            REPLICAS=$(yq eval '.spec.replicas // 1' "$manifest")
        fi
        
        # Extract the Pod spec template and convert to a standard Pod definition
        POD_SPEC_FILE="$TMP_OUT/podspec_${NAME}.yaml"
        if [[ "$KIND" == "Pod" ]]; then
            FILTER="."
        else
            FILTER=".spec.template"
        fi
        
        yq eval "
          ${FILTER} |
          .apiVersion = \"v1\" |
          .kind = \"Pod\" |
          .metadata.name = \"simulation-pod\" |
          .spec.terminationGracePeriodSeconds = 30 |
          .spec.containers[] |= {
            \"name\": .name,
            \"image\": (.image // \"dummy\"),
            \"imagePullPolicy\": \"IfNotPresent\",
            \"resources\": .resources
          } |
          with(.spec.initContainers | select(. != null); .[] |= {
            \"name\": .name,
            \"image\": (.image // \"dummy\"),
            \"imagePullPolicy\": \"IfNotPresent\",
            \"terminationMessagePolicy\": \"File\",
            \"terminationMessagePath\": \"/dev/termination-log\",
            \"resources\": .resources
          }) |
          del(.spec.volumes) |
          del(.spec.serviceAccountName) |
          del(.spec.imagePullSecrets)
        " "$manifest" > "$POD_SPEC_FILE"
        
        # Run cluster-capacity simulation
        log_notice "Running scheduler simulation (targeting $REPLICAS replica(s))..."
        
        # Run the command and capture output
        OUTPUT=$(cluster-capacity --podspec="$POD_SPEC_FILE" --max-limit="$REPLICAS" --verbose 2>&1 || true)
        
        # Check if the simulation actually ran successfully
        if [[ ! "$OUTPUT" =~ "The cluster can schedule" ]]; then
            log_error "Cluster capacity simulation failed to execute:"
            echo "$OUTPUT"
            FEASIBLE=false
            continue
        fi
        
        # Parse the number of schedulable instances from the text output
        NUM_SCHEDULABLE=$(echo "$OUTPUT" | grep -oE 'The cluster can schedule [0-9]+' | grep -oE '[0-9]+' || echo "0")
        
        if (( NUM_SCHEDULABLE >= REPLICAS )); then
            log_success "SUCCESS: Cluster can schedule all $REPLICAS replica(s) of $NAME ($NUM_SCHEDULABLE can fit)."
        else
            log_error "FAILURE: Insufficient capacity to schedule $REPLICAS replica(s) of $NAME."
            log_error "Only $NUM_SCHEDULABLE replica(s) can fit on the current cluster."
            echo ""
            # Print the termination reason and node-specific details from output
            echo "$OUTPUT" | grep -A 20 "Termination reason" || true
            echo ""
            FEASIBLE=false
        fi
    fi
done

echo "--------------------------------------------------"
if [ "$FEASIBLE" = true ]; then
    log_success "SUMMARY: All components are fully deployable on the target cluster!"
    exit 0
else
    log_error "SUMMARY: One or more components cannot be scheduled due to capacity limits."
    exit 1
fi
