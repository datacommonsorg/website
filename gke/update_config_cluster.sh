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
# BackendConfig manifests to the Fleet config cluster, and syncs
# BackendConfig manifests to all other READY Fleet member clusters matching
# cluster_prefix before applying MCI/MCS changes.

set -e

function help {
  echo "Usage: $0 -e <ENV> [-l <REGION>] [-n] [-f] [--force-cert-change] [-d|--dry-run]"
  echo "  -e <ENV>             Instance environment as defined under ../deploy/helm_charts/envs"
  echo "  -l <REGION>          GKE region of the config cluster (default: us-central1)"
  echo "  -n                   Setup nodejs service"
  echo "  -f                   Allow replacing a live website-mci static IP if it differs from resolved IP"
  echo "  --force-cert-change  Allow replacing live website-mci pre-shared-certs if they differ from ingress.certName"
  echo "  -d, --dry-run        Run all validations and live guards, then preview changes via kubectl diff without applying"
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
  local ctx="$1"
  local cluster_label="$2"
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
  if ! secret_out=$(kubectl --context="$ctx" get secret iap-secret -n website -o yaml 2>&1); then
    if [[ $secret_out == *"NotFound"* || $secret_out == *"not found"* ]]; then
      echo "Error: IAP is enabled in $CONFIG_YAML, but Kubernetes Secret 'iap-secret' was not found in namespace 'website' on cluster '$cluster_label' (project $PROJECT_ID, context '$ctx')." >&2
      echo "Create 'iap-secret' with 'client_id' and 'client_secret' on cluster '$cluster_label' (using kubectl --context=\"$ctx\"; see docs/iap.md) before re-running." >&2
    else
      echo "Error: Failed to verify Kubernetes Secret 'iap-secret' in namespace 'website' on cluster '$cluster_label' (project $PROJECT_ID, context '$ctx'): $secret_out" >&2
    fi
    exit 1
  fi

  local client_id client_secret
  client_id=$(yq eval -r '.data.client_id // ""' - <<< "$secret_out")
  client_secret=$(yq eval -r '.data.client_secret // ""' - <<< "$secret_out")
  if [[ -z $client_id || -z $client_secret ]]; then
    echo "Error: Kubernetes Secret 'iap-secret' in namespace 'website' on cluster '$cluster_label' (project $PROJECT_ID, context '$ctx') is missing non-empty 'client_id' and/or 'client_secret' keys (update with kubectl --context=\"$ctx\"; see docs/iap.md)." >&2
    exit 1
  fi
}

# Fail fast if applying backendconfig.yaml would strip spec.iap.enabled: true from a live
# BackendConfig or downgrade custom oauthclientCredentials to Google-managed OAuth in-place
# (unsupported by GKE BackendConfig without recreating the backend).
function guard_live_backendconfig_iap {
  local ctx="$1"
  local cluster_label="$2"
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

    live_bc=$(kubectl --context="$ctx" get backendconfig "$bc_name" -n website --ignore-not-found -o yaml)
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
      echo "Error: Live BackendConfig '$bc_name' on cluster '$cluster_label' (project $PROJECT_ID, context '$ctx') has spec.iap.enabled=true, which would be stripped by applying backendconfig.yaml." >&2
      echo "$flag_hint; to turn IAP off, disable it in GCE (or via spec.iap.enabled=false) and remove spec.iap from the live BackendConfig on '$cluster_label' first (kubectl --context=\"$ctx\" -n website)." >&2
      exit 1
    fi

    live_secret=$(yq eval -r '.spec.iap.oauthclientCredentials.secretName // ""' - <<< "$live_bc")
    rendered_secret=$(yq eval -r '.spec.iap.oauthclientCredentials.secretName // ""' - <<< "$rendered_bc")
    if [[ -n $live_secret && -z $rendered_secret ]]; then
      echo "Error: Live BackendConfig '$bc_name' on cluster '$cluster_label' (project $PROJECT_ID, context '$ctx') uses custom IAP OAuth secret '$live_secret', but rendered backendconfig.yaml switches it to <Google-managed>." >&2
      echo "GKE BackendConfig does not support switching from custom oauthclientCredentials to Google-managed OAuth in-place (requires recreating the backend); reconcile manually on '$cluster_label' (kubectl --context=\"$ctx\" -n website) before re-running." >&2
      exit 1
    elif [[ $live_secret != "$rendered_secret" ]]; then
      echo "Note: Updating BackendConfig '$bc_name' on cluster '$cluster_label' IAP OAuth credential from '${live_secret:-<Google-managed>}' to '$rendered_secret'." >&2
    fi
  done <<< "$bc_names"
}

# Inject spec.securityPolicy.name into rendered BackendConfigs when configured in Helm config.
# When empty, spec.securityPolicy is omitted so Console-managed policies are left untouched.
function apply_security_policy_to_backendconfig {
  if [[ -n $WEBSITE_SECURITY_POLICY ]]; then
    POLICY_NAME="$WEBSITE_SECURITY_POLICY" yq eval -i \
      'with(select(.metadata.name == "backendconfig"); .spec.securityPolicy.name = strenv(POLICY_NAME))' \
      backendconfig.yaml
  fi
  if [[ $AGENTIC_ENABLED == "true" && -n $AGENTIC_SECURITY_POLICY ]]; then
    POLICY_NAME="$AGENTIC_SECURITY_POLICY" yq eval -i \
      'with(select(.metadata.name == "backendconfig-agentic"); .spec.securityPolicy.name = strenv(POLICY_NAME))' \
      backendconfig.yaml
  fi
}

# Fail fast if any configured Cloud Armor policy is missing or not a backend (CLOUD_ARMOR) policy.
function verify_security_policy_exists {
  local policies=()
  if [[ -n $WEBSITE_SECURITY_POLICY ]]; then
    policies+=("$WEBSITE_SECURITY_POLICY")
  fi
  if [[ $AGENTIC_ENABLED == "true" && -n $AGENTIC_SECURITY_POLICY && $AGENTIC_SECURITY_POLICY != "$WEBSITE_SECURITY_POLICY" ]]; then
    policies+=("$AGENTIC_SECURITY_POLICY")
  fi
  if [[ ${#policies[@]} -eq 0 ]]; then
    return 0
  fi

  local policy err_file policy_type policy_err rc
  for policy in "${policies[@]}"; do
    rc=0
    err_file=$(mktemp)
    policy_type=$(gcloud compute security-policies describe "$policy" \
      --global \
      --project="$PROJECT_ID" \
      --format='value(type)' 2>"$err_file") || rc=$?
    policy_err=$(cat "$err_file")
    rm -f "$err_file"

    if [[ $rc -ne 0 ]]; then
      if [[ $policy_err == *"NOT_FOUND"* || $policy_err == *"not found"* ]]; then
        echo "Error: Cloud Armor security policy '$policy' was not found in project $PROJECT_ID." >&2
        echo "Provision '$policy' (e.g. via Terraform) before attaching it to a BackendConfig." >&2
      else
        echo "Error: Failed to verify Cloud Armor security policy '$policy' in project $PROJECT_ID: $policy_err" >&2
      fi
      exit 1
    fi

    policy_type="${policy_type%$'\r'}"
    if [[ -n $policy_type && $policy_type != "CLOUD_ARMOR" ]]; then
      echo "Error: Cloud Armor security policy '$policy' in project $PROJECT_ID has type '$policy_type'; BackendConfig requires a backend security policy (type 'CLOUD_ARMOR')." >&2
      exit 1
    fi
  done
}

# Fail fast if applying backendconfig.yaml would strip spec.securityPolicy.name from a live BackendConfig.
function guard_live_backendconfig_security_policy {
  local ctx="$1"
  local cluster_label="$2"
  local bc_names
  bc_names=$(yq eval -N -r '.metadata.name // ""' backendconfig.yaml)
  if [[ -z $bc_names ]]; then
    echo "Error: No BackendConfig resources found in rendered backendconfig.yaml." >&2
    exit 1
  fi

  local bc_name live_bc live_policy rendered_policy
  while IFS= read -r bc_name; do
    [[ -z $bc_name ]] && continue

    live_bc=$(kubectl --context="$ctx" get backendconfig "$bc_name" -n website --ignore-not-found -o yaml)
    [[ -z $live_bc ]] && continue

    live_policy=$(yq eval -r '.spec.securityPolicy.name // ""' - <<< "$live_bc")
    if [[ -z $live_policy ]]; then
      continue
    fi

    rendered_policy=$(BC_NAME="$bc_name" yq eval -N -r 'select(.metadata.name == strenv(BC_NAME)) | .spec.securityPolicy.name // ""' backendconfig.yaml)
    if [[ -z $rendered_policy ]]; then
      echo "Error: Live BackendConfig '$bc_name' on cluster '$cluster_label' (project $PROJECT_ID, context '$ctx') has spec.securityPolicy.name='$live_policy', which would be stripped by applying backendconfig.yaml." >&2
      if [[ $bc_name == "backendconfig" ]]; then
        echo "Set 'website.securityPolicy: \"$live_policy\"' in $CONFIG_YAML to preserve it declaratively." >&2
      elif [[ $bc_name == "backendconfig-agentic" ]]; then
        echo "Set 'agentic.securityPolicy: \"$live_policy\"' in $CONFIG_YAML to preserve it declaratively." >&2
      else
        echo "Preserve spec.securityPolicy on '$bc_name' to keep it attached." >&2
      fi
      echo "If intentionally detaching '$live_policy' on cluster '$cluster_label' (kubectl --context=\"$ctx\" -n website), note that removing spec.securityPolicy alone leaves it attached in GCE:" >&2
      echo '  1. Set spec.securityPolicy.name="" on the live BackendConfig and wait for GCE reconciliation' >&2
      echo '     (or detach it on the GCE BackendService directly).' >&2
      echo '  2. Then remove spec.securityPolicy from the live BackendConfig.' >&2
      exit 1
    elif [[ $live_policy != "$rendered_policy" ]]; then
      echo "Note: Updating BackendConfig '$bc_name' on cluster '$cluster_label' Cloud Armor securityPolicy from '$live_policy' to '$rendered_policy'." >&2
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

# Fail fast if any SSL certificate referenced in mci.yaml pre-shared-certs does not exist in GCP.
function verify_pre_shared_certs_exist {
  if [[ -z $PRE_SHARED_CERTS ]]; then
    return 0
  fi

  local cert cert_err
  local certs=()
  IFS=',' read -r -a certs <<< "$PRE_SHARED_CERTS"
  for cert in "${certs[@]}"; do
    if ! cert_err=$(gcloud compute ssl-certificates describe "$cert" \
      --global \
      --project="$PROJECT_ID" \
      --format=none 2>&1); then
      if [[ $cert_err == *"NOT_FOUND"* || $cert_err == *"not found"* ]]; then
        echo "Error: Global SSL certificate '$cert' (from ingress.certName in $CONFIG_YAML) was not found in project $PROJECT_ID." >&2
        echo "Verify existing certificates with: gcloud compute ssl-certificates list --global --project=$PROJECT_ID" >&2
      else
        echo "Error: Failed to verify global SSL certificate '$cert' in project $PROJECT_ID: $cert_err" >&2
      fi
      exit 1
    fi
  done
}

# Fail fast if applying mci.yaml would change live website-mci pre-shared-certs unless --force-cert-change is set.
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
    if [[ $FORCE_CERT_CHANGE == "true" ]]; then
      echo "Warning: Replacing live website-mci pre-shared-certs ('$live_certs' -> '${rendered_certs:-<unset>}') in project $PROJECT_ID (--force-cert-change specified)." >&2
    else
      echo "Error: Rendered website-mci pre-shared-certs ('${rendered_certs:-<unset>}') does not match live website-mci ('$live_certs') in project $PROJECT_ID." >&2
      echo "Verify $CONFIG_YAML (.ingress.certName) matches the live certificates, or re-run with --force-cert-change to intentionally update the ingress certificates." >&2
      exit 1
    fi
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

# ==============================================================================
# Multi-cluster Fleet helpers
# Each entry in MEMBER_CLUSTERS is "cluster_name|location|kubectl_context".
# ==============================================================================

# Fetch GKE credentials for one cluster and print its resolved kubectl context.
function fetch_cluster_context {
  local cluster="$1"
  local location="$2"
  if ! gcloud container clusters get-credentials "$cluster" \
    --location="$location" --project="$PROJECT_ID" >/dev/null; then
    echo "Error: Failed to fetch GKE credentials for cluster '$cluster' ($location) in project $PROJECT_ID." >&2
    exit 1
  fi
  local ctx
  if ! ctx=$(kubectl config current-context) || [[ -z $ctx ]]; then
    echo "Error: Failed to resolve kubectl context for cluster '$cluster' ($location)." >&2
    exit 1
  fi
  printf '%s\n' "$ctx"
}

# Discover all other READY Fleet member clusters in $PROJECT_ID matching
# "${CLUSTER_PREFIX}-*", populate MEMBER_CLUSTERS (sorted by resource link),
# and connect to the Fleet config cluster last so current-context stays on it.
function discover_and_connect_clusters {
  MEMBER_CLUSTERS=()

  local memberships_json err_file memberships_err rc=0
  err_file=$(mktemp)
  memberships_json=$(gcloud container fleet memberships list \
    --project="$PROJECT_ID" \
    --format=json 2>"$err_file") || rc=$?
  memberships_err=$(cat "$err_file")
  rm -f "$err_file"
  if [[ $rc -ne 0 ]]; then
    echo "Error: Failed to list Fleet memberships in project $PROJECT_ID: $memberships_err" >&2
    exit 1
  fi

  local entries
  entries=$(yq eval -p=json -r '
    sort_by(.endpoint.gkeCluster.resourceLink // "") |
    .[] | [(.name // ""), (.state.code // ""), (.endpoint.gkeCluster.resourceLink // "")] | join("|")
  ' <<< "${memberships_json:-[]}")

  local mem_name mem_state resource_link link_project link_location link_cluster member_ctx
  while IFS='|' read -r mem_name mem_state resource_link; do
    [[ -z $resource_link ]] && continue
    # GKE resourceLink uses /locations/<region-or-zone>/ (for both regional and
    # zonal clusters) or legacy /zones/<zone>/; container.googleapis.com has no
    # /regions/ path segment.
    if [[ ! $resource_link =~ ^//container\.googleapis\.com/projects/([^/]+)/(locations|zones)/([^/]+)/clusters/([^/]+)$ ]]; then
      echo "Warning: Skipping Fleet membership '${mem_name:-<unnamed>}' with unrecognized GKE resourceLink '$resource_link'." >&2
      continue
    fi
    link_project="${BASH_REMATCH[1]}"
    link_location="${BASH_REMATCH[3]}"
    link_cluster="${BASH_REMATCH[4]}"

    if [[ $link_project != "$PROJECT_ID" ]]; then
      echo "Note: Skipping Fleet membership '${mem_name:-<unnamed>}' (project '$link_project' != '$PROJECT_ID')." >&2
      continue
    fi
    if [[ $link_cluster != "${CLUSTER_PREFIX}-"* ]]; then
      echo "Note: Skipping Fleet member cluster '$link_cluster' ($link_location): does not match prefix '${CLUSTER_PREFIX}-'." >&2
      continue
    fi
    if [[ $link_cluster == "$CLUSTER_NAME" && $link_location == "$LOCATION" ]]; then
      continue
    fi
    if [[ $mem_state != "READY" ]]; then
      echo "Error: Fleet member cluster '$link_cluster' ($link_location) in project $PROJECT_ID has membership state '${mem_state:-UNKNOWN}' (expected READY); refusing to leave BackendConfig out of sync across member clusters." >&2
      exit 1
    fi

    member_ctx=$(fetch_cluster_context "$link_cluster" "$link_location")
    MEMBER_CLUSTERS+=("${link_cluster}|${link_location}|${member_ctx}")
  done <<< "$entries"

  CONFIG_CTX=$(fetch_cluster_context "$CLUSTER_NAME" "$LOCATION")
  CONFIG_CLUSTER_LABEL="$CLUSTER_NAME ($LOCATION)"
}

# Warn if agentic.clusterCount in Helm config disagrees with discovered Fleet clusters.
function warn_agentic_cluster_count_mismatch {
  local total_clusters=$((1 + ${#MEMBER_CLUSTERS[@]}))
  local configured_count
  configured_count=$(get_helm_value '.agentic.clusterCount // ""')
  if [[ $AGENTIC_ENABLED == "true" && -n $configured_count && $configured_count != "null" && $configured_count != "$total_clusters" ]]; then
    echo "Warning: agentic.clusterCount in $CONFIG_YAML is $configured_count, but discovered $total_clusters Fleet member cluster(s) matching '${CLUSTER_PREFIX}-*' in $PROJECT_ID (dailyTokenBudget per-pod math assumes $configured_count cluster(s))." >&2
  fi
}

# Run all live BackendConfig pre-apply guards on every cluster before applying anything.
function validate_all_cluster_backendconfigs {
  local entry c_name c_loc c_ctx c_label
  for entry in "${MEMBER_CLUSTERS[@]}"; do
    IFS='|' read -r c_name c_loc c_ctx <<< "$entry"
    c_label="$c_name ($c_loc)"
    echo "Validating BackendConfigs on Fleet member cluster '$c_label'..." >&2
    verify_iap_secret_exists "$c_ctx" "$c_label"
    guard_live_backendconfig_iap "$c_ctx" "$c_label"
    guard_live_backendconfig_security_policy "$c_ctx" "$c_label"
  done
  echo "Validating BackendConfigs on Fleet config cluster '$CONFIG_CLUSTER_LABEL'..." >&2
  verify_iap_secret_exists "$CONFIG_CTX" "$CONFIG_CLUSTER_LABEL"
  guard_live_backendconfig_iap "$CONFIG_CTX" "$CONFIG_CLUSTER_LABEL"
  guard_live_backendconfig_security_policy "$CONFIG_CTX" "$CONFIG_CLUSTER_LABEL"
}

# Preview kubectl diff for one cluster's manifests. Sets HAS_DIFFS="true" on any diff.
function diff_manifests_on_cluster {
  local ctx="$1"
  local label="$2"
  shift 2
  local manifest diff_rc
  for manifest in "$@"; do
    diff_rc=0
    kubectl --context="$ctx" diff -f "$manifest" || diff_rc=$?
    if [[ $diff_rc -eq 1 ]]; then
      HAS_DIFFS="true"
    elif [[ $diff_rc -ne 0 ]]; then
      echo "Error: kubectl diff failed for $manifest on cluster '$label' (exit code $diff_rc)." >&2
      exit "$diff_rc"
    fi
  done
}

# Preview diffs across all non-config member clusters (BackendConfig only) and the config cluster.
function preview_all_cluster_diffs {
  echo "Dry run (-d/--dry-run): all pre-apply validations and guards passed; previewing changes with kubectl diff..."
  HAS_DIFFS="false"
  local entry c_name c_loc c_ctx
  for entry in "${MEMBER_CLUSTERS[@]}"; do
    IFS='|' read -r c_name c_loc c_ctx <<< "$entry"
    echo "=== Fleet member cluster: $c_name ($c_loc) (BackendConfig only) ==="
    diff_manifests_on_cluster "$c_ctx" "$c_name ($c_loc)" backendconfig.yaml
  done
  echo "=== Fleet config cluster: $CONFIG_CLUSTER_LABEL ==="
  diff_manifests_on_cluster "$CONFIG_CTX" "$CONFIG_CLUSTER_LABEL" "${MANIFESTS[@]}"
  if [[ $HAS_DIFFS != "true" ]]; then
    echo "No differences detected against live cluster resources."
  fi
  warn_gce_agentic_iap_mismatch
  echo "Dry run complete; no changes were applied."
}

# Apply BackendConfig to all non-config member clusters FIRST, then apply
# BackendConfig, MCI, and MCS manifests to the Fleet config cluster.
function apply_all_clusters {
  local entry c_name c_loc c_ctx
  for entry in "${MEMBER_CLUSTERS[@]}"; do
    IFS='|' read -r c_name c_loc c_ctx <<< "$entry"
    echo "Syncing BackendConfig to Fleet member cluster '$c_name ($c_loc)'..."
    kubectl --context="$c_ctx" apply -f backendconfig.yaml
  done
  echo "Applying MCI, MCS, and BackendConfig to Fleet config cluster '$CONFIG_CLUSTER_LABEL'..."
  local manifest
  for manifest in "${MANIFESTS[@]}"; do
    kubectl --context="$CONFIG_CTX" apply -f "$manifest"
  done
}

# Parse command-line options (supporting both short and long flags, plus combined short flags).
FORCE_CERT_CHANGE=""
NORMALIZED_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      NORMALIZED_ARGS+=("-d")
      ;;
    --force-cert-change)
      FORCE_CERT_CHANGE=true
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
WEBSITE_SECURITY_POLICY=$(get_helm_value '.website.securityPolicy // ""')
AGENTIC_SECURITY_POLICY=$(get_helm_value '.agentic.securityPolicy // ""')
RFC1035_LABEL_REGEX='^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$'
if [[ -n $WEBSITE_SECURITY_POLICY && ! $WEBSITE_SECURITY_POLICY =~ $RFC1035_LABEL_REGEX ]]; then
  echo "Error: 'website.securityPolicy' in $CONFIG_YAML ('$WEBSITE_SECURITY_POLICY') must be a valid Cloud Armor policy name (RFC 1035 lowercase label, 1-63 chars, no '/')." >&2
  exit 1
fi
if [[ $AGENTIC_ENABLED == "true" && -n $AGENTIC_SECURITY_POLICY ]]; then
  if [[ ! $AGENTIC_SECURITY_POLICY =~ $RFC1035_LABEL_REGEX ]]; then
    echo "Error: 'agentic.securityPolicy' in $CONFIG_YAML ('$AGENTIC_SECURITY_POLICY') must be a valid Cloud Armor policy name (RFC 1035 lowercase label, 1-63 chars, no '/')." >&2
    exit 1
  fi
fi

RAW_PRE_SHARED_CERTS=$(get_helm_value '.ingress.certName // ""')
if [[ -z $RAW_PRE_SHARED_CERTS ]]; then
  echo "Error: 'ingress.certName' is missing or empty in $CONFIG_YAML and $DEFAULT_VALUES_YAML." >&2
  exit 1
fi
if [[ $RAW_PRE_SHARED_CERTS == *, ]]; then
  echo "Error: 'ingress.certName' in $CONFIG_YAML ('$RAW_PRE_SHARED_CERTS') must not end with a trailing comma." >&2
  exit 1
fi
PRE_SHARED_CERTS=""
SEEN_CERTS=","
IFS=',' read -r -a RAW_CERT_ARRAY <<< "$RAW_PRE_SHARED_CERTS"
for raw_cert in "${RAW_CERT_ARRAY[@]}"; do
  trimmed_cert=$(printf '%s' "$raw_cert" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [[ -z $trimmed_cert || ! $trimmed_cert =~ $RFC1035_LABEL_REGEX ]]; then
    echo "Error: 'ingress.certName' in $CONFIG_YAML ('$RAW_PRE_SHARED_CERTS') contains invalid certificate name '$trimmed_cert' (expected comma-separated RFC 1035 lowercase labels, 1-63 chars, no '/')." >&2
    exit 1
  fi
  if [[ $SEEN_CERTS == *",$trimmed_cert,"* ]]; then
    echo "Error: 'ingress.certName' in $CONFIG_YAML ('$RAW_PRE_SHARED_CERTS') contains duplicate certificate name '$trimmed_cert'." >&2
    exit 1
  fi
  SEEN_CERTS+="${trimmed_cert},"
  if [[ -n $PRE_SHARED_CERTS ]]; then
    PRE_SHARED_CERTS+=",${trimmed_cert}"
  else
    PRE_SHARED_CERTS="$trimmed_cert"
  fi
done

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

# Discover additional Fleet member clusters and fetch credentials (ending on the config cluster).
discover_and_connect_clusters
warn_agentic_cluster_count_mismatch

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
EXISTING_MCI=$(kubectl --context="$CONFIG_CTX" get mci website-mci -n website --ignore-not-found -o yaml)
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
PRE_SHARED_CERTS="$PRE_SHARED_CERTS" yq eval -i '.metadata.annotations."networking.gke.io/pre-shared-certs" = strenv(PRE_SHARED_CERTS)' mci.yaml

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

# Verify required IAP secret, Cloud Armor policies, and SSL certificates exist, and guard against
# stripping live BackendConfig IAP / Cloud Armor securityPolicy on every target cluster or drifting
# MCI pre-shared-certs on the config cluster before applying anything.
verify_security_policy_exists
verify_pre_shared_certs_exist
validate_all_cluster_backendconfigs
guard_live_mci_pre_shared_certs

# Collect manifests to apply to the Fleet config cluster (or preview via kubectl diff in --dry-run mode).
MANIFESTS=(backendconfig.yaml mci.yaml website_mcs.yaml)
if [[ $SETUP_NODEJS == "true" ]]; then
  MANIFESTS+=(website_nodejs_mcs.yaml)
fi
if [[ $AGENTIC_ENABLED == "true" ]]; then
  MANIFESTS+=(website_agentic_mcs.yaml)
fi

if [[ $DRY_RUN == "true" ]]; then
  preview_all_cluster_diffs
  exit 0
fi

apply_all_clusters
warn_gce_agentic_iap_mismatch

# Check the status: `kubectl describe mci website-mci -n website`

