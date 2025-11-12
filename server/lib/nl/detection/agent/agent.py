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

from google.adk.agents.llm_agent import LlmAgent
from google.adk.apps import App
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_session_manager import \
    StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

from server.lib.nl.detection.agent.config import AGENT_MODEL
from server.lib.nl.detection.agent.instructions import AGENT_INSTRUCTIONS
from server.lib.nl.detection.agent.types import AgentDetection

APP_NAME = 'datacommons-nl-agent'


@lru_cache(maxsize=1)
def get_agent() -> LlmAgent:
  """Returns a cached singleton detection agent."""

  agent = LlmAgent(model=AGENT_MODEL,
                   name="detection_agent",
                   instruction=AGENT_INSTRUCTIONS,
                   tools=[
                       MCPToolset(
                           connection_params=StreamableHTTPConnectionParams(
                               url="http://localhost:3000/mcp",
                               timeout=30.0,
                               ),
                           tool_filter=["search_indicators"],
                       )
                   ],
                   output_schema=AgentDetection,
                   output_key='nl_detection')

  return agent


@lru_cache(maxsize=1)
def get_detection_agent_runner() -> Runner:
  agent = get_agent()

  runner = Runner(
      app=App(
          name=APP_NAME,
          root_agent=agent,
      ),
      session_service=InMemorySessionService(),
  )
  return runner
