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

# bash script to run website periodic tests

set -e

echo "Website domain: $WEB_API_ROOT"
echo "Nodejs domain: $NODEJS_API_ROOT"
echo "Testing env: $TESTING_ENV"

export GOOGLE_CLOUD_PROJECT=datcom
export FLASK_ENV=webdriver

echo "====================================================================================="
echo "Starting website cron tests"
echo "====================================================================================="
date_str=$(TZ="America/Los_Angeles" date +"%Y_%m_%d_%H_%M_%S")
echo "====================================================================================="

# Initialize exit status
# Initialize exit status
EXIT_STATUS=0

# Enable pipefail to capture exit codes through pipes
set -o pipefail

# PIDs for background processes
NODEJS_PID=""
SANITY_PID=""
ADV_MAIN_PID=""
ADV_SDG_PID=""

# Define script paths (default to current dir for container)
NODEJS_SCRIPT="nodejs_query.py"
SANITY_SCRIPT="sanity.py"
ADVERSARIAL_SCRIPT="adversarial.py"
DIFFER_SCRIPT="differ.py"
SEND_EMAIL_SCRIPT="send_email.py"

# If running locally (files not in current dir), try to find them in repo
if [[ ! -f "$ADVERSARIAL_SCRIPT" && -f "server/integration_tests/standalone/adversarial.py" ]]; then
  echo "Running locally, using repo paths..."
  NODEJS_SCRIPT="server/integration_tests/standalone/nodejs_query.py"
  SANITY_SCRIPT="server/webdriver/tests/standalone/sanity.py"
  ADVERSARIAL_SCRIPT="server/integration_tests/standalone/adversarial.py"
  DIFFER_SCRIPT="tools/nl/nodejs_query_differ/differ.py"
  SEND_EMAIL_SCRIPT="tools/send_email/send_email.py"
fi

# Function to sample 10% of queries if in autopush
sample_input_files() {
  local input_dir=$1
  if [[ "$ENABLE_ADVERSARIAL_SAMPLING" == "true" ]]; then
    echo "Sampling 10% of queries in $input_dir (ENABLE_ADVERSARIAL_SAMPLING=true)..."
    
    # Create temp file for sampled data to avoid reading it back
    local temp_sampled_file="$input_dir/sampled.tmp"
    local sampled_file="$input_dir/sampled.tsv"
    
    # Get header from the first file found
    local first_file=$(ls "$input_dir"/*.tsv | head -n 1)
    
    if [[ -z "$first_file" ]]; then
      echo "No TSV files found in $input_dir"
      return
    fi
    head -n 1 "$first_file" > "$temp_sampled_file"
    
    # Count total lines (excluding headers)
    local total_lines=$(awk 'FNR>1' "$input_dir"/*.tsv | wc -l)
    local percentage=${ADVERSARIAL_SAMPLING_PERCENTAGE:-10}
    local sample_size=$(( total_lines * percentage / 100 ))
    
    if [[ $sample_size -eq 0 ]]; then
       sample_size=1
    fi
    
    echo "Total lines: $total_lines. Sampling $percentage%: $sample_size"
    
    # Sample and append to temp_sampled_file using portable shuffle (awk)
    
    # Step 1: Combine files
    awk 'FNR>1' "$input_dir"/*.tsv > "$input_dir/combined.tmp"
    
    # Step 2: Add random numbers
    awk 'BEGIN{srand()}{print rand()"\t"$0}' "$input_dir/combined.tmp" > "$input_dir/randomized.tmp"
    
    # Step 3: Sort
    sort -n "$input_dir/randomized.tmp" > "$input_dir/sorted.tmp"
    
    # Step 4: Cut and Head
    # Disable pipefail temporarily because head closing the pipe causes SIGPIPE in cut/sort
    set +o pipefail
    cut -f2- "$input_dir/sorted.tmp" | head -n "$sample_size" >> "$temp_sampled_file"
    set -o pipefail
    
    # Cleanup intermediate files
    rm "$input_dir/combined.tmp" "$input_dir/randomized.tmp" "$input_dir/sorted.tmp"
    
    # Move temp file to final location
    mv "$temp_sampled_file" "$sampled_file"
    
    # Remove original files, keep only sampled.tsv
    find "$input_dir" -name "*.tsv" ! -name "sampled.tsv" -delete
    
    echo "Sampling complete. Created $sampled_file"
  fi
}

echo "Starting tests in parallel..."

# -----------------------------------------------------------------------------
# Node.js Query Tests
# -----------------------------------------------------------------------------
if [[ $NODEJS_API_ROOT != "" ]]; then
  (
    echo "Starting nodejs tests against domain: $NODEJS_API_ROOT"
    
    # Create a private output directory for this parallel process
    mkdir -p output_nodejs
    
    set +e
    python3 $NODEJS_SCRIPT --base_url="$NODEJS_API_ROOT" --output_dir="output_nodejs"
    NODEJS_EXIT_CODE=$?
    set -e
    
    gsutil cp ./output_nodejs/* gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/nodejs_query/
    
    if [[ $NODEJS_EXIT_CODE -ne 0 ]]; then
      echo "Nodejs tests FAILED with exit code $NODEJS_EXIT_CODE"
      exit 1
    fi
    
    failure_email="failure_email.json"
    
    # Note: differ.py reads from GCS, so we must ensure upload finished (it did above).
    python3 $DIFFER_SCRIPT -m diff -e "$TESTING_ENV" -t "$date_str" -g "$TESTING_ENV/$date_str/nodejs_query" -f "$failure_email"
    DIFFER_EXIT_CODE=$?
    if [[ $DIFFER_EXIT_CODE -ne 0 ]]; then
      echo "Nodejs differ found regressions with exit code $DIFFER_EXIT_CODE"
      exit 1
    fi

    if [[ -e "$failure_email" ]]; then
      python3 $SEND_EMAIL_SCRIPT --recipient="datacommons-alerts+tests@google.com" --email_content="$failure_email"
    fi
    
    rm -rf ./output_nodejs
    echo "Finished the nodejs Test."
  ) 2>&1 | sed "s/^/[NodeJS] /" &
  NODEJS_PID=$!
else
  echo "[NodeJS] Skipping nodejs tests (missing NODEJS_API_ROOT)"
fi

# -----------------------------------------------------------------------------
# Sanity Tests
# -----------------------------------------------------------------------------
if [[ $ENABLE_SANITY == "true" ]]; then
  (
    echo "Starting sanity tests"
    
    mkdir -p output_sanity
    
    set +e
    python3 $SANITY_SCRIPT --mode=home --url="$WEB_API_ROOT" --output_dir="output_sanity" --parallelism=10
    SANITY_EXIT_CODE=$?
    set -e

    gsutil cp ./output_sanity/*.csv gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/sanity/

    if [[ $SANITY_EXIT_CODE -ne 0 ]]; then
      echo "Sanity tests FAILED with exit code $SANITY_EXIT_CODE"
      exit 1
    fi
    rm -rf ./output_sanity
    echo "Finished the sanity tests."
  ) 2>&1 | sed "s/^/[Sanity] /" &
  SANITY_PID=$!
else
  echo "[Sanity] Sanity tests disabled."
fi

# -----------------------------------------------------------------------------
# Adversarial Tests (Main)
# -----------------------------------------------------------------------------
if [[ $ENABLE_ADVERSARIAL == "true" ]]; then
  (
    echo "Starting adversarial tests (main)"
    
    mkdir -p input_main
    gsutil cp gs://datcom-website-adversarial/input/frequent/* input_main/
    
    sample_input_files "input_main"
    
    mkdir -p output_adv_main
    
    set +e
    python3 $ADVERSARIAL_SCRIPT --mode=run_all --dc="main" --base_url="$WEB_API_ROOT" --input_dir="input_main" --output_dir="output_adv_main"
    EXIT_CODE=$?
    set -e

    gsutil cp ./output_adv_main/main/reports/* gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/adversarial/main/

    if [[ $EXIT_CODE -ne 0 ]]; then
      echo "Adversarial tests for main FAILED with exit code $EXIT_CODE"
      exit 1
    fi
    rm -rf ./input_main
    rm -rf ./output_adv_main
    echo "Finished the Adversarial Test (main)."
  ) 2>&1 | sed "s/^/[Adv-Main] /" &
  ADV_MAIN_PID=$!
fi

# -----------------------------------------------------------------------------
# Adversarial Tests (SDG)
# -----------------------------------------------------------------------------
if [[ $ENABLE_ADVERSARIAL == "true" ]]; then
  (
    echo "Starting adversarial tests (sdg)"
    
    mkdir -p input_sdg
    gsutil cp gs://datcom-website-adversarial/input/frequent/* input_sdg/
    
    sample_input_files "input_sdg"
    
    mkdir -p output_adv_sdg
    
    set +e
    python3 $ADVERSARIAL_SCRIPT --mode=run_all --dc="sdg" --base_url="$WEB_API_ROOT" --input_dir="input_sdg" --output_dir="output_adv_sdg"
    EXIT_CODE=$?
    set -e

    gsutil cp ./output_adv_sdg/sdg/reports/* gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/adversarial/sdg/

    if [[ $EXIT_CODE -ne 0 ]]; then
      echo "Adversarial tests for sdg FAILED with exit code $EXIT_CODE"
      exit 1
    fi
    rm -rf ./input_sdg
    rm -rf ./output_adv_sdg
    echo "Finished the Adversarial Test (sdg)."
  ) 2>&1 | sed "s/^/[Adv-SDG] /" &
  ADV_SDG_PID=$!
fi

# -----------------------------------------------------------------------------
# Wait for completion and collect results
# -----------------------------------------------------------------------------

# Wait for Node.js
if [[ -n "$NODEJS_PID" ]]; then
  wait "$NODEJS_PID"
  if [[ $? -ne 0 ]]; then 
    echo "[NodeJS] FAILED"
    EXIT_STATUS=1
  fi
fi

# Wait for Sanity
if [[ -n "$SANITY_PID" ]]; then
  wait "$SANITY_PID"
  if [[ $? -ne 0 ]]; then 
    echo "[Sanity] FAILED"
    EXIT_STATUS=1
  fi
fi

# Wait for Adversarial Main
if [[ -n "$ADV_MAIN_PID" ]]; then
  wait "$ADV_MAIN_PID"
  if [[ $? -ne 0 ]]; then 
    echo "[Adv-Main] FAILED"
    EXIT_STATUS=1
  fi
fi

# Wait for Adversarial SDG
if [[ -n "$ADV_SDG_PID" ]]; then
  wait "$ADV_SDG_PID"
  if [[ $? -ne 0 ]]; then 
    echo "[Adv-SDG] FAILED"
    EXIT_STATUS=1
  fi
fi

if [[ $EXIT_STATUS -ne 0 ]]; then
  echo "One or more tests failed. Exiting with status 1."
  exit 1
fi

