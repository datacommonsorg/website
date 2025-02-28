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

# Get the arguments
read -p "Name of flag to be created: " flag_name
read -p "Flag owner: " owner
read -p "Description for the flag: " description

# Construct the JSON object
new_entry='
{
  "name": "'"$flag_name"'",
  "enabled": false,
  "owner": "'"$owner"'",
  "description": "'"$description"'"
}'


feature_flag_configs_dir="server/config/feature_flag_configs"
for file_path in "$feature_flag_configs_dir"/*.json; do
    # Read the existing JSON data from the file (or create an empty array if it doesn't exist)
    json_data=$(cat "$file_path" 2>/dev/null || echo "")

    # Add the new entry to the JSON array
    updated_json_data=$(echo "$json_data" | jq --argjson e "$new_entry" '. + [$e]')

    # Write the updated JSON data back to the file
    echo "$updated_json_data" > "$file_path"
    echo "Flag added to $file_path!"
done