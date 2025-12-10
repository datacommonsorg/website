# @title ##### **c.** Create the agent and initialize a session {"display-mode":"form"}
# @markdown 👉 Run this cell
# @markdown
# @markdown **Note**: You must re-run this cell every time you update the AGENT_INSTRUCTIONS or change the model!

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import (
    McpToolset,
    StreamableHTTPConnectionParams,
)
from google import genai
from google.genai import types

from dataclasses import dataclass, field

from IPython.display import Markdown, clear_output, display

import asyncio
import logging
import os
import vertexai

#
# ---Define the Agent ---
# Key Concept: Create the agent w/ system prompt, model, and MCP tools.
#

# AGENT_MODEL = "gemini-pro"  # Changed to a Vertex AI model
# AGENT_INSTRUCTIONS = "Use the Data Commons MCP tools to respond to user queries. Cite the data source when possible."
# MCP_PORT = 3000  # Ensure this matches the port used when starting the MCP server

# # vertexai.init(project=os.getenv('GCP_PROJECT_ID'), location=os.getenv('GCP_LOCATION'))

# datcom_agent = LlmAgent(
#     name="datacommons_agent",
#     model=AGENT_MODEL,
#     instruction=AGENT_INSTRUCTIONS,
#     tools=[
#         McpToolset(
#             connection_params=StreamableHTTPConnectionParams(
#                 url=f"http://localhost:{MCP_PORT}/mcp"
#             )
#         )
#     ],
# )
# logging.info(f"Agent '{datcom_agent.name}' created using model '{AGENT_MODEL}'.")


#
# -----------------------------------------------------------------------------
# The rest of this cell is only required for running the agent in Colab. This
# is automatically handled when running with adk web.
# ----------------------------------------------------------------------------
#

#
# ---Session Management ---
# Key Concept: SessionService stores conversation history & state.
# InMemorySessionService is  simple, non-persistent storage for this tutorial.
#
# session_service = InMemorySessionService()

# # Define constants for identifying the interaction context
# APP_NAME = "datacommons_app"
# USER_ID = "user_1"
# SESSION_ID = "session_001"

# async def initialize_mcp_session():
#     # Create the specific session where the conversation will happen
#     session = await session_service.create_session(
#         app_name=APP_NAME,
#         user_id=USER_ID,
#         session_id=SESSION_ID,
#     )
#     logging.info(
#         f"Session created: App='{APP_NAME}', User='{USER_ID}', Session='{SESSION_ID}'"
#     )

#     #
#     # ---Runner ---
#     # Key Concept: Runner orchestrates the agent execution loop.
#     #
#     runner = Runner(agent=datcom_agent, app_name=APP_NAME, session_service=session_service)
#     logging.info(f"Runner created for agent '{runner.agent.name}'.")
#     return runner, USER_ID, SESSION_ID, call_agent_async, logs

# #
# # ---Async Agent Interaction Function ---
# #


# @dataclass
# class AgentTurn:
#     """Holds all information for one turn of conversation."""

#     user_query: str
#     agent_response: str
#     tool_calls: list[str] = field(default_factory=list)

#     def _get_text(self) -> list[str]:
#         # Build the output as a list of strings
#         output = [f"\n>> 👤 User: {self.user_query}\n"]

#         if self.tool_calls:
#             output.append("🛠️ Tool Calls:")
#             for call in self.tool_calls:
#                 output.append(f" - {call}")
#             output.append("")  # Add a newline

#         return output

#     def __str__(self) -> str:
#         """This method is called when you use print() on the object."""

#         # Build the output as a list of strings
#         output = self._get_text()
#         output.append(f"<< 🤖 Agent: {self.agent_response}\n")

#         # Join all the parts into a single string
#         return "\n".join(output)

#     def print_pretty(self) -> None:
#         raw_text = self._get_text()
#         print("\n".join(raw_text))
#         print("<< 🤖 Agent:\n")
#         display(Markdown(self.agent_response))
#         print("")


# def print_logs() -> None:
#     for log in logs:
#         log.print_pretty()


# async def call_agent_async(query: str, runner, user_id, session_id) -> str:
#     """Sends a query to the agent and prints the final response."""

#     if logs:
#         print("Session History:")
#         print_logs()
#         print(
#             "---------------------------------------------------------\n\nCurrent Query:"
#         )

#     print(f"\n>> 👤 User Query: {query}")
#     print("\n...waiting for agent's response\n")

#     # Prepare the user's message in ADK format
#     content = types.Content(role="user", parts=[types.Part(text=query)])

#     final_response_text = "Agent did not produce a final response."  # Default

#     # Iterate through events to find the final answer.
#     tool_calls = []
#     async for event in runner.run_async(
#         user_id=user_id, session_id=session_id, new_message=content
#     ):
#         # You can uncomment the line below to see *all* events during execution
#         logger.info(
#             f"  [Event] Author: {event.author}, Type: {type(event).__name__}, Final: {event.is_final_response()}, Content: {event.content}"
#         )
#         if event.author == "datacommons_agent":
#             for tool_call in event.get_function_calls():
#                 if not tool_calls:
#                     print("🛠️ Tool Calls:")

#                 args = ", ".join(
#                     sorted([f"{k}={repr(v)}" for k, v in tool_call.args.items()])
#                 )
#                 tool_call_str = f"{tool_call.name}({args})"
#                 print(f" - {tool_call_str}")
#                 tool_calls.append(tool_call_str)

#         # Key Concept: is_final_response() marks the concluding message for the turn.
#         if event.is_final_response():
#             if event.content and event.content.parts:
#                 # Assuming text response in the first part
#                 final_response_text = event.content.parts[0].text
#             elif (
#                 event.actions and event.actions.escalate
#             ):  # Handle potential errors/escalations
#                 final_response_text = (
#                     f"Agent escalated: {event.error_message or 'No specific message.'}"
#                 )
#             # Add more checks here if needed (e.g., specific error codes)
#             break  # Stop processing events once the final response is found

#     log = AgentTurn(
#         user_query=query, agent_response=final_response_text, tool_calls=tool_calls
#     )
#     clear_output(wait=True)
#     if logs:
#         print("Session History:")
#         print_logs()
#         print(
#             "---------------------------------------------------------\n\nCurrent Query:\n"
#         )
#     log.print_pretty()
#     logs.append(
#         AgentTurn(
#             user_query=query, agent_response=final_response_text, tool_calls=tool_calls
#         )
#     )
#     return final_response_text


# logs = []

# if __name__ == "__main__":
# asyncio.run(initialize_mcp_session())

print(f"✅ Agent created with a fresh session history.")