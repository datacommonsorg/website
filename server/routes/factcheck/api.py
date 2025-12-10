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

import json
import logging
import os
import sys
from flask import Blueprint, request, jsonify

# Add the root directory to sys.path to allow importing factchecking
# Assuming this file is in server/routes/factcheck/api.py
# Root is ../../../..
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, '../../../'))
if root_dir not in sys.path:
    sys.path.append(root_dir)

# Now we can try to import from factchecking
try:
    from factchecking import dc_tool
    from factchecking import utils
    # We might need to initialize the agent or session service
    # dc_tool.ask_data_commons creates a new session/runner each time
    # but it needs a 'datcom_agent' passed to it.
    # We need to construct the agent here or reuse one.
    from google.adk.agents import LlmAgent
    from google.adk.tools.mcp_tool.mcp_toolset import McpToolset, StreamableHTTPConnectionParams
except ImportError as e:
    logging.error(f"Failed to import factchecking modules: {e}")
    dc_tool = None

# Define blueprint
bp = Blueprint("factcheck_api", __name__, url_prefix='/factcheck/api')

# Global agent instance (lazy loaded) - REMOVED for BYOK
# _AGENT = None
_MCP_PORT = 3000

def get_agent(api_key=None):
    # Initialize the agent
    # This matches init_mcp.py logic roughly
    agent_model = "gemini-2.5-flash"
    agent_instructions = "Use the Data Commons MCP tools to respond to user queries. Cite the data source when possible."
    
    if api_key:
        # Set the API key in the environment for this agent's lifecycle
        # Note: This is not thread-safe for concurrent requests with different keys in the same process
        # if the underlying library reads env vars dynamically.
        # Assuming LlmAgent/genai reads it at initialization.
        os.environ['GOOGLE_API_KEY'] = api_key
        os.environ['GENAI_API_KEY'] = api_key
    
    try:
        # Check if port 3000 is open before trying to connect?
        # For now, just try to create the agent.
        agent = LlmAgent(
            name="datacommons_agent",
            model=agent_model,
            instruction=agent_instructions,
            tools=[
                McpToolset(
                    connection_params=StreamableHTTPConnectionParams(
                        url=f"http://localhost:{_MCP_PORT}/mcp"
                    )
                )
            ],
        )
        logging.info(f"Agent '{agent.name}' created using model '{agent_model}'.")
        return agent
    except Exception as e:
        logging.error(f"Failed to create agent (MCP server might be down): {e}")
        return None

@bp.route('/verify_claim', methods=['POST'])
async def verify_claim():
    if not dc_tool:
        return jsonify({"error": "Factchecking modules not available."}), 500
        
    data = request.get_json()
    if not data or 'claim' not in data:
        return jsonify({"error": "Missing 'claim' in request body."}), 400

    # Get API Key from header
    api_key = request.headers.get('X-Gemini-Api-Key')
    if not api_key:
        return jsonify({"error": "Missing API Key"}), 401
        
    claim_text = data['claim']
    context = data.get('context', '')
    
    if context:
        # Append context to help the LLM
        # We use a clear separator so the LLM knows what is the claim and what is context
        full_query = f"Claim: {claim_text}\nContext: {context}"
    else:
        full_query = claim_text
    
    agent = get_agent(api_key)
    if not agent:
        return jsonify({"error": "Failed to initialize agent. Is the MCP server running?"}), 500
        
    try:
        result = await dc_tool.ask_data_commons(full_query, agent)
        
        # Wrap it to match what our frontend expects (or what utils returns)
        response = {
            "verification_verdict": result,
            "claim": claim_text
        }
        return jsonify(response)
        
    except Exception as e:
        logging.exception("Error verifying claim")
        return jsonify({"error": str(e)}), 500

@bp.route('/extract_claims', methods=['POST'])
async def extract_claims():
    if not dc_tool:
        return jsonify({"error": "Factchecking modules not available."}), 500
        
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' in request body."}), 400

    # Get API Key from header
    api_key = request.headers.get('X-Gemini-Api-Key')
    if not api_key:
        return jsonify({"error": "Missing API Key"}), 401
        
    text = data['text']
    
    agent = get_agent(api_key)
    if not agent:
        return jsonify({"error": "Failed to initialize agent."}), 500
        
    try:
        logging.info(f"Extracting claims from text (length {len(text)}): {text[:100]}...")
        claims = await dc_tool.extract_claims_from_text(text, agent)
        logging.info(f"Extracted {len(claims)} claims: {claims}")
        return jsonify({"claims": claims})
    except Exception as e:
        logging.exception("Error extracting claims")
        return jsonify({"error": str(e)}), 500
