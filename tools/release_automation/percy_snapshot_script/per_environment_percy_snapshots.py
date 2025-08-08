# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#       https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
This script is designed to run Percy snapshots for Data Commons in different environments (staging or production).
It navigates to specified URLs and takes snapshots using Percy.
It uses Selenium WebDriver for browser automation.
It is intended to be run in a CI/CD environment, such as Google Cloud Build.
A percy token is required to authenticate the snapshots.

Usage:
    npx percy exec -- python3 per_environment_percy_snapshots.py --env staging
"""

import argparse
import json
import time
import os
import concurrent.futures

from percy import percy_snapshot
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager


# --- Configuration Constants ---
WAIT_TIMEOUT = 15
URLS_FILE = "urls.json"

# --- Helper Functions ---

# --- Revised setup_webdriver function ---
def setup_webdriver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")

    try:
        # Proper way to use ChromeDriverManager with Service
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        return driver
    except Exception as e:
        raise RuntimeError(f"Failed to set up WebDriver: {e}")

def load_urls(base_url: str):
    """Loads URLs from a JSON file and constructs full URLs."""
    urls_to_snapshot = {}
    try:
        with open(URLS_FILE, 'r') as f:
            urls_data = json.load(f)
        for entry in urls_data:
            if "name" not in entry or "path" not in entry:
                raise KeyError(f"Entry missing 'name' or 'path': {entry}")
            urls_to_snapshot[entry["name"]] = f"{base_url}{entry['path']}"
        print(f"Successfully loaded {len(urls_to_snapshot)} URLs from {URLS_FILE}. ✅")
        return urls_to_snapshot
    except FileNotFoundError:
        print(f"Error: The URL file '{URLS_FILE}' was not found. ⚠️")
        exit(1)
    except json.JSONDecodeError:
        print(
            f"Error: Could not decode JSON from '{URLS_FILE}'. Check file format. 💔"
        )
        exit(1)
    except KeyError as e:
        print(
            f"Error: Missing expected key in '{URLS_FILE}'. Make sure each entry has 'name' and 'path'. Missing: {e} 🔍"
        )
        exit(1)

def take_single_snapshot(name: str, url: str):
    """Worker function to navigate to a single URL and take a Percy snapshot."""
    print(f"[PID {os.getpid()}] Starting snapshot for '{name}' at {url}...")
    driver = None
    try:
        driver = setup_webdriver()
        driver.get(url)

        # Robust wait for the page to load completely.
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(5)  # Additional sleep to ensure full rendering
            print(f"[PID {os.getpid()}] Page '{name}' loaded. ✅")
        except TimeoutException:
            print(
                f"[PID {os.getpid()}] Warning: Timed out waiting for primary element (body) on '{name}'. Proceeding with fallback sleep. ⏳"
            )
            time.sleep(5)

        percy_snapshot(driver, name)
        print(f"[PID {os.getpid()}] Snapshot taken for '{name}'. Done. 🎉")
    except Exception as e:
        print(f"[PID {os.getpid()}] An error occurred while processing '{name}': {e} ❌")
        # Returning a failure status
        return False
    finally:
        if driver:
            driver.quit()
            
    # Returning a success status
    return True

# --- Main Execution ---
def main():
    """Main function to parse arguments, setup, run snapshots, and clean up."""
    parser = argparse.ArgumentParser(
        description="Run Percy snapshots for specified environment.")
    parser.add_argument(
        "--env",
        choices=["staging", "production"],
        default="production",
        help="Target environment: staging or production (default: production)")
    args = parser.parse_args()
    environment = args.env

    # Centralized mapping of environments to base URLs
    BASE_URLS = {
        "staging": "https://staging.datacommons.org",
        "production": "https://datacommons.org"
    }

    try:
        base_url = BASE_URLS.get(environment)
        if not base_url:
            raise ValueError(f"Invalid environment: {environment}")
        
        urls_to_snapshot = load_urls(base_url)

        # Use ProcessPoolExecutor for parallel execution
        # `max_workers` is set to the number of available cores.
        print(f"\nStarting parallel Percy snapshot process with {os.cpu_count()} workers... 📸")
        with concurrent.futures.ProcessPoolExecutor(max_workers=os.cpu_count()) as executor:
            # Submit tasks to the executor
            futures = [executor.submit(take_single_snapshot, name, url) for name, url in urls_to_snapshot.items()]
            
            # Wait for all tasks to complete
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
            
            if all(results):
                print("\nAll snapshots completed successfully! ✅")
            else:
                print("\nSome snapshots failed. Check logs for details. ❌")
                exit(1)

    except Exception as e:
        print(f"An unexpected error occurred in the main process: {e} 💥")
        exit(1)

if __name__ == "__main__":
    main()