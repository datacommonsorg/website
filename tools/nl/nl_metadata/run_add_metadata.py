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
This script triggers the 'stat-var-metadata-generator' Cloud Run job with dynamic partitioning.
It reads a list of Gemini API keys to use from the .env file, and based on that list, triggers the appropriate number of cloud run jobs.

Before running this script, make a copy of .env.sample and fill in your list of Gemini API keys. Also, make sure that you are authenticated with gcloud:
1. gcloud auth login
2. gcloud config set project datcom-website-dev

Then, run this script using the command `python ./run_add_metadata.py`
"""

import argparse
import os
import subprocess

from dotenv import load_dotenv

GCS_JOB_NAME = "stat-var-metadata-generator"
GCS_REGION = "us-central1"
DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"

load_dotenv(dotenv_path=DOTENV_FILE_PATH)


def extract_flag() -> argparse.Namespace:
  """
  Defines and extracts the gcsFolder to save results to from the command line arguments.
  """
  parser = argparse.ArgumentParser(description="./add_metadata.py")
  parser.add_argument(
      "--gcsFolder",
      help=
      "The folder in the GCS bucket to save the results to. Defaults to 'statvar_metadata'.",
      type=str,
      default="statvar_metadata")
  args = parser.parse_args()
  return args


def execute_cloud_run_jobs(api_keys: list[str], gcs_folder: str):
  """
    Executes the 'stat-var-metadata-generator' Cloud Run job with dynamic partitioning.
    For each API key provided, this script triggers a separate Cloud Run job execution.

    Args:
        api_keys: A list of API keys to be used for the job executions.
        gcs_folder: The GCS folder name to be passed as an argument to the job.
    """
  if not api_keys:
    print("Error: No API keys provided.")
    return

  total_partitions = len(api_keys)

  print(
      f"🚀 Starting {total_partitions} Cloud Run job executions for '{GCS_JOB_NAME}'..."
  )

  for i, api_key_value in enumerate(api_keys):
    curr_partition = i
    print(
        f"\n--- Starting Job Execution {i+1}/{total_partitions} (Partition {curr_partition}) ---"
    )

    container_args_list = ("add_metadata.py", "--generateAltSentences,"
                           "--useGCS,"
                           "--useBigQuery,"
                           f"--totalPartitions={total_partitions},"
                           f"--currPartition={curr_partition},"
                           f"--gcsFolder={gcs_folder}",
                           f"--geminiApiKey={api_key_value}")

    args_string = ",".join(container_args_list)
    command = [
        "gcloud", "run", "jobs", "execute", GCS_JOB_NAME,
        f"--region={GCS_REGION}",
        f"--update-env-vars=GEMINI_API_KEY={api_key_value}",
        f"--args={args_string}"
    ]

    print(f"Executing gcloud command...")
    try:
      subprocess.run(command, check=True, text=True, capture_output=True)
      print(f"✅ Job Execution {i+1}/{total_partitions} completed successfully.")

    except subprocess.CalledProcessError as e:
      print(f"❌ Error executing job {i+1}/{total_partitions}.")
      print(f"Stderr: {e.stderr}")
    except FileNotFoundError:
      print("❌ Error: 'gcloud' command not found.")
      print(
          "Please ensure the Google Cloud SDK is installed and in your system's PATH."
      )
      return


if __name__ == "__main__":
  args: argparse.Namespace = extract_flag()
  api_keys = [key for key in os.getenv("GEMINI_API_KEYS", "").split(",") if key]
  execute_cloud_run_jobs(api_keys=api_keys, gcs_folder=args.gcsFolder)
