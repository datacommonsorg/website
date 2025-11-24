import asyncio
from dc_tool import ask_data_commons
from fact_checker import FactChecker
from vertex_ai_llm_provider import VertexAIProvider
from open_ai_llm_provider import OpenAIProvider
from anthropic_llm_provider import AnthropicProvider
import argparse
# from init_mcp import initialize_mcp_session
from subprocess_mcp import start_mcp_server
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


AGENT_MODEL = "gemini-2.5-flash"  # Changed to a Vertex AI model
AGENT_INSTRUCTIONS = "Use the Data Commons MCP tools to respond to user queries. Cite the data source when possible."
MCP_PORT = 3000  # Ensure this matches the port used when starting the MCP server

# vertexai.init(project=os.getenv('GCP_PROJECT_ID'), location=os.getenv('GCP_LOCATION'))

# QUERY = "What is the Nominal GDP of italy?"
QUERY = "What is the life expectancy in Italy in 2020?"

os.environ["GOOGLE_CLOUD_PROJECT"] = "datcom-website-dev"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"
os.environ["GOOGLE_API_KEY"] = "AIzaSyDeCnSYL7ONUIyd9MNdD4P8yABXw08fiME"
# os.environ["GEMINI_API_KEY"] = "AIzaSyDeCnSYL7ONUIyd9MNdD4P8yABXw08fiME"

async def main():
    mcp_server_process = None
    try:
        # runner, USER_ID, SESSION_ID, call_agent_async, logs = await initialize_mcp_session()
        llm_provider = None
        if args.llm_provider == "gemini":
            llm_provider = VertexAIProvider(project_id="datcom-website-dev", location="us-central1")
        elif args.llm_provider == "openai":
            llm_provider = OpenAIProvider()
        elif args.llm_provider == "anthropic":
            llm_provider = AnthropicProvider()
        print(f"Using LLM Provider: {type(llm_provider).__name__}")
        
        mcp_server_process = await start_mcp_server()
        datcom_agent = LlmAgent(
            name="datacommons_agent",
            model=AGENT_MODEL,
            instruction=AGENT_INSTRUCTIONS,
            tools=[
                McpToolset(
                    connection_params=StreamableHTTPConnectionParams(
                        url=f"http://localhost:{MCP_PORT}/mcp"
                    )
                )
            ],
        )
        logging.info(f"Agent '{datcom_agent.name}' created using model '{AGENT_MODEL}'.")

        checker = FactChecker(llm_provider, datcom_agent)

        queries_to_process = []
        try:
            with open(args.query_file, 'r') as f:
                queries_to_process = [line.strip() for line in f if line.strip()]
            print(f"Processing {len(queries_to_process)} queries from {args.query_file}")
        except FileNotFoundError:
            print(f"Error: Query file not found at {args.query_file}")
            return

        if args.generate_claims:
            print("Generating claims...")
            await checker.generate_and_verify_claims(queries_to_process, dry_run=args.dry_run)
        else:
            print("Ingesting claims from file...")
            await checker.ingest_and_verify_claims(dry_run=args.dry_run)
    finally:
        if mcp_server_process:
            mcp_server_process.terminate()

def str2bool(v):
        if isinstance(v, bool):
            return v
        if v.lower() in ('yes', 'true', 't', 'y', '1'):
            return True
        elif v.lower() in ('no', 'false', 'f', 'n', '0'):
            return False
        else:
            raise argparse.ArgumentTypeError('Boolean value expected.')
            
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="A script that processes an input file and optionally writes to an output file."
    )
    parser.add_argument(
        "--llm_provider",
        type=str,
        choices=["gemini", "openai", "anthropic"],
        default="gemini",
        help="The LLM provider to use for fact checking."
    )
    parser.add_argument(
        "--generate_claims",
        type=str2bool,
        default=True,
        help="Whether to generate claims from the LLM or ingest from file."
    )
    parser.add_argument(
        "--query",
        type=str,
        default=QUERY,
        help="The query to use for fact checking."
    )
    parser.add_argument(
        "--query_file",
        type=str,
        default="queries.txt",
        help="Path to a text file containing queries, one per line."
    )
    parser.add_argument(
        "--dry_run",
        type=str2bool,
        default=True,
        help="Whether to perform a dry run without writing output files."
    )
    
    args = parser.parse_args()
    asyncio.run(main())
    # asyncio.run(ask_data_commons({'claim_text': "What's the total GDP of Italy."}))