#!/bin/bash
# Script to load data into custom dc using simple importer.
# Defaults
MODE="customdc"
OUTPUT_DIR=".data/output_$MODE"
USAGE="Script to load data into custom dc using simple importer.
Usage: $(basename $0) [Options]
Options:
  -c <file>       JSON config file for stats importer
  -e <file>       Load environment variables from file.
  -i <dir>        Input directory to process
  -k <api-key>    Data Commons API Key
  -o <dir>        Output folder for stats importer. Default: $OUTPUT_DIR
  -j <jar>        Data Commons Import java JAR file.
                    Download latest from https://github.com/datacommonsorg/import/releases/
  -r <steps>      Steps to run. Can be one or more of the following:
                    stats, validate, embeddings
  -s <cloud_sql>  Cloud SQL instance. Also set DB_USER and DB_PASS with -u, -p
  -u <username>   DB username for cloud SQL. Default: $DB_USER.
  -p <password>   DB password for cloud SQL. Default: $DB_PASS.

For more, please refer to https://github.com/datacommonsorg/import/tree/master/simple
"
TMP_DIR=${TMP_DIR:-"/tmp"}
LOG=$TMP_DIR/log-stats-$(date +%Y%m%d).log
DC_IMPORT_JAR=${DC_IMPORT_JAR:-"$TMP_DIR/dc-import-tool.jar"}
RUN_STEPS="stats,validate,embeddings"

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
      -k) shift; DC_API_KEY="$1";;
      -o) shift; OUTPUT_DIR="$1";;
      -m) shift; MODE="$1";;
      -j) shift; DC_IMPORT_JAR="$1";;
      -r) shift; RUN_STEPS="$1";;
      -s) shift; USE_CLOUDSQL=true; CLOUDSQL_INSTANCE="$1";;
      -u) shift; DB_USER="$1";;
      -p) shift; DB_PASS="$1";;
      -e) shift; ENV_FILE=$1;
          echo_log "Loading env variables from $ENV_FILE"
          set -a; source $ENV_FILE; set +a
          ;;
      -q) QUIET="1";;
      -h) echo -e "$USAGE" >&2 && exit 0;;
      -x) set -x;;
      *) echo "Unknown option '$1'" && exit 1;;
    esac
    shift
  done
}


function setup_python {
  PY_ENV_DIR=${PY_ENV_DIR:-"$TMP_DIR/py_env_load_data"}
  python3 -m venv $PY_ENV_DIR
  source $PY_ENV_DIR/bin/activate
  if [[ "$PYTHON_REQUIREMENTS_INSTALLED" != "true" ]]
  then
    echo_log "Installing Python requirements from $SIMPLE_DIR/requirements.txt"
    run_cmd pip3 install -r $SIMPLE_DIR/requirements.txt
    PYTHON_REQUIREMENTS_INSTALLED=true

    # Setup python for building NL embeddings
    embeddings_req="$WEBSITE_DIR/tools/nl/embeddings/requirements.txt"
    if [[ -f "$embeddings_req" ]]; then
      echo_log "Installing Pytorch"
      run_cmd python -m pip install --upgrade pip
      run_cmd pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
      echo_log "Installing Python requirements from $embeddings_req"
      run_cmd pip3 install -r "$embeddings_req"
      nlserver_req=$WEBSITE_DIR/nl_server/requirements.txt
      echo_log "Installing Python requirements from $nlserver_req"
      run_cmd pip3 install -r "$nlserver_req"
    fi
  fi
}

function setup_dc_import {
  # Get the datacommons import jar
  if [[ -f "$DC_IMPORT_JAR" ]]; then
    echo_log "Using existing dc-import jar: $DC_IMPORT_JAR"
  else
    # Download the latest jar
    echo_log "Getting latest version of dc-import jar file..."
    # Get URL to the latest release
    jar_url=$(curl -vs  "https://api.github.com/repos/datacommonsorg/import/releases/latest" | \
      grep browser_download_url | cut -d\" -f4)
    [[ -z "$jar_url" ]] && echo_fatal "Unable to get latest jar for https://github.com/datacommonsorg/import/releases.
Please download manually and set command line option '-j'"
    jar=$(basename $jar_url)
    u[ -z "$DC_IMPORT_JAR" ]] && DC_IMPORT_JAR="$TMP_DIR/jar"
    echo_log "Downloading dc-import jar from $jar_url into $DC_IMPORT_JAR..."
    curl -Ls "$jar_url" -o $DC_IMPORT_JAR
    [[ -f "$DC_IMPORT_JAR" ]] || echo_fatal "Failed to download $jar_url"
  fi
}

# Setup submodules
# import module is used for stats loading.
function setup_submodules {
  local cwd=$PWD
  cd $WEBSITE_DIR
  run_cmd scripts/update_git_submodules.sh
  if [[ -d "$WEBSITE_DIR/import/simple" ]]; then
    SIMPLE_DIR=${SIMPLE_DIR:-"$WEBSITE_DIR/import/simple"}
  fi
  cd $cwd
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


  if is_local_dir $OUTPUT_DIR; then
    mkdir -p $OUTPUT_DIR
    OUTPUT_DIR=$(readlink -f $OUTPUT_DIR)
  fi

  # Fork a process to display log
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

# Check parameters for simple_import
function check_simple_import {
  if [[ "$INPUT_DIR$CONFIG" == "" ]]; then
    echo_fatal "No input directory or config. Specify one of '-i' or '-c' command line options.
$USAGE"
  fi

  # Check for DC API key
  if [[ "$DC_API_KEY" == "" ]]; then
    echo_log "Warning: DC_API_KEY not set and may cause failures.
Set a DataCommons API key with '-k' option.
To get a key, please refer to https://docs.datacommons.org/api/rest/v2/getting_started#authentication"
  fi
}

# Run the simple import on the specified config/input files.
# Geneates output into OUTPUT_DIR
function simple_import {
  check_simple_import
  setup_python

  # Export env variables for simple stats importer
  export DC_API_KEY=${DC_API_KEY}
  export USE_CLOUDSQL=${USE_CLOUDSQL}
  export CLOUDSQL_INSTANCE=${CLOUDSQL_INSTANCE}
  export DB_USER=${DB_USER}
  export DB_PASS=${DB_PASS}

  # Build options for simple importer
  local importer_options=""
  [[ -n "$INPUT_DIR" ]] && importer_options="$importer_options --input_dir=$INPUT_DIR"
  [[ -n "$CONFIG" ]] && importer_options="$importer_options --config_file=$CONFIG"
  [[ -n "$MODE" ]] && importer_options="$importer_options --mode=$MODE"
  [[ -n "$OUTPUT_DIR" ]] && importer_options="$importer_options --output_dir=$OUTPUT_DIR"

  # Clear state from old run
  report_json=$OUTPUT_DIR/process/report.json
  rm $report_json

  # Run the simple importer
  local cwd="$PWD"
  cd "$SIMPLE_DIR"
  cmd="python -m stats.main $importer_options"
  run_cmd $cmd
  cmd_status=$?
  cd "$cwd"
  if [[ "$cmd_status" != "0" ]]; then
    echo_fatal "Failed to run simple importer: $cmd. Logs in $LOG"
  fi

  status=$(grep '"status"' $report_json)
  echo_log "simple importer: $status"
}

# Generate tmcf for a csv file in dir
function get_or_generate_tmcf {
  set -x
  local dir="$1"; shift

  tmcf=$(ls $dir/*.tmcf | head -1)
  [[ -n "$tmcf" ]] && echo "$tmcf" && return

  # Create a new tmcf for columns in csv
  csv=$(ls $dir/*.csv | head -1)
  tmcf=$(echo "$csv" | sed -e 's/.csv$/.tmcf/')
  # TODO: generate tmcf based on csv columns
  cat <<END_TMCF > $tmcf
Node: E:Stats->E0
typeOf: dcs:StatVarObservation
observationAbout: C:Stats->entity
observationDate: C:Stats->date
variableMeasured: C:Stats->variable
value: C:Stats->value
END_TMCF
  echo "$tmcf"
  set +x
}

# Run dc-import genmcf to validate generated csv/mcf files.
function validate_output {
  #TODO: For customdc validate data in sql triples db and observations db
  # get output csv if any.
  local output_csv=$(ls $OUTPUT_DIR/*.csv 2>/dev/null)
  if [[ -z "$output_csv" ]]; then
    echo_log "Skipping validate as there are no csv files in $OUTPUT_DIR"
    return
  fi
  setup_dc_import
  echo_log "Validating output in $OUTPUT_DIR"

  # Get the tmcf file to validate csv stats.
  tmcf=$(get_or_generate_tmcf "$OUTPUT_DIR")

  # Run dc-import
  DC_IMPORT_CMD="genmcf"
  [[ "$MODE" == "customdc" ]] && DC_IMPORT_CMD="lint"
  cmd="java -jar $DC_IMPORT_JAR $DC_IMPORT_CMD -n 20 -r FULL $OUTPUT_DIR/*.csv $tmcf -o $OUTPUT_DIR/dc_generated"
  run_cmd $cmd
  echo_log "Output of validation in $OUTPUT_DIR/dc_generated/report.json"
}

# Generate embeddings for sentences
function generate_embeddings {
  setup_python
  NL_DIR=${NL_DIR:-"$OUTPUT_DIR/nl"}
  echo_log "Building embeddings for sentences in $NL_DIR"
  local cwd="$PWD"
  cd $WEBSITE_DIR
  run_cmd python -m tools.nl.embeddings.build_custom_dc_embeddings \
    --sv_sentences_csv_path=$NL_DIR/sentences.csv --output_dir=$NL_DIR
  cd "$cwd"
}

# Return if being sourced
(return 0 2>/dev/null) && return

# Run a specific step
function run_step {
  local step_name="$1"; shift
  local step_fn="$1"; shift

  has_stage=$(echo "$RUN_STEPS" | egrep -i "$step_name")
  [[ -n "$has_stage" ]] && $step_fn
}

function main {
  setup "$@"
  run_step "stats|simple" simple_import
  run_step "validate" validate_output
  run_step "embeddings" generate_embeddings
}

main "$@"
