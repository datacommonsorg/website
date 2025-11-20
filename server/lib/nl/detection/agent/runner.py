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
import uuid

from google.adk.apps import App
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from server.lib.nl.detection.agent.agent import get_agent
from server.lib.nl.detection.agent.types import AgentDetection


@lru_cache(maxsize=1)
def get_detection_agent_runner() -> Runner | None:
  """Returns a cached singleton ADK Runner for the detection agent.

  This function is called once during server startup from `create_app` in
  `server/__init__.py`. The returned runner instance is then stored in the
  Flask app config for use during the application's lifecycle. The `lru_cache`
  decorator ensures that the potentially expensive runner initialization only
  happens once.
  """
  agent = get_agent()
  if not agent:
    return None

  return Runner(
      app=App(
          name="agents",
          root_agent=agent,
      ),
      session_service=InMemorySessionService(),
  )


async def get_detection(runner: Runner, query: str) -> AgentDetection:
  """Executes the detection agent for a given query.

  This function orchestrates a single, stateless interaction with the detection
  agent. It creates a temporary session, runs the agent with the provided query,
  extracts the structured `AgentDetection` output from the final session state,
and then cleans up by deleting the session.

  Args:
    runner: An ADK Runner instance configured with the detection agent.
    query: The user's natural language query to be processed.

  Returns:
    An `AgentDetection` object containing the structured information
    extracted by the agent from the query.
  """
  # TODO: Consider maintaining session state across queries
  ephemeral_session_id = str(uuid.uuid4())
  generic_user = "stateless-web-user"
  try:
    session = await runner.session_service.create_session(
        app_name=runner.app_name,
        session_id=ephemeral_session_id,
        user_id=generic_user,
    )

    query_content = types.Content(role="user", parts=[types.Part(text=query)])

    # NOTE: runner.run_async returns an async generator.
    # We must fully iterate over it (consuming all streamed results) to ensure
    # the agent's work is finished before fetching the final session state.
    async for _ in runner.run_async(new_message=query_content,
                                    user_id=session.user_id,
                                    session_id=session.id):
      # The pass statement is used as a placeholder for the intentionally empty
      # loop body. We only need to iterate through the generator to
      # ensure the agent's execution completes, ignoring intermediate outputs.
      pass

    updated_session = await runner.session_service.get_session(
        app_name=runner.app_name,
        user_id=session.user_id,
        session_id=session.id)

    detection_state = updated_session.state.get('nl_detection')
    if not detection_state:
      # TODO: potentially raise an exception here instead of returning an "unknown" classifcation.
      return AgentDetection(classification="Unknown")
    return AgentDetection(**detection_state)

  finally:
    await runner.session_service.delete_session(app_name=runner.app_name,
                                                user_id=generic_user,
                                                session_id=ephemeral_session_id)
    # toolset.close is meant to be called multiple times per runner to close
    # mcp session connections after a session is complete.
    for toolset in runner.agent.tools:
      await toolset.close()