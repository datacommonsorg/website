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
  echo "Usage: $0 -e <ENV> [-l <REGION>] [-n] [-f] [-d|--dry-run]"
  echo "  -e <ENV>       Instance environment as defined under ../deploy/helm_charts/envs"
  echo "  -l <REGION>    GKE region of the config cluster (default: us-central1)"
  echo "  -n             Setup nodejs service"
  echo "  -f             Allow replacing a live website-mci static IP if it differs from resolved IP"
  echo "  -d, --dry-run  Run all validations and live guards, then preview changes via kubectl diff without applying"
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
  local targets=()
  if [[ $WEBSITE_IAP_ENABLED == "true" ]]; then
    targets+=("backendconfig")
  fi
  if [[ $AGENTIC_ENABLED == "true" && $AGENTIC_IAP_ENABLED == "true" ]]; then
    targets+=("backendconfig-agentic")
  fi

  local bc_name
  for bc_name in "${targets[@]}"; do
    BC_NAME="$bc_name" yq eval -i '
      with(select(.metadata.name == strenv(BC_NAME));
        .spec.iap.enabled = true |
        .spec.iap.oauthclientCredentials.secretName = "iap-secret"
      )
    ' backendconfig.yaml
  done
}

# Fail fast if rendered backendconfig.yaml references `iap-secret` but the K8s Secret is missing
# or does not define non-empty `client_id` and `client_secret` keys.
function verify_iap_secret_exists {
  local needs_secret="false"
  if [[ $WEBSITE_IAP_ENABLED == "true" ]]; then
    needs_secret="true"
  elif [[ $AGENTIC_ENABLED == "true" && $AGENTIC_IAP_ENABLED == "true" ]]; then
    needs_secret="true"
  fi
  if [[ $needs_secret != "true" ]]; then
    return 0
  fi

  local secret_out
  if ! secret_out=$(kubectl get secret iap-secret -n website -o yaml 2>&1); then
    if [[ $secret_out == *"NotFound"* || $secret_out == *"not found"* ]]; then
      echo "Error: IAP is enabled in $CONFIG_YAML, but Kubernetes Secret 'iap-secret' was not found in namespace 'website' (project $PROJECT_ID)." >&2
      echo "Create 'iap-secret' with 'client_id' and 'client_secret' (see docs/iap.md) before re-running." >&2
    else
      echo "Error: Failed to verify Kubernetes Secret 'iap-secret' in namespace 'website' (project $PROJECT_ID): $secret_out" >&2
    fi
    exit 1
  fi

  local client_id client_secret
  client_id=$(yq eval -r '.data.client_id // ""' - <<< "$secret_out")
  client_secret=$(yq eval -r '.data.client_secret // ""' - <<< "$secret_out")
  if [[ -z $client_id || -z $client_secret ]]; then
    echo "Error: Kubernetes Secret 'iap-secret' in namespace 'website' (project $PROJECT_ID) is missing non-empty 'client_id' and/or 'client_secret' keys (see docs/iap.md)." >&2
    exit 1
  fi
}

# Fail fast if applying backendconfig.yaml would strip spec.iap.enabled: true from a live
# BackendConfig or downgrade custom oauthclientCredentials to Google-managed OAuth in-place
# (unsupported by GKE BackendConfig without recreating the backend).
function guard_live_backendconfig_iap {
  local bc_names
  bc_names=$(yq eval -N -r '.metadata.name // ""' backendconfig.yaml)
  if [[ -z $bc_names ]]; then
    echo "Error: No BackendConfig resources found in rendered backendconfig.yaml." >&2
    exit 1
  fi

  local bc_name live_bc rendered_bc
  local live_iap rendered_iap live_secret rendered_secret flag_hint
  while IFS= read -r bc_name; do
    [[ -z $bc_name ]] && continue

    live_bc=$(kubectl get backendconfig "$bc_name" -n website --ignore-not-found -o yaml)
    [[ -z $live_bc ]] && continue

    live_iap=$(yq eval -r '.spec.iap.enabled // "false"' - <<< "$live_bc")
    if [[ $live_iap != "true" ]]; then
      continue
    fi

    rendered_bc=$(BC_NAME="$bc_name" yq eval -N 'select(.metadata.name == strenv(BC_NAME))' backendconfig.yaml)
    rendered_iap=$(yq eval -r '.spec.iap.enabled // "false"' - <<< "$rendered_bc")
    if [[ $rendered_iap != "true" ]]; then
      flag_hint="Preserve spec.iap on '$bc_name'"
      if [[ $bc_name == "backendconfig" ]]; then
        flag_hint="Set 'website.iap.enabled: true' in $CONFIG_YAML to preserve IAP declaratively"
      elif [[ $bc_name == "backendconfig-agentic" ]]; then
        flag_hint="Set 'agentic.iap.enabled: true' in $CONFIG_YAML to preserve IAP declaratively"
      fi
      echo "Error: Live BackendConfig '$bc_name' in project $PROJECT_ID has spec.iap.enabled=true, which would be stripped by applying backendconfig.yaml." >&2
      echo "$flag_hint; to turn IAP off, disable it in GCE (or via spec.iap.enabled=false) and remove spec.iap from the live BackendConfig first." >&2
      exit 1
    fi

    live_secret=$(yq eval -r '.spec.iap.oauthclientCredentials.secretName // ""' - <<< "$live_bc")
    rendered_secret=$(yq eval -r '.spec.iap.oauthclientCredentials.secretName // ""' - <<< "$rendered_bc")
    if [[ -n $live_secret && -z $rendered_secret ]]; then
      echo "Error: Live BackendConfig '$bc_name' uses custom IAP OAuth secret '$live_secret', but rendered backendconfig.yaml switches it to <Google-managed>." >&2
      echo "GKE BackendConfig does not support switching from custom oauthclientCredentials to Google-managed OAuth in-place (requires recreating the backend); reconcile manually before re-running." >&2
      exit 1
    elif [[ $live_secret != "$rendered_secret" ]]; then
      echo "Note: Updating BackendConfig '$bc_name' IAP OAuth credential from '${live_secret:-<Google-managed>}' to '$rendered_secret'." >&2
    fi
  done <<< "$bc_names"
}

# Inject spec.securityPolicy.name into rendered backendconfig-agentic when configured in Helm config.
# When empty, spec.securityPolicy is omitted so Console-managed policies are left untouched.
function apply_security_policy_to_backendconfig {
  if [[ $AGENTIC_ENABLED == "true" && -n $AGENTIC_SECURITY_POLICY ]]; then
    POLICY_NAME="$AGENTIC_SECURITY_POLICY" yq eval -i \
      'with(select(.metadata.name == "backendconfig-agentic"); .spec.securityPolicy.name = strenv(POLICY_NAME))' \
      backendconfig.yaml
  fi
}

# Fail fast if rendered backendconfig-agentic references a missing or non-backend Cloud Armor policy.
function verify_security_policy_exists {
  if [[ $AGENTIC_ENABLED != "true" || -z $AGENTIC_SECURITY_POLICY ]]; then
    return 0
  fi

  local err_file policy_type policy_err
  local rc=0
  err_file=$(mktemp)
  policy_type=$(gcloud compute security-policies describe "$AGENTIC_SECURITY_POLICY" \
    --global \
    --project="$PROJECT_ID" \
    --format='value(type)' 2>"$err_file") || rc=$?
  policy_err=$(cat "$err_file")
  rm -f "$err_file"

  if [[ $rc -ne 0 ]]; then
    if [[ $policy_err == *"NOT_FOUND"* || $policy_err == *"not found"* ]]; then
      echo "Error: Cloud Armor security policy '$AGENTIC_SECURITY_POLICY' was not found in project $PROJECT_ID." >&2
      echo "Provision '$AGENTIC_SECURITY_POLICY' (e.g. via Terraform) before attaching it to backendconfig-agentic." >&2
    else
      echo "Error: Failed to verify Cloud Armor security policy '$AGENTIC_SECURITY_POLICY' in project $PROJECT_ID: $policy_err" >&2
    fi
    exit 1
  fi

  policy_type="${policy_type%$'\r'}"
  if [[ -n $policy_type && $policy_type != "CLOUD_ARMOR" ]]; then
    echo "Error: Cloud Armor security policy '$AGENTIC_SECURITY_POLICY' in project $PROJECT_ID has type '$policy_type'; BackendConfig requires a backend security policy (type 'CLOUD_ARMOR')." >&2
    exit 1
  fi
}

# Fail fast if applying backendconfig.yaml would strip spec.securityPolicy.name from a live BackendConfig.
function guard_live_backendconfig_security_policy {
  local bc_names
  bc_names=$(yq eval -N -r '.metadata.name // ""' backendconfig.yaml)
  if [[ -z $bc_names ]]; then
    echo "Error: No BackendConfig resources found in rendered backendconfig.yaml." >&2
    exit 1
  fi

  local bc_name live_bc live_policy rendered_policy
  while IFS= read -r bc_name; do
    [[ -z $bc_name ]] && continue

    live_bc=$(kubectl get backendconfig "$bc_name" -n website --ignore-not-found -o yaml)
    [[ -z $live_bc ]] && continue

    live_policy=$(yq eval -r '.spec.securityPolicy.name // ""' - <<< "$live_bc")
    if [[ -z $live_policy ]]; then
      continue
    fi

    rendered_policy=$(BC_NAME="$bc_name" yq eval -N -r 'select(.metadata.name == strenv(BC_NAME)) | .spec.securityPolicy.name // ""' backendconfig.yaml)
    if [[ -z $rendered_policy ]]; then
      echo "Error: Live BackendConfig '$bc_name' in project $PROJECT_ID has spec.securityPolicy.name='$live_policy', which would be stripped by applying backendconfig.yaml." >&2
      if [[ $bc_name == "backendconfig-agentic" ]]; then
        echo "Set 'agentic.securityPolicy: \"$live_policy\"' in $CONFIG_YAML to preserve it declaratively." >&2
      else
        echo "Preserve spec.securityPolicy on '$bc_name' to keep it attached." >&2
      fi
      echo "If intentionally detaching '$live_policy', note that removing spec.securityPolicy alone leaves it attached in GCE:" >&2
      echo '  1. Set spec.securityPolicy.name="" on the live BackendConfig and wait for GCE reconciliation' >&2
      echo '     (or detach it on the GCE BackendService directly).' >&2
      echo '  2. Then remove spec.securityPolicy from the live BackendConfig.' >&2
      exit 1
    elif [[ $live_policy != "$rendered_policy" ]]; then
      echo "Note: Updating BackendConfig '$bc_name' Cloud Armor securityPolicy from '$live_policy' to '$rendered_policy'." >&2
    fi
  done <<< "$bc_names"
}

# Filter a GCE backend-services JSON array to entries matching one MultiClusterService name.
function filter_gce_backends {
  local bs_json="$1"
  local mcs_name="$2"
  local pattern="^mci-.*-website-${mcs_name}$"
  PATTERN="$pattern" yq eval -p=json -o=json \
    '[.[] | select(.name | test(strenv(PATTERN)))]' <<< "$bs_json"
}

# Normalize a comma-separated pre-shared-certs annotation into a canonical sorted list.
function normalize_cert_list {
  local raw="$1"
  printf '%s\n' "$raw" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed '/^$/d' | LC_ALL=C sort -u | paste -s -d ',' -
}

# Fail fast if applying mci.yaml would change live website-mci pre-shared-certs.
function guard_live_mci_pre_shared_certs {
  if [[ -z $EXISTING_MCI ]]; then
    return 0
  fi

  local live_certs rendered_certs norm_live norm_rendered
  live_certs=$(yq eval -r '.metadata.annotations."networking.gke.io/pre-shared-certs" // ""' - <<< "$EXISTING_MCI")
  if [[ -z $live_certs ]]; then
    return 0
  fi

  rendered_certs=$(yq eval -r '.metadata.annotations."networking.gke.io/pre-shared-certs" // ""' mci.yaml)
  norm_live=$(normalize_cert_list "$live_certs")
  norm_rendered=$(normalize_cert_list "$rendered_certs")
  if [[ $norm_live != "$norm_rendered" ]]; then
    echo "Error: Rendered website-mci pre-shared-certs ('${rendered_certs:-<unset>}') does not match live website-mci ('$live_certs') in project $PROJECT_ID." >&2
    echo "Update the rendered pre-shared-certs configuration to match the live certificates before applying to avoid breaking HTTPS/TLS." >&2
    exit 1
  fi
}

# Warn if the main website MCI backend has IAP enabled (in Helm or live GCE) while
# website-agentic-mcs is missing IAP or uses a different IAP OAuth client ID (which
# causes separate IAP session cookies on the same domain).
function warn_gce_agentic_iap_mismatch {
  if [[ $AGENTIC_ENABLED != "true" ]]; then
    return 0
  fi

  local inspect_cmd="gcloud compute backend-services list --global --project=$PROJECT_ID --filter=\"name~'^mci-'\" --format='table(name,iap.enabled,iap.oauth2ClientId)'"
  local bs_json=""
  if ! bs_json=$(gcloud compute backend-services list \
    --global \
    --project="$PROJECT_ID" \
    --filter="name~'^mci-.*-website-(website-mcs|website-agentic-mcs)$'" \
    --format=json 2>/dev/null); then
    echo "Warning: Could not inspect GCE backend services in $PROJECT_ID to verify IAP parity for website-agentic-mcs." >&2
    return 0
  fi

  # Inspect main website GCE backend service(s).
  local website_matches website_count website_any_iap website_names
  website_matches=$(filter_gce_backends "$bs_json" "website-mcs")
  website_count=$(yq eval -p=json -r 'length' <<< "$website_matches")
  if [[ ${website_count:-0} -gt 1 ]]; then
    website_any_iap=$(yq eval -p=json -r '[.[] | select(.iap.enabled == true)] | length' <<< "$website_matches")
    if [[ $WEBSITE_IAP_ENABLED == "true" || ${website_any_iap:-0} -gt 0 ]]; then
      website_names=$(yq eval -p=json -r '[.[].name] | join(", ")' <<< "$website_matches")
      echo "Warning: Found $website_count GCE backend services matching 'website-mcs' ($website_names); cannot determine active backend for IAP parity." >&2
      echo "Inspect active MCI backends with: $inspect_cmd" >&2
    fi
    return 0
  fi

  local website_bs_name website_gce_iap website_client_id
  website_bs_name=$(yq eval -p=json -r '.[0].name // ""' <<< "$website_matches")
  website_gce_iap=$(yq eval -p=json -r '.[0].iap.enabled // "false"' <<< "$website_matches")
  website_client_id=$(yq eval -p=json -r '.[0].iap.oauth2ClientId // ""' <<< "$website_matches")

  if [[ $WEBSITE_IAP_ENABLED != "true" && $website_gce_iap != "true" ]]; then
    return 0
  fi

  # Inspect agentic GCE backend service(s).
  local agentic_matches agentic_count agentic_names
  agentic_matches=$(filter_gce_backends "$bs_json" "website-agentic-mcs")
  agentic_count=$(yq eval -p=json -r 'length' <<< "$agentic_matches")
  if [[ ${agentic_count:-0} -gt 1 ]]; then
    agentic_names=$(yq eval -p=json -r '[.[].name] | join(", ")' <<< "$agentic_matches")
    echo "Warning: Found $agentic_count GCE backend services matching 'website-agentic-mcs' ($agentic_names); cannot determine active backend for IAP parity." >&2
    echo "Inspect active MCI backends with: $inspect_cmd" >&2
    return 0
  fi

  local agentic_bs_name agentic_gce_iap agentic_client_id
  agentic_bs_name=$(yq eval -p=json -r '.[0].name // ""' <<< "$agentic_matches")
  agentic_gce_iap=$(yq eval -p=json -r '.[0].iap.enabled // "false"' <<< "$agentic_matches")
  agentic_client_id=$(yq eval -p=json -r '.[0].iap.oauth2ClientId // ""' <<< "$agentic_matches")

  # Case 1: Agentic IAP is not managed in Helm and the new MCS backend does not exist yet.
  if [[ $AGENTIC_IAP_ENABLED != "true" && -z $agentic_bs_name ]]; then
    echo "Warning: Main website MCI backend has IAP enabled, but no GCE backend service for 'website-agentic-mcs' exists yet in $PROJECT_ID (newly created MCS) and agentic.iap.enabled is not true." >&2
    echo "Once MCI provisions 'mci-*-website-website-agentic-mcs', enable IAP on it with the same OAuth client as '${website_bs_name:-website-mcs}' (or set 'agentic.iap.enabled: true' in $CONFIG_YAML) so agentic routes are not exposed without IAP." >&2
    return 0
  fi

  # Case 2: Agentic IAP is not managed in Helm and the existing agentic backend has IAP disabled.
  if [[ $AGENTIC_IAP_ENABLED != "true" && $agentic_gce_iap != "true" ]]; then
    echo "Warning: Main website MCI backend has IAP enabled, but '$agentic_bs_name' does NOT have IAP enabled." >&2
    echo "Set 'agentic.iap.enabled: true' in $CONFIG_YAML (sharing 'iap-secret') or enable IAP on '$agentic_bs_name' with the same OAuth client in GCP Console." >&2
    return 0
  fi

  # Case 3: Only website IAP is declarative (custom `iap-secret`), while live agentic uses Google-managed IAP.
  if [[ $WEBSITE_IAP_ENABLED == "true" && $AGENTIC_IAP_ENABLED != "true" && $agentic_gce_iap == "true" && -z $agentic_client_id ]]; then
    echo "Warning: 'website.iap.enabled' configures 'backendconfig' with custom OAuth secret 'iap-secret', while live '$agentic_bs_name' uses <Google-managed> IAP." >&2
    echo "Mismatched OAuth clients issue separate IAP session cookies on the same domain; align both backends to the same OAuth client (see docs/iap.md)." >&2
    return 0
  fi

  # Case 4: Only agentic IAP is declarative (custom `iap-secret`), while live website uses Google-managed IAP.
  if [[ $AGENTIC_IAP_ENABLED == "true" && $WEBSITE_IAP_ENABLED != "true" && $website_gce_iap == "true" && -z $website_client_id ]]; then
    echo "Warning: 'agentic.iap.enabled' configures 'backendconfig-agentic' with custom OAuth secret 'iap-secret', while live '$website_bs_name' uses <Google-managed> IAP." >&2
    echo "Mismatched OAuth clients issue separate IAP session cookies on the same domain; align both backends to the same OAuth client (see docs/iap.md)." >&2
    return 0
  fi

  # Case 5: Both live backends have IAP enabled, but currently use different OAuth clients.
  if [[ -n $agentic_bs_name && $website_gce_iap == "true" && $agentic_gce_iap == "true" && $website_client_id != "$agentic_client_id" ]]; then
    local website_oauth="${website_client_id:-<Google-managed>}"
    local agentic_oauth="${agentic_client_id:-<Google-managed>}"
    if [[ $WEBSITE_IAP_ENABLED == "true" && $AGENTIC_IAP_ENABLED == "true" ]]; then
      echo "Note: Live GCE IAP OAuth clients currently differ ('$website_bs_name': '$website_oauth', '$agentic_bs_name': '$agentic_oauth')." >&2
      echo "Both BackendConfigs now reference 'iap-secret'; allow ~1-2 minutes for MCI to sync, then confirm parity with: $inspect_cmd" >&2
    else
      echo "Warning: Live GCE IAP OAuth clients differ between '$website_bs_name' ('$website_oauth') and '$agentic_bs_name' ('$agentic_oauth')." >&2
      echo "Mismatched OAuth clients issue separate IAP session cookies on the same domain, which breaks same-host chart/API requests from /labs/discover." >&2
      echo "Set both 'website.iap.enabled: true' and 'agentic.iap.enabled: true' in $CONFIG_YAML (sharing 'iap-secret') or align both backends to the same OAuth client in IAP Console." >&2
    fi
  fi
}

# Parse command-line options (supporting both -d and --dry-run, plus combined short flags).
NORMALIZED_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      NORMALIZED_ARGS+=("-d")
      ;;
    --help)
      NORMALIZED_ARGS+=("-h")
      ;;
    --)
      NORMALIZED_ARGS+=("$@")
      break
      ;;
    --*)
      echo "Unknown option: $1" >&2
      help
      ;;
    *)
      NORMALIZED_ARGS+=("$1")
      ;;
  esac
  shift
done
if [[ ${#NORMALIZED_ARGS[@]} -gt 0 ]]; then
  set -- "${NORMALIZED_ARGS[@]}"
else
  set --
fi

ENV=""
LOCATION=""
SETUP_NODEJS=""
FORCE_IP_CHANGE=""
DRY_RUN=""
OPTIND=1
while getopts ":e:l:nfdh?" OPTION; do
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
    d)
      DRY_RUN=true
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
AGENTIC_SECURITY_POLICY=$(get_helm_value '.agentic.securityPolicy // ""')
SECURITY_POLICY_NAME_REGEX='^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$'
if [[ $AGENTIC_ENABLED == "true" && -n $AGENTIC_SECURITY_POLICY ]]; then
  if [[ ! $AGENTIC_SECURITY_POLICY =~ $SECURITY_POLICY_NAME_REGEX ]]; then
    echo "Error: 'agentic.securityPolicy' in $CONFIG_YAML ('$AGENTIC_SECURITY_POLICY') must be a valid Cloud Armor policy name (RFC 1035 lowercase label, 1-63 chars, no '/')." >&2
    exit 1
  fi
fi

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
apply_security_policy_to_backendconfig
if [[ $AGENTIC_ENABLED == "true" && $DISCOVER_ENABLED == "true" ]]; then
  DISCOVER_WILDCARD_PATH="${DISCOVER_BASE_PATH}/*"
  DISCOVER_BASE_PATH="$DISCOVER_BASE_PATH" yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>").path) = strenv(DISCOVER_BASE_PATH)' mci.yaml
  DISCOVER_WILDCARD_PATH="$DISCOVER_WILDCARD_PATH" yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>/*").path) = strenv(DISCOVER_WILDCARD_PATH)' mci.yaml
else
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>" or .path == "<DISCOVER_BASE_PATH>/*"))' mci.yaml
fi

# Verify required IAP secret and Cloud Armor policy exist, and guard against stripping
# live BackendConfig IAP / Cloud Armor securityPolicy or drifting MCI pre-shared-certs.
verify_iap_secret_exists
verify_security_policy_exists
guard_live_backendconfig_iap
guard_live_backendconfig_security_policy
guard_live_mci_pre_shared_certs

# Collect manifests to apply (or preview via kubectl diff in --dry-run mode).
MANIFESTS=(backendconfig.yaml mci.yaml website_mcs.yaml)
if [[ $SETUP_NODEJS == "true" ]]; then
  MANIFESTS+=(website_nodejs_mcs.yaml)
fi
if [[ $AGENTIC_ENABLED == "true" ]]; then
  MANIFESTS+=(website_agentic_mcs.yaml)
fi

if [[ $DRY_RUN == "true" ]]; then
  echo "Dry run (-d/--dry-run): all pre-apply validations and guards passed; previewing changes with kubectl diff..."
  has_diffs="false"
  for manifest in "${MANIFESTS[@]}"; do
    diff_rc=0
    kubectl diff -f "$manifest" || diff_rc=$?
    if [[ $diff_rc -eq 1 ]]; then
      has_diffs="true"
    elif [[ $diff_rc -ne 0 ]]; then
      echo "Error: kubectl diff failed for $manifest (exit code $diff_rc)." >&2
      exit "$diff_rc"
    fi
  done
  if [[ $has_diffs != "true" ]]; then
    echo "No differences detected against live cluster resources."
  fi
  warn_gce_agentic_iap_mismatch
  echo "Dry run complete; no changes were applied."
  exit 0
fi

# Apply Multi-Cluster Ingress, Multi-Cluster Services, and BackendConfigs.
for manifest in "${MANIFESTS[@]}"; do
  kubectl apply -f "$manifest"
done

warn_gce_agentic_iap_mismatch

# Check the status: `kubectl describe mci website-mci -n website`

