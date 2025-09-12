# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
This file contains all the configuration constants for the NL metadata script.
"""

# --- Main File Paths and GCS Config ---
DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"
STAT_VAR_SHEET = "tools/nl/embeddings/input/base/sheets_svs.csv"
EXPORTED_FILE_DIR = "tools/nl/nl_metadata"
OUTPUT_FILENAME_PREFIX = "sv_complete_metadata"

GCS_PROJECT_ID = "datcom-nl"
GCS_BUCKET = "metadata_for_vertexai_search"
GCS_FILE_DIR_RETRIES = "statvar_metadata_retries"
GCS_FILE_DIR_FULL = "full_statvar_metadata_staging"
GCS_FILE_DIR_NL = "nl_statvar_metadata_staging"

# --- BigQuery Config ---
BIGQUERY_IN_CLAUSE_BATCH_SIZE = 10000
BIGQUERY_QUERY_BASE = "SELECT * FROM `datcom-store.dc_kg_latest.StatisticalVariable` WHERE name IS NOT NULL AND prov_id != \"dc/base/ExperimentalStatVars\""

# --- Gemini API Config ---
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_TEMPERATURE = 1
GEMINI_TOP_P = 1
GEMINI_SEED = 0
GEMINI_MAX_OUTPUT_TOKENS = 65535
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2

# --- Batching and Paging Config ---
PAGE_SIZE = 3000  # For BQ query results
BATCH_SIZE = 100  # For Gemini API calls

# --- Stat Var Schema Properties ---
MEASURED_PROPERTY = "measuredProperty"
NAME = "name"
POPULATION_TYPE = "populationType"
STAT_TYPE = "statType"

# --- Run Modes ---
RUN_MODE_NL_ONLY = "nl_only"
RUN_MODE_BIGQUERY = "bigquery"
RUN_MODE_RETRY_FAILURES = "retry_failures"
RUN_MODE_BIGQUERY_DIFFS = "bigquery_diffs"
RUN_MODE_COMPACT = "compact"
