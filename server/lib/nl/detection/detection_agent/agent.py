from google.adk.agents.llm_agent import LlmAgent
from .instructions import AGENT_INSTRUCTIONS
from .types import AgentDetection
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

AGENT_MODEL = 'gemini-2.5-flash'

APP_NAME='datacommons-nl-agent'

root_agent = LlmAgent(
    model=AGENT_MODEL,
    name='detection_agent',
    instruction=AGENT_INSTRUCTIONS,
    # tools=[
    #     MCPToolset(
    #         connection_params=StdioConnectionParams(
    #             server_params=StdioServerParameters(
    #                 command='uvx',
    #                 args=['datacommons-mcp@latest', 'serve', 'stdio'],
    #                 env={'DC_API_KEY': DC_API_KEY},
    #                 stderr=subprocess.DEVNULL
    #             ),
    #             timeout=30.0
    #         ),
    #         tool_filter=["search_indicators"]
    #     ),
    # ],
    output_schema=AgentDetection)


async def call_agent(query):

    session_service = InMemorySessionService()
    await session_service.create_session(app_name=APP_NAME,
                                         user_id="1",
                                         session_id="test")
    runner = Runner(agent=root_agent,
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
