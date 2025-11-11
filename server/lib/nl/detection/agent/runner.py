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

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

AGENT_MODEL = 'gemini-2.5-flash'

APP_NAME = 'datacommons-nl-agent'


async def call_agent(agent, query):

  session_service = InMemorySessionService()
  await session_service.create_session(app_name=APP_NAME,
                                       user_id="1",
                                       session_id="test")
  runner = Runner(agent=agent,
                  session_service=session_service,
                  app_name=APP_NAME)

  events = runner.run_async(new_message=types.Content(
      role="user", parts=[types.Part(text=query)]),
                            user_id="1",
                            session_id="test")

  final_res = None
  async for event in events:
    if event.is_final_response():
      final_res = event.content.parts

  print(final_res)
