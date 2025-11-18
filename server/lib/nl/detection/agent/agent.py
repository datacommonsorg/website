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

import os

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_session_manager import \
    StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

from server.lib.nl.detection.agent.instructions import AGENT_INSTRUCTIONS
from server.lib.nl.detection.agent.types import AgentDetection


class DetectionAgent:
  """Class that manages the detection agent and its runner."""

  def __init__(self, dc_mcp_url: str, agent_model: str):
    self.dc_mcp_url = dc_mcp_url
    self.agent_model = agent_model
    self.agent: LlmAgent | None = None
    self.runner: Runner | None = None
    self.toolset: McpToolset | None = None

  async def initialize(self):
    """Initializes the agent and runner."""
    if not self.dc_mcp_url:
      return

    self.toolset = McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url=self.dc_mcp_url,
            timeout=30.0,
        ),
        tool_filter=["search_indicators"],
    )
    self.agent = LlmAgent(model=self.agent_model,
                          name="detection_agent",
                          instruction=AGENT_INSTRUCTIONS,
                          tools=[self.toolset],
                          output_schema=AgentDetection,
                          output_key='nl_detection')

    self.runner = Runner(
        app_name="detection_agent_runner",
        agent=self.agent,
        session_service=InMemorySessionService(),
    )