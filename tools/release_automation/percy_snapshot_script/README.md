# Data Commons Percy Snapshot Automation

This repository contains the necessary files and scripts to automate Percy visual regression tests for Data Commons, leveraging Google Cloud Build for continuous integration. The process involves building a Docker image containing the Percy runner and the snapshot script, pushing it to Google Container Registry (GCR), and then executing the script within Cloud Build to take snapshots in specified environments (staging or production).

## Overview of the Process

1.  **Build Docker Image**: A Docker image is built that bundles the `per_environment_percy_snapshots.py` script along with its dependencies (Selenium, Percy CLI). This image also includes necessary browser drivers (ChromeDriver).
2.  **Push Docker Image to GCR**: The built Docker image is pushed to Google Container Registry, making it accessible for Cloud Build jobs.
3.  **Run Percy Snapshots via Cloud Build**: A Cloud Build job is triggered to run the `per_environment_percy_snapshots.py` script within the previously built Docker image. This script navigates to specified Data Commons URLs, handles Google Sign-In for IAP-protected staging environments, and takes Percy snapshots.
4.  **Secret Management**: Sensitive information like the Percy token and WebDriver credentials are securely managed using Google Secret Manager.

## Prerequisites

Before you begin, ensure you have the following:

* **Google Cloud SDK**: Installed and configured on your local machine.
* **Permissions**: Your GCP user account (or the service account running Cloud Build) needs the following IAM roles:
    * **Cloud Build Editor**
    * **Secret Manager Secret Accessor** (for accessing `webdriver-gmail-password` and `PERCY_TOKEN_RELEASES`)
    * **Storage Object Admin** (for pushing images to GCR)
* **Secrets in Secret Manager**:
    * A secret named `webdriver-gmail-password` in project `datcom-ci` containing the password for `datacommons.webdriver@gmail.com`.
    * A secret named `PERCY_TOKEN_RELEASES` in project `datcom-ci` containing your Percy Project Token. Ensure this secret has a version `latest`.
* **Percy Project**: A Percy project set up to receive snapshots.

## Files in this Repository

* `per_environment_percy_snapshots.py`: The Python script responsible for navigating web pages, handling login, and taking Percy snapshots.
* `cloudbuild.push_image.yaml`: Cloud Build configuration for building and pushing the Docker image.
* `cloudbuild.per_environment_percy_snapshots.yaml`: Cloud Build configuration for running the Percy snapshot script.
* `Dockerfile`: Defines how to build the Docker image for the Percy runner.

## Step-by-Step Guide

### 1. Build and Push the Docker Image

This step compiles your Dockerfile into an image and pushes it to Google Container Registry.

You will use the `cloudbuild.push_image.yaml` file.

**Command:**

```bash
gcloud builds submit --project=datcom-ci --config=cloudbuild.push_image.yaml .
```

### 2. Run Percy Runner

This step triggers the Google Cloud Build Action to run the percy runner on a specific environment.

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=_ENVIRONMENT=production .
```