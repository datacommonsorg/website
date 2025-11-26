# Data Commons Fact Checker Extension

This directory contains the source code for the Data Commons Fact Checker Chrome Extension. This extension allows users to verify statistical claims on any webpage using Data Commons data.

## Setup

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select this directory (`website/chrome_extension`).

## Environment Variables

To run the full stack locally (Chrome Extension + Backend Server + MCP Server), you need to configure environment variables for both the main Website Server and the MCP Server.

### 1. Website Server (Flask)
These variables are used by the main Data Commons website server (`server/`).

| Variable | Description | Required? | Example |
| :--- | :--- | :--- | :--- |
| `FLASK_ENV` | The environment to run in. | **Yes** | `local` |
| `GEMINI_API_KEY` | API key for Google Gemini (LLM features). | **Yes** | `AIzaSy...` |
| `DC_NL_API_KEY` | API key for the Data Commons NL Service. | **Yes** | `...` |
| `WEBSITE_MIXER_API_ROOT` | URL of the Data Commons Mixer API. | No | `https://api.datacommons.org` |
| `ENABLE_DATAGEMMA` | Enable DataGemma UI features. | No | `true` |
| `SECRET_PROJECT` | GCP project ID for secret manager (if not local). | No | `datcom-website-dev` |

**How to set:**
Export them in your terminal before running `python web_app.py`:
```bash
export FLASK_ENV=local
export GEMINI_API_KEY="your-key-here"
export DC_NL_API_KEY="your-key-here"
python web_app.py 8080
```

### 2. MCP Server (Agent)
The MCP (Model Context Protocol) server is responsible for the agentic reasoning and tool use. It is typically run as a subprocess or a separate service.

| Variable | Description | Required? | Example |
| :--- | :--- | :--- | :--- |
| `DATACOMMONS_API_KEY` | API key for Data Commons Data API. | **Yes** | `...` |
| `GEMINI_API_KEY` | API key for Google Gemini (Reasoning). | **Yes** | `AIzaSy...` |

**Note:** If running via the `subprocess_mcp.py` script (e.g., in a notebook or the backend), it will inherit environment variables from the parent process. Ensure these are set in the environment where you launch the process.

### Running MCP Server Manually
If you need to run the MCP server manually (e.g., for debugging), use `uv`:

```bash
export DATACOMMONS_API_KEY="your-key"
export GEMINI_API_KEY="your-key"
uv tool run datacommons-mcp serve http --port 3000
```


## Architecture
*   **Chrome Extension**: Frontend (Side Panel). Communicates with the Website Server.
*   **Website Server**: Flask App. Proxies requests to the MCP Server or handles them directly.
*   **MCP Server**: Agent backend. Uses `datacommons-mcp` to reason about claims and query Data Commons.
