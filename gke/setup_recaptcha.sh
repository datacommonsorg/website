#!/bin/bash
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

# Provisions the reCAPTCHA Enterprise API and Cloud Armor WAF Web site keys
# required by agentic apps (e.g. Discover) for an environment. Invoked
# automatically by `./setup_agentic.sh <ENV>`, and safe to run standalone when
# inspecting, validating, or rotating WAF keys.
#
# Usage:
#   ./setup_recaptcha.sh <ENV>
# Example:
#   ./setup_recaptcha.sh autopush

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# Display names for the two Cloud Armor WAF keys provisioned per environment.
DISCOVER_SESSION_WAF_KEY_NAME="discover-session-waf-key"
DISCOVER_CHECKBOX_WAF_KEY_NAME="discover-checkbox-waf-key"

usage() {
  echo "Usage: ./setup_recaptcha.sh <ENV>"
  echo "  <ENV>  Environment name under deploy/helm_charts/envs/ (e.g. autopush, staging, prod)"
}

if ! command -v yq >/dev/null 2>&1; then
  echo "Error: 'yq' (version 4.x) is required. See gke/README.md." >&2
  exit 1
fi

ENV=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    -*)
      echo "Error: Unknown option '$1'." >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "$ENV" ]]; then
        echo "Error: Unexpected extra argument '$1'." >&2
        usage >&2
        exit 1
      fi
      ENV="$1"
      shift
      ;;
  esac
done

if [[ -z "$ENV" ]]; then
  echo "Missing required <ENV> argument." >&2
  usage >&2
  exit 1
fi

CONFIG_YAML="${DIR}/../deploy/helm_charts/envs/${ENV}.yaml"
if [[ ! -f "$CONFIG_YAML" ]]; then
  echo "Environment config not found: $CONFIG_YAML" >&2
  exit 1
fi

PROJECT_ID=$(yq eval '.project' "$CONFIG_YAML")
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "Error: 'project' is missing or null in $CONFIG_YAML" >&2
  exit 1
fi

DOMAIN=$(yq eval '.domain // ""' "$CONFIG_YAML")
if [[ "$DOMAIN" == "null" ]]; then
  DOMAIN=""
fi
if [[ -n "$DOMAIN" ]]; then
  # Validate that .domain is a single bare hostname (no wildcards, commas,
  # scheme, port, path, or trailing dot) and normalize to lowercase.
  if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$ ]]; then
    echo "Error: 'domain' in ${CONFIG_YAML} ('${DOMAIN}') must be a single bare hostname (e.g. 'autopush.datacommons.org') without wildcards, commas, scheme, port, path, or trailing dot." >&2
    exit 1
  fi
  DOMAIN=$(printf '%s' "$DOMAIN" | LC_ALL=C tr 'A-Z' 'a-z')
fi

# List existing reCAPTCHA keys as JSON, retrying briefly if the newly enabled
# API has not yet propagated across backends.
LIST_ERR_FILE=""
cleanup() {
  if [[ -n "$LIST_ERR_FILE" ]]; then
    rm -f "$LIST_ERR_FILE"
  fi
}
trap cleanup EXIT

list_recaptcha_keys_json() {
  local max_attempts=3
  local sleep_secs="${RECAPTCHA_LIST_RETRY_SLEEP_SECS:-3}"
  local attempt=1
  LIST_ERR_FILE=$(mktemp)

  while true; do
    local output
    if output=$(gcloud recaptcha keys list --project="$PROJECT_ID" --format=json 2>"$LIST_ERR_FILE"); then
      rm -f "$LIST_ERR_FILE"
      LIST_ERR_FILE=""
      printf '%s\n' "$output"
      return 0
    fi

    local err_msg
    err_msg=$(cat "$LIST_ERR_FILE")
    if [[ "$attempt" -lt "$max_attempts" && "$err_msg" =~ SERVICE_DISABLED|has[[:space:]]not[[:space:]]been[[:space:]]used[[:space:]]in[[:space:]]project|is[[:space:]]disabled ]]; then
      echo "Waiting for recaptchaenterprise.googleapis.com propagation in ${PROJECT_ID} (attempt ${attempt}/${max_attempts})..." >&2
      sleep "$sleep_secs"
      attempt=$((attempt + 1))
    else
      printf '%s\n' "$err_msg" >&2
      rm -f "$LIST_ERR_FILE"
      LIST_ERR_FILE=""
      return 1
    fi
  done
}

# Validate an existing reCAPTCHA Enterprise WAF key against the expected
# Cloud Armor settings, domain restriction, and absence of testing options.
#
# Args:
#   $1 key_json             - Single key JSON object from `gcloud recaptcha keys list`.
#   $2 display_name         - Key display name (for error messages).
#   $3 key_id               - Parsed `<SITE_KEY_ID>` suffix (for error messages).
#   $4 expected_integration - Expected API `webSettings.integrationType` (e.g. `SCORE`).
#   $5 expected_waf_feature - Expected API `wafSettings.wafFeature` (e.g. `SESSION_TOKEN`).
validate_existing_recaptcha_waf_key() {
  local key_json="$1"
  local display_name="$2"
  local key_id="$3"
  local expected_integration="$4"
  local expected_waf_feature="$5"

  # Read web, WAF, domain, and testing fields from the matched key JSON.
  local actual_integration actual_waf_service actual_waf_feature allow_all_domains domain_match_count allowed_domains_display has_testing_options
  actual_integration=$(yq eval -p=json '.webSettings.integrationType // ""' <<< "$key_json")
  actual_waf_service=$(yq eval -p=json '.wafSettings.wafService // ""' <<< "$key_json")
  actual_waf_feature=$(yq eval -p=json '.wafSettings.wafFeature // ""' <<< "$key_json")
  allow_all_domains=$(yq eval -p=json '.webSettings.allowAllDomains // false' <<< "$key_json")
  domain_match_count=$(EXPECTED_DOMAIN="$DOMAIN" yq eval -p=json '[(.webSettings.allowedDomains // [])[] | select((. | downcase) == (strenv(EXPECTED_DOMAIN) | downcase))] | length' <<< "$key_json")
  allowed_domains_display=$(yq eval -p=json '(.webSettings.allowedDomains // []) | join(", ")' <<< "$key_json")
  has_testing_options=$(yq eval -p=json '.testingOptions != null and ((.testingOptions.testingScore != null) or ((.testingOptions.testingChallenge // "") != "" and (.testingOptions.testingChallenge // "") != "TESTING_CHALLENGE_UNSPECIFIED"))' <<< "$key_json")

  # Verify integration type and Cloud Armor WAF settings match.
  # Mismatched WAF settings silently break Cloud Armor token evaluation and cannot
  # be modified in place after key creation.
  if [[ "$actual_integration" != "$expected_integration" || "$actual_waf_service" != "CA" || "$actual_waf_feature" != "$expected_waf_feature" ]]; then
    echo "Error: Existing reCAPTCHA key '${display_name}' (${key_id}) has unexpected configuration in ${PROJECT_ID}." >&2
    echo "  Expected: web integrationType=${expected_integration}, wafService=CA, wafFeature=${expected_waf_feature}" >&2
    echo "  Actual:   web integrationType=${actual_integration:-<unset>}, wafService=${actual_waf_service:-<unset>}, wafFeature=${actual_waf_feature:-<unset>}" >&2
    echo "Please delete or rename the mismatched key and re-run ./setup_recaptcha.sh ${ENV}." >&2
    exit 1
  fi

  # Reject keys with immutable testingOptions set.
  # Wiring a testing key into Cloud Armor silently fails open for bots or blocks real users.
  if [[ "$has_testing_options" == "true" ]]; then
    local testing_score testing_challenge
    testing_score=$(yq eval -p=json '.testingOptions.testingScore // "<unset>"' <<< "$key_json")
    testing_challenge=$(yq eval -p=json '.testingOptions.testingChallenge // "<unset>"' <<< "$key_json")
    echo "Error: Existing reCAPTCHA key '${display_name}' (${key_id}) has immutable testingOptions set in ${PROJECT_ID}." >&2
    echo "  Actual: testingScore=${testing_score}, testingChallenge=${testing_challenge}" >&2
    echo "Please delete or rename the testing key and re-run ./setup_recaptcha.sh ${ENV}." >&2
    exit 1
  fi

  # Verify the key is restricted to $DOMAIN so third-party origins cannot mint tokens.
  # Check membership (not exact array equality) so extra dev domains like `localhost`
  # can coexist alongside $DOMAIN.
  if [[ "$allow_all_domains" == "true" || "$domain_match_count" -eq 0 ]]; then
    echo "Error: Existing reCAPTCHA key '${display_name}' (${key_id}) is not restricted to domain '${DOMAIN}'." >&2
    echo "  Actual: allowAllDomains=${allow_all_domains}, allowedDomains=[${allowed_domains_display}]" >&2
    if [[ "$allow_all_domains" == "true" ]]; then
      echo "Please restrict it in Google Cloud console (enable domain verification) or run:" >&2
      echo "  gcloud recaptcha keys update ${key_id} --web --domains=${DOMAIN} --project=${PROJECT_ID}" >&2
      echo "  gcloud recaptcha keys update ${key_id} --web --no-allow-all-domains --project=${PROJECT_ID}" >&2
    else
      echo "Please update its allowed domains (note: '--domains' replaces the full comma-separated list; include any existing domains to preserve):" >&2
      echo "  gcloud recaptcha keys update ${key_id} --web --domains=${DOMAIN} --project=${PROJECT_ID}" >&2
    fi
    echo "Then re-run ./setup_recaptcha.sh ${ENV}." >&2
    exit 1
  fi
}

# Ensure a single Cloud Armor reCAPTCHA Enterprise Web WAF key exists for
# `$DOMAIN` and store its site key ID in the caller-named variable `$1`.
# Reads project context from `$PROJECT_ID`, `$DOMAIN`, `$ENV`, and
# `$RECAPTCHA_KEYS_JSON`.
#
# Args:
#   $1 out_var          - Caller variable name to populate via `printf -v`
#                         (keeps progress logs on stdout).
#   $2 display_name     - Human-readable key display name to look up or create.
#   $3 integration_type - CLI `--integration-type` value (`score` or `checkbox`).
#   $4 waf_feature      - CLI `--waf-feature` value (`session-token` or `action-token`).
ensure_recaptcha_waf_key() {
  local out_var="$1"
  local display_name="$2"
  local integration_type="$3"
  local waf_feature="$4"

  local keys_json="${RECAPTCHA_KEYS_JSON:-[]}"

  # Filter the project's keys once by exact displayName.
  # Pass the name via strenv to avoid YAML parsing or quoting issues in yq.
  local matching_keys_json match_count
  matching_keys_json=$(KEY_DISPLAY_NAME="$display_name" yq eval -p=json -o=json '[.[] | select(.displayName == strenv(KEY_DISPLAY_NAME))]' <<< "$keys_json")
  match_count=$(yq eval -p=json 'length' <<< "$matching_keys_json")

  # Check for duplicate display names.
  # reCAPTCHA Enterprise auto-generates key IDs and does not enforce unique
  # display names, so fail loudly rather than guessing.
  if [[ "$match_count" -gt 1 ]]; then
    local duplicate_names
    duplicate_names=$(yq eval -p=json '.[].name' <<< "$matching_keys_json")
    echo "Error: Found ${match_count} reCAPTCHA Enterprise keys named '${display_name}' in ${PROJECT_ID}:" >&2
    printf '%s\n' "$duplicate_names" | sed 's/^/  /' >&2
    echo "Please delete duplicate keys (via Google Cloud console or 'gcloud recaptcha keys delete <KEY_ID> --project=${PROJECT_ID}') and re-run ./setup_recaptcha.sh ${ENV}." >&2
    exit 1
  fi

  # Reuse and validate the existing key when exactly one match is found.
  if [[ "$match_count" -eq 1 ]]; then
    local existing_key_json existing_name key_id expected_integration expected_waf_feature existing_domains
    existing_key_json=$(yq eval -p=json -o=json '.[0]' <<< "$matching_keys_json")
    existing_name=$(yq eval -p=json '.name // ""' <<< "$existing_key_json")

    # Extract the `<SITE_KEY_ID>` suffix from `projects/<PROJECT_NUMBER>/keys/<SITE_KEY_ID>`.
    key_id="${existing_name##*/}"
    if [[ -z "$key_id" ]]; then
      echo "Error: Could not parse site key ID for existing reCAPTCHA key '${display_name}' (${existing_name})." >&2
      exit 1
    fi

    # Derive uppercase API enum names from CLI flags (Bash 3.2 / POSIX tr compatible).
    expected_integration=$(printf '%s' "$integration_type" | LC_ALL=C tr 'a-z-' 'A-Z_')
    expected_waf_feature=$(printf '%s' "$waf_feature" | LC_ALL=C tr 'a-z-' 'A-Z_')
    validate_existing_recaptcha_waf_key \
      "$existing_key_json" \
      "$display_name" \
      "$key_id" \
      "$expected_integration" \
      "$expected_waf_feature"

    existing_domains=$(yq eval -p=json '(.webSettings.allowedDomains // []) | join(", ")' <<< "$existing_key_json")
    echo "reCAPTCHA Enterprise WAF key '${display_name}' (${key_id}) already exists in ${PROJECT_ID} (allowedDomains: ${existing_domains})."
    printf -v "$out_var" '%s' "$key_id"
    return 0
  fi

  # Create a new domain-restricted Cloud Armor WAF Web key when none exists.
  echo "Creating reCAPTCHA Enterprise WAF key '${display_name}' (${integration_type}, ${waf_feature}) for ${DOMAIN} in ${PROJECT_ID}..."
  local created_name key_id
  created_name=$(gcloud recaptcha keys create \
    --display-name="$display_name" \
    --web \
    --domains="$DOMAIN" \
    --integration-type="$integration_type" \
    --waf-service=ca \
    --waf-feature="$waf_feature" \
    --project="$PROJECT_ID" \
    --format='value(name)')

  # Strip any trailing CR and keep only the `<SITE_KEY_ID>` suffix.
  created_name="${created_name%$'\r'}"
  key_id="${created_name##*/}"
  if [[ -z "$key_id" ]]; then
    echo "Error: Failed to parse created reCAPTCHA key ID for '${display_name}'." >&2
    exit 1
  fi

  echo "Created reCAPTCHA Enterprise WAF key '${display_name}' (${key_id}) in ${PROJECT_ID}."
  # Write the site key ID into the caller's variable so progress logs stay on stdout.
  printf -v "$out_var" '%s' "$key_id"
}

if [[ -z "$DOMAIN" ]]; then
  echo "Note: '.domain' is unset in ${CONFIG_YAML}; skipping reCAPTCHA Enterprise WAF key provisioning."
  exit 0
fi

# Enable the reCAPTCHA Enterprise API if not already enabled.
echo "Enabling recaptchaenterprise.googleapis.com in ${PROJECT_ID}..."
gcloud services enable recaptchaenterprise.googleapis.com --project="$PROJECT_ID"

# Fetch existing keys once and ensure both Cloud Armor WAF site keys exist.
RECAPTCHA_KEYS_JSON=$(list_recaptcha_keys_json)
SESSION_WAF_KEY_ID=""
CHECKBOX_WAF_KEY_ID=""
ensure_recaptcha_waf_key SESSION_WAF_KEY_ID "$DISCOVER_SESSION_WAF_KEY_NAME" "score" "session-token"
ensure_recaptcha_waf_key CHECKBOX_WAF_KEY_ID "$DISCOVER_CHECKBOX_WAF_KEY_NAME" "checkbox" "action-token"

echo "reCAPTCHA Enterprise WAF site keys for ${ENV} (${DOMAIN}):"
echo "  agentic.recaptchaSessionSiteKey:  ${SESSION_WAF_KEY_ID}"
echo "  agentic.recaptchaCheckboxSiteKey: ${CHECKBOX_WAF_KEY_ID}"
echo "Pass these site keys to Cloud Armor Terraform (discover-armor-policy) and deploy/helm_charts/envs/${ENV}.yaml."
