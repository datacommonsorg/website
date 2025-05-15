#!/bin/bash
# Copyright 2025 Google LLC
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

# Adds a new feature flag to each environment json file in feature_flag_configs.
# The flags are disabled by default.
#
# Usage:
# ./scripts/create_feature_flag.sh 
# This script will prompt the user for file_name, owner, and description.


# Instructions for running the script
echo "This script will add a new feature flag to all feature flag config files except production.json."
echo "Ensure 'jq' is installed on your system before running the script.\n"

read -p "Enter Feature Flag Name: " feature_flag_name
read -p "Enter Feature Flag Description: " feature_flag_description
read -p "Enter Owner: " owner

# Define the list of config files
feature_flag_configs_dir="server/config/feature_flag_configs"
config_files=($(ls "$feature_flag_configs_dir"/*.json | grep -v "production.json"))

# Loop through each config file and add the feature flag entry
for config_file in "${config_files[@]}"; do
    if [[ -f $config_file ]]; then
        # Parse the JSON, add the new entry, and sort by feature flag name
        jq --arg name "$feature_flag_name" \
           --arg description "$feature_flag_description" \
           --arg owner "$owner" \
           'if type == "array" then 
                . + [{"name": $name, "enabled": false, "owner": $owner, "description": $description}] 
                | sort_by(.name) 
            else 
                error("Root JSON structure must be an array") 
            end' \
           "$config_file" > tmp.json && mv tmp.json "$config_file"
        echo "Feature flag added and sorted in $config_file"
    else
        echo "Config file $config_file not found. Skipping."
    fi
done