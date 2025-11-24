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
root_dir = os.path.abspath(os.path.join(current_dir, '../../../../'))
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

# Global agent instance (lazy loaded)
_AGENT = None
_MCP_PORT = 3000

def get_agent():
    global _AGENT
    if _AGENT:
        return _AGENT
    
    # Initialize the agent
    # This matches init_mcp.py logic roughly
    agent_model = "gemini-2.5-flash"
    agent_instructions = "Use the Data Commons MCP tools to respond to user queries. Cite the data source when possible."
    
    # Check if we should use MCP or local tools?
    # The current dc_tool.py seems to rely on MCP if we pass an agent with McpToolset.
    # But dc_tool.py also has 'tools_list' and 'function_map' for local execution?
    # Actually ask_data_commons uses 'runner = Runner(agent=datcom_agent...)'
    # So we need an agent.
    
    try:
        # Check if port 3000 is open before trying to connect?
        # For now, just try to create the agent.
        _AGENT = LlmAgent(
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
        logging.info(f"Agent '{_AGENT.name}' created using model '{agent_model}'.")
    except Exception as e:
        logging.error(f"Failed to create agent (MCP server might be down): {e}")
        # Return None so we can handle it in the route
        return None
        
    return _AGENT

@bp.route('/verify_claim', methods=['POST'])
async def verify_claim():
    if not dc_tool:
        return jsonify({"error": "Factchecking modules not available."}), 500
        
    data = request.get_json()
    if not data or 'claim' not in data:
        return jsonify({"error": "Missing 'claim' in request body."}), 400
        
    claim_text = data['claim']
    
    agent = get_agent()
    if not agent:
        return jsonify({"error": "Failed to initialize agent. Is the MCP server running?"}), 500
        
    try:
        # We use utils.verify_claim which wraps dc_tool.ask_data_commons
        # utils.verify_claim(claim: Dict[str, Any], datcom_agent: Any)
        # It expects a dict for claim? Let's check utils.py again.
        # utils.py: async def verify_claim(claim: Dict[str, Any], datcom_agent: Any) -> Dict[str, Any]:
        #   response = await ask_data_commons(claim, datcom_agent)
        # dc_tool.py: async def ask_data_commons(claim: str, datcom_agent: Any) -> dict:
        #   Input = VERIFICATION_PROMPT + str(claim)
        
        # So utils.verify_claim passes 'claim' (dict) to ask_data_commons (expects str usually, but casts to str).
        # If we pass a string to utils.verify_claim, it might work if ask_data_commons handles it.
        # ask_data_commons does `str(claim)`.
        # So we can pass the string directly or a dict.
        
        # Let's pass the string directly to ask_data_commons to be safe or match utils usage.
        # utils.py seems to expect 'claim' to be the object we want to verify.
        
        # Actually, let's just call dc_tool.ask_data_commons directly if utils is too specific to the batch flow.
        # utils.verify_claim returns a structure with "original_claim".
        
        result = await dc_tool.ask_data_commons(claim_text, agent)
        
        # Wrap it to match what our frontend expects (or what utils returns)
        response = {
            "verification_verdict": result,
            "claim": claim_text
        }
        return jsonify(response)
        
    except Exception as e:
        logging.exception("Error verifying claim")
        return jsonify({"error": str(e)}), 500
