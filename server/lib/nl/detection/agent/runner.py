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

import uuid

from google.adk.runners import Runner
from google.genai import types

from server.lib.nl.detection.agent.types import AgentDetection


async def call_agent(runner: Runner, query: str) -> AgentDetection:
  ephemeral_session_id = str(uuid.uuid4())
  generic_user = "stateless-web-user"
  try:
    session = await runner.session_service.create_session(
        app_name=runner.app_name,
        session_id=ephemeral_session_id,
        user_id=generic_user,
    )

    query_content = types.Content(role="user", parts=[types.Part(text=query)])

    async for _ in runner.run_async(new_message=query_content,
                                    user_id=session.user_id,
                                    session_id=session.id):
      pass

    updated_session = await runner.session_service.get_session(
        app_name=runner.app_name,
        user_id=session.user_id,
        session_id=session.id)

    detection_state = updated_session.state.get('nl_detection')
    return AgentDetection(**detection_state)

  finally:
    await runner.session_service.delete_session(app_name=runner.app_name,
                                                user_id=generic_user,
                                                session_id=ephemeral_session_id)
