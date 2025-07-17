import argparse
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from percy import percy_snapshot

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
# chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--window-size=1920,1080")

# --- Initialize WebDriver ---
try:
    driver = webdriver.Chrome(options=chrome_options)
except Exception as e:
    print(f"Error initializing Chrome driver: {e}")
    print("Please ensure Chrome and ChromeDriver are available in the Cloud Build environment.")
    exit(1)

# --- Define URLs ---
base_url = "https://staging.datacommons.org" if environment == "staging" else "https://datacommons.org"

urls = {
    "DataCommons Homepage": f"{base_url}",
    "DataCommons Explore Page": f"{base_url}/explore"
}

# --- Take Percy Snapshots ---
try:
    for name, url in urls.items():
        print(f"Navigating to {url}...")
        driver.get(url)

        # Wait for the page to load completely
        driver.implicitly_wait(5) 

        print(f"Taking Percy snapshot for: {name}")
        percy_snapshot(driver, name)
        print(f"Snapshot taken for {name}")

finally:
    driver.quit()
    print("Browser closed.")
