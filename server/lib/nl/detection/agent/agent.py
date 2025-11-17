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
import os

from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool.mcp_session_manager import \
    StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

from server.lib.nl.detection.agent.instructions import AGENT_INSTRUCTIONS
from server.lib.nl.detection.agent.types import AgentDetection

DC_MCP_URL = os.environ.get("DC_MCP_URL")
AGENT_MODEL = os.environ.get("DETECTION_AGENT_MODEL", "gemini-2.5-flash")


@lru_cache(maxsize=1)
def get_agent() -> LlmAgent | None:
  """Returns a cached singleton detection agent."""
  if not DC_MCP_URL:
    return None

  return LlmAgent(model=AGENT_MODEL,
                  name="detection_agent",
                  instruction=AGENT_INSTRUCTIONS,
                  tools=[
                      McpToolset(
                          connection_params=StreamableHTTPConnectionParams(
                              url=f"{DC_MCP_URL}/mcp",
                              timeout=30.0,
                          ),
                          tool_filter=["search_indicators"],
                      )
                  ],
                  output_schema=AgentDetection,
                  output_key='nl_detection')
