# @title #### **Step 3.** Start the Data Commons MCP server in a subprocess. {"display-mode":"form"}
# @markdown 👉  Run this cell

import asyncio
import subprocess
import sys
import time
import os
import logging

import aiohttp

MCP_PORT = 3000

logger = logging.getLogger(__name__)


async def wait_for_server_ready(
    url: str, process: subprocess.Popen, timeout_sec: int = 15
):
    """
    Actively polls the server's HTTP endpoint AND checks that the subprocess
    is still running. Replaces the unreliable 'asyncio.sleep()'.
    """
    logger.info(f"Waiting for server to launch at {url}...")
    start_time = time.time()

    async with aiohttp.ClientSession() as session:
        while True:
            # 1. First, check if the subprocess crashed or exited
            return_code = process.poll()
            if return_code is not None:
                # The process terminated. This is a hard failure.
                # Logs (if any) will have already printed to the notebook output.
                logger.error(
                    f"Server process failed to start (exit code {return_code}). See notebook output for server logs."
                )
                raise ChildProcessError(
                    f"MCP server process terminated unexpectedly (exit code {return_code}). See notebook output for server logs."
                )

            # 2. If it's running, try to connect via HTTP
            try:
                # We just need *any* response. Even a 404 (Not Found) or 405 (Method Not Allowed)
                # proves the server is up and responding to HTTP requests.
                # aiohttp.ClientConnectorError is the "Connection Refused" we expect to see while it's starting.
                async with session.get(url):
                    print("✅ MCP Server is up and responding.")
                    return  # Success!

            except aiohttp.ClientConnectorError:
                # This is expected. Server is not ready yet. Keep waiting.
                pass

            except Exception as e:
                # Any other exception might be a problem, log it.
                logger.warning(f"Health check received unexpected error: {e}")

            # 3. Check if we've run out of time
            if time.time() - start_time > timeout_sec:
                logger.error(
                    f"Timeout: Server did not respond within {timeout_sec} seconds."
                )
                # Kill the hung process
                process.kill()
                # Logs (if any) will have already printed to the notebook output.
                logger.error("Server logs (if any) should be visible above.")
                raise TimeoutError(
                    f"MCP Server failed to start at {url} within {timeout_sec}s."
                )

            # 4. Wait a moment before the next poll
            await asyncio.sleep(0.5)  # Poll every 500ms


async def start_mcp_server():
    #
    # --- Install uv in subprocess env ---
    #
    logger.info("Installing 'uv' package...")
    install_process = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "-q",
            "uv",
        ],  # This is the correct way to run pip
        check=False,
        capture_output=True,
        text=True,
    )

    if install_process.returncode != 0:
        logger.error("Subprocess failed to install 'uv': %s", install_process.stderr)
        raise RuntimeError("Could not install uv on subprocess")
    else:
        logger.info("'uv' package successfully installed.")

    #
    # --- Kill any existing process on the MCP port ---
    #
    logger.info(f"Ensuring port {MCP_PORT} is free...")
    # Kill any process on the port; we don't need to see the output.
    subprocess.run(
        ["fuser", "-k", f"{MCP_PORT}/tcp"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # gcloud_command = ["gcloud", "auth", "print-access-token"]
    # access_token_process = subprocess.run(gcloud_command, capture_output=True, text=True, check=True)
    # access_token = access_token_process.stdout.strip()

    # # Define environment variables for the subprocess
    # env_vars = {"AUTH_TOKEN": access_token}

    #
    # ---Start MCP Server ---
    #
    logger.info("Starting MCP server...")
    # DC_API_KEY = os.getenv("DATACOMMONS_API_KEY", "")
    # GENAI_API_KEY = os.getenv("GENAI_API_KEY", "")
    # GEMINI_API_KEY = os.getenv("GENAI_API_KEY", "")
    kernel_env = os.environ.copy()
    mcp_server_process = subprocess.Popen(
        [
            sys.executable,  # Call Python
            "-m",
            "uv",  # Run the 'uv' module (NOT 'uvx' or the install string)
            "tool",
            "run",  # The rest of the uv command
            "datacommons-mcp",
            "serve",
            "http",
            "--port",
            str(MCP_PORT),
        ],
        env=kernel_env,
        stdout=None,
        stderr=None,
    )
    # Give the server a moment to start up, then check that the server is running
    await asyncio.sleep(2)
    await wait_for_server_ready(
        url=f"http://localhost:{MCP_PORT}", process=mcp_server_process
    )
    return mcp_server_process # Return the process object