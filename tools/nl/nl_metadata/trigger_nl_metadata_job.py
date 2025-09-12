# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-20.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
This script triggers the 'stat-var-metadata-generator' Cloud Run job.
It supports multiple run modes for the metadata generation script and can trigger partitioned jobs based on a list of Gemini API keys from the .env file.

SUPPORTED MODES:
- bigquery: Full metadata generation from BigQuery.
- bigquery_diffs: Generates metadata for new SVs by diffing against a GCS folder.
- retry_failures: Reprocesses SVs from a previous failed run.
- compact: Merges all .jsonl files in a GCS folder into one.

Before running, ensure you are authenticated with gcloud:
1. gcloud auth login
2. gcloud config set project datcom-nl

Then, run this script with the desired --runMode and other flags.
Example:
python3 ./trigger_nl_metadata_job.py --runMode=bigquery_diffs --gcsFolder=my_folder
"""

import argparse
import os
import subprocess

from dotenv import load_dotenv

GCS_JOB_NAME = "stat-var-metadata-generator"
GCS_REGION = "us-central1"
DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"

load_dotenv(dotenv_path=DOTENV_FILE_PATH)

def extract_args() -> argparse.Namespace:
  """
  Defines and extracts command line arguments.
  """
  parser = argparse.ArgumentParser(description="./trigger_nl_metadata_job.py")
  parser.add_argument("--runMode",
                      help="The run mode for the script.",
                      choices=[
                          "bigquery",
                          "bigquery_diffs",
                          "retry_failures",
                          "compact"
                      ],
                      required=True,
                      type=str)
  parser.add_argument(
      "--gcsFolder",
      help="The folder in the GCS bucket to save the results to or read from.",
      type=str,
      default=None)
  parser.add_argument(
      "--failedAttemptsPath",
      help="For retry_failures mode: Path in GCS to the failed attempts files.",
      type=str,
      default=None)
  parser.add_argument(
      "--output_filename",
      help="For compact mode: The name for the new, compacted file.",
      type=str,
      default=None)
  parser.add_argument(
      "--delete_originals",
      help="For compact mode: If set, deletes the original files after compaction.",
      action="store_true",
      default=False)
  parser.add_argument(
      "--maxStatVars",
      help="The maximum number of statvars to process from BigQuery.",
      type=int,
      default=None)
  parser.add_argument(
      "--language",
      help="The language for metadata results.",
      choices=["English", "French", "Spanish"],
      type=str,
      default="English")
  args = parser.parse_args()
  return args


def execute_cloud_run_jobs(api_keys: list[str], args: argparse.Namespace):
    """
    Executes the 'stat-var-metadata-generator' Cloud Run job.

    For partitioned modes, it triggers a separate execution for each API key.
    For compact mode, it runs a single job.

    Args:
        api_keys: A list of API keys for partitioned jobs.
        args: The parsed command-line arguments.
    """
    if not api_keys and args.runMode != 'compact':
        print("Error: No API keys provided for a partitioned job.")
        return

    # Compact mode runs as a single job
    if args.runMode == 'compact':
        total_partitions = 1
        api_keys = [""] # Dummy value to run loop once
    else:
        total_partitions = len(api_keys)

    print(f"🚀 Starting {total_partitions} Cloud Run job executions for '{GCS_JOB_NAME}' in '{args.runMode}' mode...")

    for i, api_key_value in enumerate(api_keys):
        curr_partition = i
        print(f"\n--- Starting Job Execution {i+1}/{total_partitions} (Partition {curr_partition}) ---")

        container_args_list = [
            "generate_nl_metadata.py",
            f"--runMode={args.runMode}",
            "--useGCS",
        ]

        if args.runMode != 'compact':
            container_args_list.extend([
                f"--totalPartitions={total_partitions}",
                f"--currPartition={curr_partition}",
                f"--geminiApiKey={api_key_value}",
            ])

        if args.gcsFolder:
            container_args_list.append(f"--gcsFolder={args.gcsFolder}")
        if args.language:
            container_args_list.append(f"--language={args.language}")

        if args.runMode in ['bigquery', 'bigquery_diffs'] and args.maxStatVars:
            container_args_list.append(f"--maxStatVars={args.maxStatVars}")

        if args.runMode == 'retry_failures' and args.failedAttemptsPath:
            container_args_list.append(f"--failedAttemptsPath={args.failedAttemptsPath}")
        
        if args.runMode == 'compact':
            if args.output_filename:
                container_args_list.append(f"--output_filename={args.output_filename}")
            if args.delete_originals:
                container_args_list.append("--delete_originals")

        args_string = ",".join(container_args_list)
        
        command = [
            "gcloud", "run", "jobs", "execute", GCS_JOB_NAME,
            f"--region={GCS_REGION}",
            f"--args={args_string}"
        ]
        if api_key_value:
             command.append(f"--update-env-vars=GEMINI_API_KEY={api_key_value}")

        print("Executing gcloud command...")
        try:
            subprocess.run(command, check=True, text=True)
            print(f"✅ Job Execution {i+1}/{total_partitions} completed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"❌ Error executing job {i+1}/{total_partitions}.")
            print(f"Stderr: {e.stderr}")
        except FileNotFoundError:
            print("❌ Error: 'gcloud' command not found.")
            print("Please ensure the Google Cloud SDK is installed and in your system's PATH.")
            return


if __name__ == "__main__":
  args: argparse.Namespace = extract_args()
  api_keys = [key for key in os.getenv("GEMINI_API_KEYS", "").split(",") if key]
  execute_cloud_run_jobs(api_keys=api_keys, args=args)