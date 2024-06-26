#!/bin/bash
# Script to load data into custom Data Commons using simple importer.
# Defaults
USAGE="Script to load data into custom Data Commons using simple importer.
Usage: $(basename $0) [Options] <env-file>
Options:
  -e <file>       Load environment variables from file. Example: env.list
  -h              Display this help string.

For more, please refer to https://github.com/datacommonsorg/import/tree/master/simple
"
TMP_DIR=${TMP_DIR:-"/tmp"}
LOG=$TMP_DIR/log-stats-$(date +%Y%m%d).log
RUN_STEPS="stats,embeddings"

function echo_log {
  echo -e "[$(date +%Y-%m-%d:%H:%M:%S)] $@" >> $LOG
}

function echo_error {
  echo -e "[$(date +%Y-%m-%d:%H:%M:%S): ERROR] $@" >> $LOG
}

function echo_fatal {
  echo_error "FATAL: $@"
  exit 1
}

function run_cmd {
  local cmd="$@"
  echo_log "Running command: $cmd"
  local start_ts=$(date +%s)
  $cmd >> $LOG 2>&1
  status=$?
  local duration=$(( $(date +%s) - $start_ts))
  [[ "$status" == "0" ]] || echo_fatal "Failed to run command: $cmd"
  echo_log "Completed command: $cmd with status:$status in $duration secs"
  return $status
}

# Parse command line options
function parse_options {
  while (( $# > 0 )); do
    case $1 in
      -i) shift; INPUT_DIR=$(readlink -f "$1");;
      -c) shift; CONFIG=$(readlink -f "$1");;
      -k) shift; export DC_API_KEY="$1";;
      -o) shift; export OUTPUT_DIR="$1";;
      -r) shift; RUN_STEPS="$1";;
      -s) shift; export USE_CLOUDSQL=true; export CLOUDSQL_INSTANCE="$1";;
      -u) shift; export DB_USER="$1";;
      -p) shift; export DB_PASS="$1";;
      -e) shift; ENV_FILE="$1"; load_env_file "$ENV_FILE";;
      -q) QUIET="1";;
      -h) echo -e "$USAGE" >&2 && exit 0;;
      -x) set -x;;
      -*) echo "Unknown option '$1'" && exit 1;;
      *) ENV_FILE="$1"; load_env_file "$ENV_FILE";;
    esac
    shift
  done
}


function setup_python {
  PY_ENV_DIR=${PY_ENV_DIR:-"$TMP_DIR/py_env_load_data"}
  python3 -m venv "$PY_ENV_DIR"
  source "$PY_ENV_DIR/bin/activate"
  if [[ "$PYTHON_REQUIREMENTS_INSTALLED" != "true" ]]
  then
    echo_log "Installing Python requirements from $SIMPLE_DIR/requirements.txt"
    run_cmd pip3 install -r "$SIMPLE_DIR/requirements.txt"
    PYTHON_REQUIREMENTS_INSTALLED=true

    # Setup python for building NL embeddings
    embeddings_req="$WEBSITE_DIR/tools/nl/embeddings/requirements.txt"
    if [[ -f "$embeddings_req" ]]; then
      echo_log "Installing Pytorch"
      run_cmd python -m pip install --upgrade pip
      run_cmd pip3 install torch==2.2.2 --extra-index-url \
        "https://download.pytorch.org/whl/cpu"
      echo_log "Installing Python requirements from $embeddings_req"
      run_cmd pip3 install -r "$embeddings_req"
      # TODO: remove install once embeddings doesn't need nl_server/requirements.txt
      # nlserver_req="$WEBSITE_DIR/nl_server/requirements.txt"
      # echo_log "Installing Python requirements from $nlserver_req"
      # run_cmd pip3 install -r "$nlserver_req"
    fi
  fi
}

# Setup submodules
# import module is used for stats loading.
function setup_submodules {
  local cwd="$PWD"
  cd "$WEBSITE_DIR"
  run_cmd scripts/update_git_submodules.sh
  if [[ -d "$WEBSITE_DIR/import/simple" ]]; then
    SIMPLE_DIR=${SIMPLE_DIR:-"$WEBSITE_DIR/import/simple"}
  fi
  cd "$cwd"
}

# Returns 0 if the argument is a local dir and doesn't start with 'gs://'
function is_local_dir {
  local dir="$1"; shift;

  is_gcs=$(echo "$dir" | grep 'gs://')
  [[ -n "$is_gcs" ]] && return 1
  return 0
}

function setup {
  echo_log "Running script: $0 $@"
  WEBSITE_DIR=$(dirname $(dirname $(realpath $0 )))
  parse_options "$@"

  setup_submodules

  # Set output dir if GCS path is set
  if [[ -n "$GCS_DATA_PATH" ]]; then
    OUTPUT_DIR="$GCS_DATA_PATH"
  fi

  if [[ -z "$OUTPUT_DIR" ]]; then
    if [[ -n "$INPUT_DIR" ]]; then
      OUTPUT_DIR=$(dirname $INPUT_DIR)"/output"
    fi
  fi

  if is_local_dir "$OUTPUT_DIR"; then
    mkdir -p "$OUTPUT_DIR"
    OUTPUT_DIR=$(readlink -f "$OUTPUT_DIR")
  fi

  # Fork a process to display log continuously
  touch $LOG
  if [[ -z "$QUIET" ]]; then
    tail -f $LOG &
    LOG_PID=$!
    # Kill forked processes on exit
    trap "trap - SIGTERM && cleanup 2>/dev/null" SIGINT SIGTERM EXIT
  fi

  # Get dir for simple stats importer
  SIMPLE_DIR=${SIMPLE_DIR:-$(dirname $(realpath $0) | sed -e 's,/simple.*,/simple,')}
}

# Cleanup when existing script
function cleanup {
  exit_status=$?
  [[ -n "$LOG_PID" ]] && kill -9 $LOG_PID
  exit $exit_status
}

# Load envronment variables from a file.
function load_env_file {
  local env_file="$1"; shift
  [[ -f "$env_file" ]] || echo_fatal "Unable to load env file: $env_file"
  echo_log "Loading env variables from $ENV_FILE"
  set -a
  source "$env_file"
  set +a
}

# Check parameters for simple_import
function check_simple_import {
  if [[ "$INPUT_DIR$CONFIG" == "" ]]; then
    echo_fatal "No input directory or config. Set 'INPUT_DIR' in '$ENV_FILE'.
$USAGE"
  fi

  # Check for DC API key
  if [[ "$DC_API_KEY" == "" ]]; then
    echo_log "Warning: DC_API_KEY not set and may cause failures.
Set a DataCommons API key in '$ENV_FILE'.
To get a key, please refer to https://docs.datacommons.org/api/rest/v2/getting_started#authentication"
  fi
}

# Run the simple import on the specified config/input files.
# Generates output into OUTPUT_DIR
function simple_import {
  check_simple_import
  setup_python

  # Build options for simple importer
  cmd=("python" "-m stats.main")
  [[ -n "$INPUT_DIR" ]] && cmd+=("--input_dir=$INPUT_DIR")
  [[ -n "$CONFIG" ]] && cmd+=("--config_file=$CONFIG")
  [[ -n "$OUTPUT_DIR" ]] && cmd+=("--output_dir=$OUTPUT_DIR")

  # Clear state from old run
  report_json="$OUTPUT_DIR/process/report.json"
  [[ -f "$report_json" ]] && rm "$report_json"

  # Run the simple importer
  local cwd="$PWD"
  cd "$SIMPLE_DIR"
  run_cmd "${cmd[@]}"
  cmd_status=$?
  cd "$cwd"
  if [[ "$cmd_status" != "0" ]]; then
    echo_fatal "Failed to run simple importer: $cmd. Logs in $LOG"
  fi

  status=$cmd_status
  [[ -f "$report_json" ]] && status=$(grep '"status"' "$report_json")
  echo_log "simple importer: $status"
}

# Generate embeddings for sentences
function generate_embeddings {
  setup_python
  if [[ -z "$NL_DIR" ]]; then
    if [[ -n "$OUTPUT_DIR" ]]; then
      NL_DIR="$OUTPUT_DIR/nl"
    fi
    if [[ -n "$GCS_DATA_PATH" ]]; then
      NL_DIR="$GCS_DATA_PATH/nl"
    fi
  fi
  echo_log "Building embeddings for sentences in $NL_DIR"
  local cwd="$PWD"
  cd "$WEBSITE_DIR"

  NL_EMBEDDINGS_DIR="$NL_DIR/embeddings"
  EMBEDDINGS_PATH="$NL_EMBEDDINGS_DIR/embeddings.csv"
  CUSTOM_EMBEDDING_INDEX="user_all_minilm_mem"
  CUSTOM_MODEL="ft-final-v20230717230459-all-MiniLM-L6-v2"
  CUSTOM_MODEL_PATH="gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2"
  CUSTOM_CATALOG_DICT=$(cat <<EOF
{
  "version": "1",
  "indexes": {
    "$CUSTOM_EMBEDDING_INDEX": {
      "store_type": "MEMORY",
      "source_path": "$NL_DIR",
      "embeddings_path": "$EMBEDDINGS_PATH",
      "model": "$CUSTOM_MODEL"
    }
  },
  "models": {
    "$CUSTOM_MODEL": {
      "type": "LOCAL",
      "usage": "EMBEDDINGS",
      "gcs_folder": "$CUSTOM_MODEL_PATH",
      "score_threshold": 0.5
    }
  }
}
EOF
)
  local start_ts=$(date +%s)
  set -x
  python -m tools.nl.embeddings.build_embeddings \
    --embeddings_name "$CUSTOM_EMBEDDING_INDEX" \
    --output_dir "$NL_EMBEDDINGS_DIR" \
    --catalog "$CUSTOM_CATALOG_DICT" >> $LOG 2>&1
  set +x
  status=$?
  local duration=$(( $(date +%s) - $start_ts))
  [[ "$status" == "0" ]] || echo_fatal "Failed to build embeddings"
  echo_log "Completed building embeddings with status:$status in $duration secs"
  cd "$cwd"
}

# Run a specific step
function run_step {
  local step_name="$1"; shift
  local step_fn="$1"; shift

  has_stage=$(echo "$RUN_STEPS" | egrep -i "$step_name")
  [[ -n "$has_stage" ]] && $step_fn $@
}

# Return if being sourced
(return 0 2>/dev/null) && return

function main {
  setup "$@"
  run_step "stats|simple" simple_import
  run_step "embeddings" generate_embeddings
}

main "$@"
