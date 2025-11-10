import subprocess

from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from google.adk.tools.mcp_tool.mcp_session_manager import StdioServerParameters
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

from server.lib.nl.detection.agent.config import AGENT_MODEL
from server.lib.nl.detection.agent.config import get_mcp_env
from server.lib.nl.detection.agent.instructions import AGENT_INSTRUCTIONS
from server.lib.nl.detection.agent.types import AgentDetection

root_agent = LlmAgent(
    model=AGENT_MODEL,
    name='detection_agent',
    instruction=AGENT_INSTRUCTIONS,
    tools=[
        MCPToolset(connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command='uvx',
                args=['datacommons-mcp@latest', 'serve', 'stdio'],
                env=get_mcp_env(),
                stderr=subprocess.DEVNULL),
            timeout=30.0),
                   tool_filter=["search_indicators"]),
    ],
    output_schema=AgentDetection)
