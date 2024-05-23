#!/bin/bash
# Script to process stats using simple stats loader.
# Defaults
MODE="maindc"
OUTPUT_DIR=".data/output_$MODE"
USAGE="Script to load data to server
Usage: $(basename $0) [Options]
Options:
  -e <file>       Load environment variables from file.

For more, please refer to https://github.com/datacommonsorg/import/tree/master/simple
"
TMP_DIR=${TMP_DIR:-"/tmp"}
LOG=$TMP_DIR/log-stats-$(date +%Y%m%d).log
DC_IMPORT_JAR=${DC_IMPORT_JAR:-"$TMP_DIR/dc-import-tool.jar"}
RUN_STEPS="stats,validate"

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
  $cmd >> $LOG 2>&1
  status=$?
  [[ "$status" == "0" ]] || echo_fatal "Failed to run command: $cmd"
  return $status
}

# Parse command line options
function parse_options {
  while (( $# > 0 )); do
    case $1 in
      -e) shift; ENV_FILE=$1; source $ENV_FILE;;
      -q) QUIET="1";;
      -h) echo -e "$USAGE" >&2 && exit 0;;
      -x) set -x;;
      *) echo "Unknown option '$1'" && exit 1;;
    esac
    shift
  done
}


function setup_python {
  python3 -m venv $TMP_DIR/env
  source $TMP_DIR/env/bin/activate
  if [[ "$PYTHON_REQUIREMENTS_INSTALLED" != "true" ]]
  then
    echo_log "Installing Python requirements from $SIMPLE_DIR/requirements.txt"
    pip3 install -r $SIMPLE_DIR/requirements.txt >> $LOG 2>&1
    PYTHON_REQUIREMENTS_INSTALLED=true
  fi
}

function setup_dc_import {
  # Get the datacommons import jar
  if [[ -f "$DC_IMPORT_JAR" ]]; then
    echo_log "Using existing dc-import jar: $DC_IMPORT_JAR"
  else
    # Download the latest jar
    echo_log "Getting latest version of dc-import jar file..."
    # Get URLthe latest release
    jar_url=$(curl -vs  "https://api.github.com/repos/datacommonsorg/import/releases/latest" | \
      grep browser_download_url | cut -d\" -f4)
    [[ -z "$jar_url" ]] && echo_fatal "Unable to get latest jar for https://github.com/datacommonsorg/import/releases.
Please download manually and set command line option '-j'"
    jar=$(basename $jar_url)
    [[ -z "$DC_IMPORT_JAR" ]] && DC_IMPORT_JAR="$TMP_DIR/jar"
    echo_log "Downloading dc-import jar from $jar_url into $DC_IMPORT_JAR..."
    curl -Ls "$jar_url" -o $DC_IMPORT_JAR
    [[ -f "$DC_IMPORT_JAR" ]] || echo_fatal "Failed to download $jar_url"
  fi
}

function setup {
  parse_options "$@"

  # Source env file variables
  if [[ -n "$ENV_FILE" ]]; then
    echo_log "Loading env variables from $ENV_FILE"
    set -a
    source $ENV_FILE
    set +a
  fi


  # Set additional options
  GCS_OUTPUT_DIR=""
  is_output_gcs=$(echo "$OUTPUT_DIR" | grep "gs://" )
  if [[ -n "$is_output_gcs" ]]; then
    # Generate output locally and copy to GCS
    GCS_OUTPUT_DIR="$OUTPUT_DIR"
    OUTPUT_DIR="$TMP_DIR/$(basename $OUTPUT_DIR)-$(date +%Y%m%d)"
    echo_log "Generating output to: $OUTPUT_DIR and will be copied to GCS: $GCS_OUTPUT_DIR"
  fi

  # Fork a process to display log
  touch $LOG
  if [[ -z "$QUIET" ]]; then
    tail -f $LOG &
    # Kill forked processes on exit
    trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT
  fi

  # Get dir for simple stats importer
  SIMPLE_DIR=$(dirname $0 | sed -e 's,/simple.*,/simple,')
  SIMPLE_DIR=$(readlink -f $SIMPLE_DIR)

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
  mkdir -p $OUTPUT_DIR
  OUTPUT_DIR=$(readlink -f $OUTPUT_DIR)

  # Clear state from old run
  report_json=$OUTPUT_DIR/process/report.json
  rm $report_json

  # Run the simple importer
  local cwd="$PWD"
  cd "$SIMPLE_DIR"
  cmd="python -m stats.main $importer_options"
  echo_log "Running command: $cmd"
  $cmd >> $LOG 2>&1
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

# Copy files from local folder to GCS
function copy_to_gcs {
  local dir="$1"; shift
  local gcs_dir="$1"; shift

  [[ -z "$gcs_dir" ]] && return

  cmd="gsutil -m cp -r $dir $gcs_dir"
  run_cmd $cmd
  echo_log "Copied output files to $gcs_dir"
  run_cmd gsutil ls -l -r "$gcs_dir"
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
  copy_to_gcs "$OUTPUT_DIR" "$GCS_OUTPUT_DIR"
}

main "$@"
