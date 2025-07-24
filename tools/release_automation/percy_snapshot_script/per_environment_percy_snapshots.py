# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
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
import os
import time
import json

from percy import percy_snapshot
from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# --- Configuration Constants ---
WAIT_TIMEOUT = 15
URLS_FILE = "urls.json"

# --- Helper Functions ---

def setup_webdriver():
    """Initializes and returns a Chrome WebDriver instance with common options."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    try:
        driver = webdriver.Chrome(options=chrome_options)
        print("WebDriver initialized successfully. 🚀")
        return driver
    except Exception as e:
        print(f"Error initializing Chrome driver: {e} ❌")
        print("Ensure Chrome and ChromeDriver are installed and accessible in your environment.")
        exit(1)

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
        print(f"Successfully loaded URLs from {URLS_FILE}. ✅")
        return urls_to_snapshot
    except FileNotFoundError:
        print(f"Error: The URL file '{URLS_FILE}' was not found. ⚠️")
        exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{URLS_FILE}'. Check file format. 💔")
        exit(1)
    except KeyError as e:
        print(f"Error: Missing expected key in '{URLS_FILE}'. Make sure each entry has 'name' and 'path'. Missing: {e} 🔍")
        exit(1)

def take_percy_snapshots(driver, urls: dict):
    """Navigates to each URL and takes a Percy snapshot."""
    print("\nStarting Percy snapshot process... 📸")
    for name, url in urls.items():
        print(f"\nNavigating to {url} for snapshot '{name}'...")
        driver.get(url)

        # Robust wait for the page to load completely.
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(5)  # Additional sleep to ensure full rendering
            print(f"Page '{name}' appears to have loaded (body element found). ✅")
        except TimeoutException:
            print(
                f"Warning: Timed out waiting for primary element (body) on '{name}'. Page might not be fully loaded. Proceeding with a short fallback sleep. ⏳"
            )
            time.sleep(5)

        print(f"Taking Percy snapshot for: '{name}'... 📷")
        percy_snapshot(driver, name)
        print(f"Snapshot taken for '{name}'. Done. 🎉")

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

    driver = None
    try:
        driver = setup_webdriver()

        # Get the base URL from the dictionary
        base_url = BASE_URLS.get(environment)

        urls_to_snapshot = load_urls(base_url)

        take_percy_snapshots(driver, urls_to_snapshot)

    finally:
        if driver:
            driver.quit()
            print("\nBrowser closed. 👋")

if __name__ == "__main__":
    main()