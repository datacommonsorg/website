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
It handles Google Sign-In for IAP protected pages, navigates to specified URLs, and takes snapshots using Percy.
It uses Selenium WebDriver for browser automation and Google Cloud Secret Manager to retrieve credentials.
It is intended to be run in a CI/CD environment, such as Google Cloud Build.
A percy token is required to authenticate the snapshots.

Usage:
    npx percy exec -- python3 per_environment_percy_snapshots.py --env staging
"""

import argparse
import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from percy import percy_snapshot

import google.cloud.secretmanager_v1beta1 as secretmanager


# --- Configuration Constants ---
_SECRET_PROJECT = "datcom-ci"
_SECRET_NAME = "webdriver-gmail-password"
WAIT_TIMEOUT = 15  # Increased timeout for general waits to be more robust
LOGIN_PAGE_TIMEOUT = 5 # Shorter timeout for initial login page detection


# --- Google Sign-In for IAP protected page ---
def login(driver):
    """
    Handles Google Sign-In for IAP protected pages.
    Assumes the driver is currently on a page that will redirect to Google's login if not authenticated.
    """
    print("Attempting Google Sign-In process...")
    try:
        # Wait for an element that indicates the IAP/Google login page is present.
        # This XPath looks for a button containing 'iap.googleapis.com' which is specific
        # to the IAP login flow. Adjust if your login page indicator is different.
        WebDriverWait(driver, LOGIN_PAGE_TIMEOUT).until(
            EC.presence_of_element_located(
                (By.XPATH, "//button[contains(., 'iap.googleapis.com')]"))
        )
        print("IAP login page detected. Proceeding with credentials.")
    except TimeoutException:
        print("IAP login page not detected within timeout. Assuming already logged in or not an IAP protected page.")
        return # Exit if not on the login page

    try:
        # Enter username (email)
        print("Entering username...")
        username_input = WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, 'input'))
        )
        username_input.send_keys("datacommons.webdriver@gmail.com")

        # Click the 'Next' button for username
        username_next_button = WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Next')]"))
        )
        driver.execute_script("arguments[0].click();", username_next_button)
        print("Username entered, clicked Next.")
        time.sleep(2) # Give a moment for the next page to load

        # Enter password
        print("Retrieving password from Secret Manager...")
        secret_client = secretmanager.SecretManagerServiceClient()
        secret_path = secret_client.secret_version_path(_SECRET_PROJECT, _SECRET_NAME, 'latest')
        secret_response = secret_client.access_secret_version(name=secret_path)
        password = secret_response.payload.data.decode('UTF-8')

        print("Entering password...")
        password_input = WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@type='password']"))
        )
        password_input.send_keys(password)

        # Click the 'Next' button for password
        password_next_button = WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Next')]"))
        )
        driver.execute_script("arguments[0].click();", password_next_button)
        print("Password entered, clicked Next. Login process complete.")
        time.sleep(5) # Allow time for redirection after successful login

    except TimeoutException as e:
        print(f"Login failed: A required element was not found or clickable within timeout: {e}")
    except NoSuchElementException as e:
        print(f"Login failed: Element not found during login process: {e}")
    except WebDriverException as e:
        print(f"Login failed due to WebDriver error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during login: {e}")


# --- Parse command line arguments ---
parser = argparse.ArgumentParser(description="Run Percy snapshots for specified environment.")
parser.add_argument(
    "--env",
    choices=["staging", "production"],
    default="production",
    help="Target environment: staging or production (default: production)"
)
args = parser.parse_args()
environment = args.env


# --- Configure Chrome options ---
chrome_options = Options()
chrome_options.add_argument("--headless") # Run Chrome without a UI
chrome_options.add_argument("--no-sandbox") # Required for some CI environments
chrome_options.add_argument("--disable-dev-shm-usage") # Overcomes limited resource problems in some environments
chrome_options.add_argument("--window-size=1920,1080") # Set a consistent window size for snapshots


# --- Initialize WebDriver ---
try:
    print("Initializing Chrome WebDriver...")
    driver = webdriver.Chrome(options=chrome_options)
    print("WebDriver initialized successfully.")
except Exception as e:
    print(f"Error initializing Chrome driver: {e}")
    print("Ensure Chrome and ChromeDriver are installed and accessible in your environment.")
    exit(1)


# --- Define URLs ---
# Base URL for the target environment
base_url = "https://staging.datacommons.org" if environment == "staging" else "https://datacommons.org"

urls_to_snapshot = {
    "DataCommons Homepage": f"{base_url}",
    "DataCommons Explore Page": f"{base_url}/explore"
}


# --- Main execution flow ---
try:
    # Navigate to an initial URL to potentially trigger the login flow.
    # Using the homepage as it's typically the first point of entry.
    initial_url_for_login = urls_to_snapshot["DataCommons Homepage"]
    print(f"\nNavigating to initial URL: {initial_url_for_login} to handle potential login...")
    driver.get(initial_url_for_login)

    # Conditionally attempt login only for staging environment
    if environment == "staging":
        print("Staging environment detected. Attempting Google Sign-In for IAP...")
        login(driver)
        # After login, ensure we are back on the expected page or refresh if needed.
        # This sleep helps ensure the redirect after login completes.
        time.sleep(5)
        # Optional: Re-navigate to the initial page or verify current URL after login
        if driver.current_url != initial_url_for_login and not driver.current_url.startswith(base_url):
            print(f"Redirected after login. Navigating back to: {initial_url_for_login}")
            driver.get(initial_url_for_login)
    else:
        print("Production environment detected. Skipping IAP login.")

    # --- Take Percy Snapshots for defined URLs ---
    print("\nStarting Percy snapshot process...")
    for name, url in urls_to_snapshot.items():
        print(f"\nNavigating to {url} for snapshot '{name}'...")
        driver.get(url)

        # Robust wait for the page to load completely.
        # It waits for the <body> element to be present, indicating basic page structure.
        # For more complex pages, consider waiting for a specific, key content element (e.g., By.ID, "main-content")
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            print(f"Page '{name}' appears to have loaded (body element found).")
        except TimeoutException:
            print(f"Warning: Timed out waiting for primary element (body) on '{name}'. Page might not be fully loaded. Proceeding with a short fallback sleep.")
            time.sleep(5) # Fallback sleep if explicit wait fails to ensure some loading time

        print(f"Taking Percy snapshot for: '{name}'...")
        percy_snapshot(driver, name)
        print(f"Snapshot taken for '{name}'.")

finally:
    # Ensure the browser is closed even if errors occur
    if 'driver' in locals() and driver:
        driver.quit()
        print("\nBrowser closed.")