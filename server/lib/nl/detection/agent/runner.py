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

import asyncio
from functools import lru_cache

from google.adk.apps import App
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from server.lib.nl.detection.agent.agent import get_agent


@lru_cache(maxsize=1)
def get_detection_agent_runner() -> Runner | None:
  """Returns a cached singleton ADK Runner for the detection agent.

  This function is called once during server startup from `create_app` in
  `server/__init__.py`. The returned runner instance is then stored in the
  Flask app config for use during the application's lifecycle. The `lru_cache`
  decorator ensures that the potentially expensive runner initialization only
  happens once.
  """
  return None
  # agent, toolset = asyncio.run(get_agent())
  # if not agent:
  #   return None
  # print(agent)
  # print(toolset)
  # return Runner(
  #     app=App(
  #         name="agents",
  #         root_agent=agent,
  #     ),
  #     session_service=InMemorySessionService(),
  # )
