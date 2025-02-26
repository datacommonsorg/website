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
# ./scripts/create_feature_flag.sh <flag_name> <owner> <description>

# Check if the correct number of arguments is provided
if [ $# -ne 3 ]; then
    echo "Usage: $0 <flag_name> <owner> <description>"
    exit 1
fi

# Get the arguments
flag_name=$1
owner=$2
description=$3

# Construct the JSON object
new_entry='
{
  "name": "'"$flag_name"'",
  "enabled": false,
  "owner": "'"$owner"'",
  "description": "'"$description"'"
}'

environments=(local dev autopush staging production custom)
for env in "${environments[@]}"; do
    # Construct the file path
    file_path="server/config/feature_flag_configs/${env}.json"
    # Read the existing JSON data from the file (or create an empty array if it doesn't exist)
    json_data=$(cat "$file_path" 2>/dev/null || echo "")

    # Add the new entry to the JSON array
    updated_json_data=$(echo "$json_data" | jq --argjson e "$new_entry" '. + [$e]')

    # Write the updated JSON data back to the file
    echo "$updated_json_data" > "$file_path"
    echo "Flag added to $file_path!"
done