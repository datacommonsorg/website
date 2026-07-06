# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Dynamically generates/updates the DCP feature flags file (deploy/featureflags/custom.yaml)
and website feature flags file (server/config/feature_flag_configs/custom.json)
based on environment variables.

This is executed during container startup (e.g. build/cdc_services/run.sh)
to configure Mixer's and Website's runtime behaviors based on deployment settings.
"""

import json
import os
import yaml

def update_mixer_flags():
    ff_path = 'deploy/featureflags/custom.yaml'
    
    # Read existing custom flags if they exist
    data = {}
    if os.path.exists(ff_path):
        with open(ff_path, 'r') as f:
            try:
                data = yaml.safe_load(f) or {}
            except yaml.YAMLError:
                pass
                
    if 'flags' not in data or data['flags'] is None:
        data['flags'] = {}
        
    # Dynamically inject flags based on environment variables
    if os.environ.get('RESOLVE_WITH_SPANNER_EMBEDDINGS') == 'true':
        data['flags']['EnableSpannerSearchEmbeddings'] = True
        
    if os.environ.get('ENABLE_UNIQUE_HISTORY_RECORDS') == 'true' or os.environ.get('ENABLE_UNIQUE_INGESTION_RUNS') == 'true':
        data['flags']['UseNewIngestionHistorySchema'] = True
        
    # Write back clean YAML
    os.makedirs(os.path.dirname(ff_path), exist_ok=True)
    with open(ff_path, 'w') as f:
        yaml.safe_dump(data, f, default_flow_style=False)
    print('Successfully generated Mixer custom feature flags')

def update_website_flags():
    web_ff_path = 'server/config/feature_flag_configs/custom.json'
    if not os.path.exists(web_ff_path):
        return  # Gracefully skip if website codebase is not present (e.g. local mixer tests)

    try:
        with open(web_ff_path, 'r') as f:
            data = json.load(f)
            
        for flag in data:
            if flag.get('name') == 'enable_nl_v2node_fetchall':
                flag['enabled'] = True
            if os.environ.get('RESOLVE_WITH_SPANNER_EMBEDDINGS') == 'true':
                if flag.get('name') == 'use_v2_resolve_for_nl_search_vars':
                    flag['enabled'] = True
                    
        with open(web_ff_path, 'w') as f:
            json.dump(data, f, indent=2)
        print('Successfully enabled feature flags in custom.json')
    except Exception as e:
        print(f'Warning: Failed to auto-enable feature flags in custom.json: {e}')

def main():
    update_mixer_flags()
    update_website_flags()

if __name__ == '__main__':
    main()
