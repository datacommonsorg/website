# Deploying Feature Flags

This script automates the deployment of feature flags to a Google Cloud Storage (GCS) bucket and optionally restarts a Kubernetes deployment.

## Usage

```bash
./deploy_feature_flags.sh <environment>
```


Where `<environment>` is one of:

* `dev`
* `staging`
* `production`
* `autopush`

## Environment Variables

* `GOOGLE_APPLICATION_CREDENTIALS`: The path to your Google Cloud credentials file.

## How it Works

1. **Validate the environment:** The script checks if the provided environment is one of the valid options (`dev`, `staging`, `production`, or `autopush`).
2. **Construct the filename:** The filename is created using the provided environment (e.g., `dev.json`, `staging.json`).
3. **Find the Python command:** The script searches for the Python interpreter (`python3` or `python`).
4. **Validate the JSON file:** It uses the Python `json.tool` module to check if the JSON file is valid.
5. **Construct the bucket name:** The bucket name is formed using the environment, with "datcom-website-" as a prefix and "prod-resources" for production.
6. **Confirm for production:** If deploying to production, it asks for confirmation from the user.
7. **Fetch staging flags (production only):** If deploying to production, it fetches the feature flags from the staging bucket (`datcom-website-staging-resources/feature_flags.json`).
8. **Compare staging and production flags (production only):** If deploying to production, it compares the staging and production flags and exits if there are differences.
9. **Upload the JSON file to GCS:** It uses the `gsutil` command to upload the JSON file to the appropriate GCS bucket.
10. **Prompt for Kubernetes restart:** It asks the user if they want to restart the Kubernetes deployment.
11. **Restart the Kubernetes deployment (optional):** If the user confirms, it uses `gcloud` commands to restart the Kubernetes deployment.

## Important Notes

* This script assumes you have the Google Cloud SDK installed and configured.
* The script expects a JSON file named `dev.json`, `staging.json`, or `production.json` in the current directory.
* The script can be modified to upload different files or perform additional actions after the deployment.