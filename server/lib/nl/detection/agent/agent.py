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
import uuid

from google.adk.agents.llm_agent import LlmAgent
from google.adk.apps import App
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_session_manager import \
    StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.genai import types

from server.lib.nl.detection.agent.instructions import AGENT_INSTRUCTIONS
from server.lib.nl.detection.agent.types import AgentDetection


class DetectionAgent:
  """Encapsulates the detection agent logic."""

  def __init__(self, model: str, mcp_url: str):
    self.model = model
    self.mcp_url = mcp_url
    self.runner = self._create_runner()

  def _create_runner(self) -> Runner | None:
    """Creates and configures the ADK Runner."""
    if not self.mcp_url:
      return None

    agent = LlmAgent(model=self.model,
                     name="detection_agent",
                     instruction=AGENT_INSTRUCTIONS,
                     tools=[
                         McpToolset(
                             connection_params=StreamableHTTPConnectionParams(
                                 url=self.mcp_url,
                                 timeout=30.0,
                             ),
                             tool_filter=["search_indicators"],
                         )
                     ],
                     output_schema=AgentDetection,
                     output_key='nl_detection')

    return Runner(
        app=App(
            name="agents",
            root_agent=agent,
        ),
        session_service=InMemorySessionService(),
    )

  async def detect(self, query: str) -> AgentDetection:
    """Executes the detection agent for a given query."""
    if not self.runner:
      # TODO: potentially raise an exception here instead of returning an "unknown" classifcation.
      return AgentDetection(classification="Unknown")

    # TODO: Consider maintaining session state across queries
    ephemeral_session_id = str(uuid.uuid4())
    generic_user = "stateless-web-user"
    try:
      session = await self.runner.session_service.create_session(
          app_name=self.runner.app_name,
          session_id=ephemeral_session_id,
          user_id=generic_user,
      )

      query_content = types.Content(role="user", parts=[types.Part(text=query)])

      # NOTE: runner.run_async returns an async generator.
      # We must fully iterate over it (consuming all streamed results) to ensure
      # the agent's work is finished before fetching the final session state.
      async for _ in self.runner.run_async(new_message=query_content,
                                           user_id=session.user_id,
                                           session_id=session.id):
        # The pass statement is used as a placeholder for the intentionally empty
        # loop body. We only need to iterate through the generator to
        # ensure the agent's execution completes, ignoring intermediate outputs.
        pass

      updated_session = await self.runner.session_service.get_session(
          app_name=self.runner.app_name,
          user_id=session.user_id,
          session_id=session.id)

      detection_state = updated_session.state.get('nl_detection')
      if not detection_state:
        # TODO: potentially raise an exception here instead of returning an "unknown" classifcation.
        return AgentDetection(classification="Unknown")
      return AgentDetection(**detection_state)

    finally:
      if self.runner:
        await self.runner.session_service.delete_session(
            app_name=self.runner.app_name,
            user_id=generic_user,
            session_id=ephemeral_session_id)
        # toolset.close is meant to be called multiple times per runner to close
        # mcp session connections after a session is complete.
        # TODO: Store the toolset as a member var and call toolset.close directly
        for toolset in self.runner.agent.tools:
          await toolset.close()


def create_detection_agent(model: str, mcp_url: str) -> DetectionAgent:
  """Creates a DetectionAgent instance."""
  return DetectionAgent(model, mcp_url)
