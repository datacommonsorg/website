#!/bin/bash

# Instructions for running the script
echo "Usage: Run this script from the directory containing the JSON config files."
echo "Ensure 'jq' is installed on your system before running the script.\n"

read -p "Enter Feature Flag Name: " feature_flag_name
read -p "Enter Feature Flag Description: " feature_flag_description
read -p "Enter Bug ID: " bug_id
read -p "Enter Owner: " owner

# Define the list of config files
config_files=($(ls *.json | grep -v "production.json"))

# Loop through each config file and add the feature flag entry
for config_file in "${config_files[@]}"; do
    if [[ -f $config_file ]]; then
        # Parse the JSON, add the new entry, and sort by feature flag name
        jq --arg name "$feature_flag_name" \
           --arg bug_id "$bug_id" \
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