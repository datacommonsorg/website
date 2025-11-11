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

from functools import lru_cache
import subprocess

from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

from server.lib.nl.detection.agent.config import AGENT_MODEL
from server.lib.nl.detection.agent.config import get_mcp_env
from server.lib.nl.detection.agent.config import MCP_SERVER_VERSION
from server.lib.nl.detection.agent.instructions import AGENT_INSTRUCTIONS
from server.lib.nl.detection.agent.types import AgentDetection


@lru_cache(maxsize=1)
def get_agent() -> tuple[LlmAgent, MCPToolset]:
  """Returns a cached singleton detection agent."""
  
  toolset = MCPToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="http://localhost:3000/mcp",    
         timeout=30.0),
      tool_filter=["search_indicators"])
  
  agent = LlmAgent(model=AGENT_MODEL,
                   name="detection_agent",
                   instruction=AGENT_INSTRUCTIONS,
                   tools=[toolset],
                   output_schema=AgentDetection)
  
  return agent, toolset
