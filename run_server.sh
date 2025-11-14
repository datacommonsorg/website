#!/usr/bin/env bash

# 1. Strict Mode
set -euo pipefail

# --- Global Variables & Defaults ---
MCP_PID=""

# Defaults
PORT=8080
FLASK_ENV="local"
DC_MCP_PORT="3001"
ENABLE_MODEL="false"
ENABLE_EVAL_TOOL="true"    # Default true
ENABLE_DISASTER_JSON="false"
USE_GUNICORN="false"
ENABLE_MCP=""
WEBSITE_MIXER_API_ROOT=""

# --- Helper Functions ---

function log() {
  echo -e "[INFO] $(date '+%H:%M:%S') - $1"
}

function warn() {
  echo -e "[WARNING] $(date '+%H:%M:%S') - $1" >&2
}

function err() {
  echo -e "[ERROR] $(date '+%H:%M:%S') - $1" >&2
}

function cleanup() {
  # Kill background MCP server if running
  if [[ -n "$MCP_PID" ]]; then
    log "Stopping MCP server (PID $MCP_PID)..."
    kill "$MCP_PID" 2>/dev/null || true
  fi

  # Deactivate virtualenv if active
  if declare -f deactivate > /dev/null; then
    log "Deactivating virtual environment..."
    deactivate
  fi
  
  log "Done."
}

# Register cleanup to run on EXIT (success, error, or Ctrl+C)
trap cleanup EXIT

function show_help() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -e, --env <env>          Set FLASK_ENV (e.g., lite, custom). Default: local
  -p, --port <port>        Set port. Default: 8080
  -m, --enable-nl-model    Enable natural language models
  -x, --no-eval            Disable embedding eval playground
  -d, --disaster-json      [Local dev] Enable disaster JSON cache
  -l, --local-mixer        [Local dev] Use local mixer (localhost:8081)
  -g, --gunicorn           Use Gunicorn for production simulation
  -a, --enable-mcp [mode]  Run the DC MCP server as a separate process. Mode can be 'http' (default) or 'stdio'.
  -h, --help               Show this help message
EOF
  exit 0
}

function run_mcp_server() {
  local log_dir="tmp/logs"
  local log_file="${log_dir}/mcp_server.log"

  if ! command -v uv &> /dev/null; then
    err "'uv' is not installed. Cannot start MCP server."
    exit 1
  fi

  # Export the port only if we are actually starting the server.
  export DC_MCP_URL="http://localhost:${DC_MCP_PORT}"

  mkdir -p "$log_dir"
  log "Starting MCP server at $DC_MCP_URL ... Logs: $log_file"

  # Run in background & capture PID
  uvx datacommons-mcp serve http --port "$DC_MCP_PORT" > "$log_file" 2>&1 &
  MCP_PID=$!
}

function compile_protos() {
  if command -v protoc &> /dev/null; then
    log "Compiling Protobufs..."
    protoc -I=./server/config/ --python_out=./server/config ./server/config/subject_page.proto
  else
    err "protoc not found. Skipping compilation."
  fi
}

# --- Argument Parsing ---

while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--env)
      FLASK_ENV="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -m|--enable-nl-model)
      ENABLE_MODEL="true"
      shift
      ;;
    -x|--no-eval)
      ENABLE_EVAL_TOOL="false"
      shift
      ;;
    -d|--disaster-json)
      ENABLE_DISASTER_JSON="true"
      shift
      ;;
    -l|--local-mixer)
      WEBSITE_MIXER_API_ROOT="http://127.0.0.1:8081"
      shift
      ;;
    -g|--gunicorn)
      USE_GUNICORN="true"
      shift
      ;;
    -a|--enable-mcp)
      # Check for optional argument.
      if [[ -n "${2-}" && "$2" != -* ]]; then
        if [[ "$2" == "http" || "$2" == "stdio" ]]; then
          ENABLE_MCP="$2"
          shift 2
        else
          err "Invalid value for --enable-mcp: '$2'. Valid values are 'http' or 'stdio'."
          exit 1
        fi
      else
        ENABLE_MCP="http" # Default value
        shift
      fi
      ;;
    -h|--help)
      show_help
      ;;
    *)
      err "Unknown option: $1"
      show_help
      ;;
  esac
done

# --- Setup & Configuration ---

# Activate Virtual Env
VENV_PATH=".env/bin/activate"
if [[ -f "$VENV_PATH" ]]; then
  # shellcheck source=/dev/null
  source "$VENV_PATH"
else
  err "Virtual environment not found at $VENV_PATH."
  exit 1
fi

# Export Environment Variables
export GOOGLE_CLOUD_PROJECT="datcom-website-dev"
export ENABLE_DATAGEMMA="true"
export ENABLE_MODEL
export ENABLE_EVAL_TOOL
export ENABLE_DISASTER_JSON

if [[ -n "$WEBSITE_MIXER_API_ROOT" ]]; then
  export WEBSITE_MIXER_API_ROOT
fi

# Handle Flask Env Logic
if [[ "$FLASK_ENV" == "local" || "$FLASK_ENV" == "test" ]]; then
  if [[ -z "${ENV_PREFIX:-}" ]]; then
    export ENV_PREFIX="DC"
  fi
else
  export ENV_PREFIX="Local"
fi
export FLASK_ENV

# --- Main Execution ---

# 1. Start MCP as separate server if requested
if [[ "$ENABLE_MCP" == "http" ]]; then
  run_mcp_server
  # Wait a moment and check if the server is still running.
  sleep 2
  if ! ps -p "$MCP_PID" > /dev/null; then
    err "MCP server failed to start or stopped unexpectedly."
    err "Check logs for details: tmp/logs/mcp_server.log"
    exit 1
  fi
elif [[ "$ENABLE_MCP" == "stdio" ]]; then
  warn "MCP stdio mode is not yet implemented, agentic nl detection will not be enabled."
fi

log "Starting app with FLASK_ENV='$FLASK_ENV' on port='$PORT'"

# 2. Start Web Server
if [[ "$USE_GUNICORN" == "true" ]]; then
  exec gunicorn --log-level info --preload --timeout 1000 --bind "localhost:${PORT}" -w 4 web_app:app
else
  compile_protos
  python3 web_app.py "$PORT"
fi