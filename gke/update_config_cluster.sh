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

# Renders and applies MultiClusterIngress, MultiClusterService, and
# BackendConfig manifests to the Fleet config cluster.

set -e

function help {
  echo "Usage: $0 -e <ENV> [-l <REGION>] [-n] [-f]"
  echo "  -e <ENV>     Instance environment as defined under ../deploy/helm_charts/envs"
  echo "  -l <REGION>  GKE region of the config cluster (default: us-central1)"
  echo "  -n           Setup nodejs service"
  echo "  -f           Allow replacing a live website-mci static IP if it differs from resolved IP"
  exit 1
}

# Read a scalar value from $CONFIG_YAML, falling back to $DEFAULT_VALUES_YAML when unset or empty.
function get_helm_value {
  local expr="$1"
  local val
  val=$(yq eval -r "$expr" "$CONFIG_YAML")
  if [[ -z $val || $val == "null" ]]; then
    val=$(yq eval -r "$expr" "$DEFAULT_VALUES_YAML")
  fi
  printf '%s\n' "$val"
}

# Inject spec.iap into rendered backendconfig.yaml entries when IAP is enabled in Helm config.
# Both backendconfig and backendconfig-agentic reference the same `iap-secret` OAuth client
# so requests across /labs/discover and /datacommons.js + /api/* share one IAP session cookie.
# When disabled, spec.iap is omitted (never set to enabled: false) so Console-managed IAP is untouched.
function apply_iap_to_backendconfig {
  if [[ $WEBSITE_IAP_ENABLED == "true" ]]; then
    yq eval -i 'with(select(.metadata.name == "backendconfig"); .spec.iap.enabled = true | .spec.iap.oauthclientCredentials.secretName = "iap-secret")' backendconfig.yaml
  fi
  if [[ $AGENTIC_ENABLED == "true" && $AGENTIC_IAP_ENABLED == "true" ]]; then
    yq eval -i 'with(select(.metadata.name == "backendconfig-agentic"); .spec.iap.enabled = true | .spec.iap.oauthclientCredentials.secretName = "iap-secret")' backendconfig.yaml
  fi
}

# Fail fast if rendered backendconfig.yaml references `iap-secret` but the K8s Secret is missing.
function verify_iap_secret_exists {
  if [[ $WEBSITE_IAP_ENABLED != "true" ]] && ! [[ $AGENTIC_ENABLED == "true" && $AGENTIC_IAP_ENABLED == "true" ]]; then
    return 0
  fi
  local secret_err
  if ! secret_err=$(kubectl get secret iap-secret -n website -o name 2>&1); then
    if [[ $secret_err == *"NotFound"* || $secret_err == *"not found"* ]]; then
      echo "Error: IAP is enabled in $CONFIG_YAML, but Kubernetes Secret 'iap-secret' was not found in namespace 'website' (project $PROJECT_ID)." >&2
      echo "Create 'iap-secret' with 'client_id' and 'client_secret' (see docs/iap.md) before re-running." >&2
    else
      echo "Error: Failed to verify Kubernetes Secret 'iap-secret' in namespace 'website' (project $PROJECT_ID): $secret_err" >&2
    fi
    exit 1
  fi
}

# Fail fast if applying backendconfig.yaml would strip spec.iap.enabled: true from a live
# BackendConfig or downgrade custom oauthclientCredentials to Google-managed OAuth in-place
# (unsupported by GKE BackendConfig without recreating the backend).
function guard_live_backendconfig_iap {
  local bc_name rendered_iap rendered_secret live_bc live_iap live_secret
  while IFS= read -r bc_name; do
    [[ -z $bc_name ]] && continue
    live_bc=$(kubectl get backendconfig "$bc_name" -n website --ignore-not-found -o yaml)
    [[ -z $live_bc ]] && continue

    live_iap=$(yq eval -r '.spec.iap.enabled // "false"' - <<< "$live_bc")
    if [[ $live_iap != "true" ]]; then
      continue
    fi

    rendered_iap=$(BC_NAME="$bc_name" yq eval -N -r 'select(.metadata.name == strenv(BC_NAME)) | .spec.iap.enabled // "false"' backendconfig.yaml)
    if [[ $rendered_iap != "true" ]]; then
      echo "Error: Live BackendConfig '$bc_name' in project $PROJECT_ID has spec.iap.enabled=true, which would be stripped by applying backendconfig.yaml." >&2
      case "$bc_name" in
        backendconfig)
          echo "Set 'website.iap.enabled: true' in $CONFIG_YAML to preserve IAP declaratively, or remove spec.iap from the live BackendConfig first if intentionally disabling IAP." >&2
          ;;
        backendconfig-agentic)
          echo "Set 'agentic.iap.enabled: true' in $CONFIG_YAML to preserve IAP declaratively, or remove spec.iap from the live BackendConfig first if intentionally disabling IAP." >&2
          ;;
        *)
          echo "Preserve spec.iap on '$bc_name' or remove it from the live BackendConfig first if intentionally disabling IAP." >&2
          ;;
      esac
      exit 1
    fi

    live_secret=$(yq eval -r '.spec.iap.oauthclientCredentials.secretName // ""' - <<< "$live_bc")
    rendered_secret=$(BC_NAME="$bc_name" yq eval -N -r 'select(.metadata.name == strenv(BC_NAME)) | .spec.iap.oauthclientCredentials.secretName // ""' backendconfig.yaml)
    if [[ -n $live_secret && -z $rendered_secret ]]; then
      echo "Error: Live BackendConfig '$bc_name' uses custom IAP OAuth secret '$live_secret', but rendered backendconfig.yaml switches it to <Google-managed>." >&2
      echo "GKE BackendConfig does not support switching from custom oauthclientCredentials to Google-managed OAuth in-place (requires recreating the backend); reconcile manually before re-running." >&2
      exit 1
    elif [[ $live_secret != "$rendered_secret" ]]; then
      echo "Note: Updating BackendConfig '$bc_name' IAP OAuth credential from '${live_secret:-<Google-managed>}' to '$rendered_secret'." >&2
    fi
  done < <(yq eval -N -r '.metadata.name // ""' backendconfig.yaml)
}

# Warn if the main website MCI backend has IAP enabled (in Helm or live GCE) while
# website-agentic-mcs is missing IAP (for example, right after creating or renaming
# website-agentic-mcs, whose GCE BackendService defaults to IAP disabled) or uses a
# different IAP OAuth client ID (which causes separate IAP session cookies on the same domain).
function warn_gce_agentic_iap_mismatch {
  if [[ $AGENTIC_ENABLED != "true" ]]; then
    return 0
  fi

  local bs_json=""
  if ! bs_json=$(gcloud compute backend-services list \
    --global \
    --project="$PROJECT_ID" \
    --filter="name~'^mci-.*-website-(website-mcs|website-agentic-mcs)$'" \
    --format=json 2>/dev/null); then
    echo "Warning: Could not inspect GCE backend services in $PROJECT_ID to verify IAP parity for website-agentic-mcs." >&2
    return 0
  fi

  local website_bs_name website_gce_iap website_client_id
  website_bs_name=$(yq eval -p=json -r '([.[] | select(.name | test("^mci-.*-website-website-mcs$"))][0].name) // ""' <<< "$bs_json")
  website_gce_iap=$(yq eval -p=json -r '([.[] | select(.name | test("^mci-.*-website-website-mcs$"))][0].iap.enabled) // "false"' <<< "$bs_json")
  website_client_id=$(yq eval -p=json -r '([.[] | select(.name | test("^mci-.*-website-website-mcs$"))][0].iap.oauth2ClientId) // ""' <<< "$bs_json")

  local website_has_iap="false"
  if [[ $WEBSITE_IAP_ENABLED == "true" || $website_gce_iap == "true" ]]; then
    website_has_iap="true"
  fi
  if [[ $website_has_iap != "true" ]]; then
    return 0
  fi

  local agentic_bs_name agentic_gce_iap agentic_client_id
  agentic_bs_name=$(yq eval -p=json -r '([.[] | select(.name | test("^mci-.*-website-website-agentic-mcs$"))][0].name) // ""' <<< "$bs_json")
  agentic_gce_iap=$(yq eval -p=json -r '([.[] | select(.name | test("^mci-.*-website-website-agentic-mcs$"))][0].iap.enabled) // "false"' <<< "$bs_json")
  agentic_client_id=$(yq eval -p=json -r '([.[] | select(.name | test("^mci-.*-website-website-agentic-mcs$"))][0].iap.oauth2ClientId) // ""' <<< "$bs_json")

  if [[ $AGENTIC_IAP_ENABLED != "true" ]]; then
    if [[ -z $agentic_bs_name ]]; then
      echo "Warning: Main website MCI backend has IAP enabled, but no GCE backend service for 'website-agentic-mcs' exists yet in $PROJECT_ID (newly created MCS) and agentic.iap.enabled is not true." >&2
      echo "Once MCI provisions 'mci-*-website-website-agentic-mcs', enable IAP on it with the same OAuth client as '${website_bs_name:-website-mcs}' (or set 'agentic.iap.enabled: true' in $CONFIG_YAML) so agentic routes are not exposed without IAP." >&2
      return 0
    elif [[ $agentic_gce_iap != "true" ]]; then
      echo "Warning: Main website MCI backend has IAP enabled, but '$agentic_bs_name' does NOT have IAP enabled." >&2
      echo "Set 'agentic.iap.enabled: true' in $CONFIG_YAML (sharing 'iap-secret') or enable IAP on '$agentic_bs_name' with the same OAuth client in GCP Console." >&2
      return 0
    fi
  elif [[ $WEBSITE_IAP_ENABLED != "true" && $website_gce_iap == "true" && -z $website_client_id ]]; then
    echo "Warning: 'agentic.iap.enabled' configures 'backendconfig-agentic' with custom OAuth secret 'iap-secret', while live '$website_bs_name' uses <Google-managed> IAP." >&2
    echo "Mismatched OAuth clients issue separate IAP session cookies on the same domain; align both backends to the same OAuth client (see docs/iap.md)." >&2
    return 0
  fi

  # Check OAuth client ID parity when both GCE backend services currently have IAP enabled.
  if [[ -n $agentic_bs_name && $website_gce_iap == "true" && $agentic_gce_iap == "true" && $website_client_id != "$agentic_client_id" ]]; then
    if [[ $WEBSITE_IAP_ENABLED == "true" && $AGENTIC_IAP_ENABLED == "true" ]]; then
      echo "Note: Live GCE IAP OAuth clients currently differ ('$website_bs_name': '${website_client_id:-<Google-managed>}', '$agentic_bs_name': '${agentic_client_id:-<Google-managed>}')." >&2
      echo "Both BackendConfigs now reference 'iap-secret'; allow ~1-2 minutes for MCI to sync, then confirm parity with: gcloud compute backend-services list --global --project=$PROJECT_ID --filter=\"name~'^mci-'\" --format='table(name,iap.enabled,iap.oauth2ClientId)'" >&2
    else
      echo "Warning: Live GCE IAP OAuth clients differ between '$website_bs_name' ('${website_client_id:-<Google-managed>}') and '$agentic_bs_name' ('${agentic_client_id:-<Google-managed>}')." >&2
      echo "Mismatched OAuth clients issue separate IAP session cookies on the same domain, which breaks same-host chart/API requests from /labs/discover." >&2
      echo "Set both 'website.iap.enabled: true' and 'agentic.iap.enabled: true' in $CONFIG_YAML (sharing 'iap-secret') or align both backends to the same OAuth client in IAP Console." >&2
    fi
  fi
}

# Parse command-line options.
ENV=""
LOCATION=""
SETUP_NODEJS=""
FORCE_IP_CHANGE=""
OPTIND=1
while getopts ":e:l:nf?" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    l)
      LOCATION=$OPTARG
      ;;
    n)
      SETUP_NODEJS=true
      ;;
    f)
      FORCE_IP_CHANGE=true
      ;;
    *)
      help
      ;;
  esac
done
shift $((OPTIND - 1))
if [[ $# -gt 0 ]]; then
  echo "Unexpected positional argument(s): $*" >&2
  help
fi

if [[ -z $ENV ]]; then
  echo "Set environment by -e" >&2
  exit 1
fi

# Resolve and validate the Helm environment configuration.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEFAULT_VALUES_YAML="../deploy/helm_charts/dc_website/values.yaml"
CONFIG_YAML="../deploy/helm_charts/envs/$ENV.yaml"

if [[ ! -f $CONFIG_YAML ]]; then
  echo "Error: Environment config not found: $CONFIG_YAML" >&2
  exit 1
fi

PROJECT_ID=$(yq eval -r '.project // ""' "$CONFIG_YAML")
if [[ -z $PROJECT_ID ]]; then
  echo "Error: 'project' is missing or empty in $CONFIG_YAML" >&2
  exit 1
fi
CLUSTER_PREFIX=$(yq eval -r '.cluster_prefix // ""' "$CONFIG_YAML")
CLUSTER_PREFIX="${CLUSTER_PREFIX:-website}"

AGENTIC_ENABLED=$(get_helm_value '.agentic.enabled')
DISCOVER_ENABLED=$(get_helm_value '.agentic.discover.enabled')
DISCOVER_BASE_PATH=$(get_helm_value '.agentic.discover.basePath')
DISCOVER_BASE_PATH="${DISCOVER_BASE_PATH%/}"
WEBSITE_IAP_ENABLED=$(get_helm_value '.website.iap.enabled')
AGENTIC_IAP_ENABLED=$(get_helm_value '.agentic.iap.enabled')

if [[ -z $LOCATION ]]; then
  LOCATION="us-central1"
fi

CLUSTER_NAME="$CLUSTER_PREFIX-$LOCATION"

# Verify Fleet Multi-Cluster Ingress is enabled and targets this cluster as the config cluster.
if ! CONFIG_MEMBERSHIP=$(gcloud container hub ingress describe \
  --project="$PROJECT_ID" \
  --format='value(spec.multiclusteringress.configMembership)') || [[ -z $CONFIG_MEMBERSHIP ]]; then
  echo "Error: Fleet Multi-Cluster Ingress is not enabled in project $PROJECT_ID. Run setup_config_cluster.sh first." >&2
  exit 1
fi
if [[ $CONFIG_MEMBERSHIP != *"/locations/$LOCATION/memberships/$CLUSTER_NAME" ]] &&
   [[ $CONFIG_MEMBERSHIP != *"/locations/global/memberships/$CLUSTER_NAME" ]]; then
  echo "Error: Cluster '$CLUSTER_NAME' ($LOCATION) is not the Fleet config cluster (expected '${CONFIG_MEMBERSHIP##*/}')." >&2
  exit 1
fi

# Fetch credentials for the Fleet config cluster.
gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region="$LOCATION" --project="$PROJECT_ID"

# Resolve static IP from Helm env config first, falling back to global address 'dc-website-ip'.
IP=$(yq eval -r '.ip // ""' "$CONFIG_YAML")
if [[ -z $IP ]]; then
  IP=$(gcloud compute addresses list --global --project="$PROJECT_ID" --filter='name=dc-website-ip' --format='value(ADDRESS)')
  if [[ -z $IP ]]; then
    echo "Error: Static IP not found in $CONFIG_YAML (.ip) or global address 'dc-website-ip' in project $PROJECT_ID" >&2
    exit 1
  fi
fi

# Guard against unintentionally overwriting a live website-mci static IP with a stale YAML value.
EXISTING_MCI=$(kubectl get mci website-mci -n website --ignore-not-found -o yaml)
if [[ -n $EXISTING_MCI ]]; then
  EXISTING_STATIC_IP=$(yq eval -r '.metadata.annotations."networking.gke.io/static-ip" // ""' - <<< "$EXISTING_MCI")
  EXISTING_VIP=$(yq eval -r '.status.VIP // ""' - <<< "$EXISTING_MCI")
  if [[ -n $EXISTING_STATIC_IP && $EXISTING_STATIC_IP != "$IP" ]] ||
     [[ -n $EXISTING_VIP && $EXISTING_VIP != "$IP" ]]; then
    LIVE_STATE="static-ip=${EXISTING_STATIC_IP:-<unset>}, status.VIP=${EXISTING_VIP:-<unset>}"
    if [[ $FORCE_IP_CHANGE == "true" ]]; then
      echo "Warning: Replacing live website-mci static IP ($LIVE_STATE -> $IP) in project $PROJECT_ID (-f specified)." >&2
    else
      echo "Error: Resolved static IP ($IP) does not match live website-mci ($LIVE_STATE) in project $PROJECT_ID." >&2
      echo "Verify $CONFIG_YAML (.ip) matches the live ingress, or re-run with -f to intentionally replace the ingress IP." >&2
      exit 1
    fi
  fi
fi

# Render backendconfig.yaml and mci.yaml from templates.
cp backendconfig.yaml.tpl backendconfig.yaml
cp mci.yaml.tpl mci.yaml
IP="$IP" yq eval -i '.metadata.annotations."networking.gke.io/static-ip" = strenv(IP)' mci.yaml

# Remove the Node.js route unless -n was specified.
if [[ $SETUP_NODEJS != "true" ]]; then
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.backend.serviceName == "website-nodejs-mcs"))' mci.yaml
fi

# Populate or remove the agentic BackendConfig and Discover routes based on Helm config.
if [[ $AGENTIC_ENABLED != "true" ]]; then
  yq eval -i 'select(.metadata.name != "backendconfig-agentic")' backendconfig.yaml
fi
apply_iap_to_backendconfig
if [[ $AGENTIC_ENABLED == "true" && $DISCOVER_ENABLED == "true" ]]; then
  DISCOVER_WILDCARD_PATH="${DISCOVER_BASE_PATH}/*"
  DISCOVER_BASE_PATH="$DISCOVER_BASE_PATH" yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>").path) = strenv(DISCOVER_BASE_PATH)' mci.yaml
  DISCOVER_WILDCARD_PATH="$DISCOVER_WILDCARD_PATH" yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>/*").path) = strenv(DISCOVER_WILDCARD_PATH)' mci.yaml
else
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>" or .path == "<DISCOVER_BASE_PATH>/*"))' mci.yaml
fi

# Verify required IAP secret exists and guard against stripping IAP from live BackendConfigs before applying.
verify_iap_secret_exists
guard_live_backendconfig_iap

# Apply Multi-Cluster Ingress, Multi-Cluster Services, and BackendConfigs.
kubectl apply -f backendconfig.yaml
kubectl apply -f mci.yaml
kubectl apply -f website_mcs.yaml
if [[ $SETUP_NODEJS == "true" ]]; then
  kubectl apply -f website_nodejs_mcs.yaml
fi
if [[ $AGENTIC_ENABLED == "true" ]]; then
  kubectl apply -f website_agentic_mcs.yaml
fi

warn_gce_agentic_iap_mismatch

# Check the status: `kubectl describe mci website-mci -n website`

