# Developer Guide

## First Time Setup

To get started with setting up the website for local development, see the [Setup Guide](first_time_setup.md).

## Repo Overview

This website repository ("website") holds code for the frontend of Data Commons, including https://datacommons.org, [Custom Data Commons](https://docs.datacommons.org/custom_dc/), the [JavaScript client](https://www.npmjs.com/package/@datacommonsorg/client), the [web components](https://docs.datacommons.org/api/web_components/), and more.

The file structure is as follows:

```
├── .github/             # GitHub Actions workflows (CI/CD) and templates
├── build/               # Build scripts and configuration (Dockerfiles)
├── custom_dc/           # Sample configurations for Custom Data Commons instances
├── deploy/              # Deployment scripts (GKE/Cloud Run)
├── docs/                # Developer guides and documentation
├── gke/                 # Google Kubernetes Engine configuration files
├── import/              # Submodule: Import scripts used for loading Custom DC data
├── mixer/               # Submodule: Code for the Data Commons Mixer (backend)
├── model_server/        # Code for the model hosting server
├── nl_server/           # Code for the Natural Language (NL) search server
├── packages/            # Shared internal packages/libraries (often for UI)
├── scripts/             # Utility and maintenance scripts
├── server/              # Main Python website server code (Flask/endpoints)
├── shared/              # Shared resources and logic used across website and nl servers
├── static/              # Static assets: CSS, JavaScript, images, and data files for website
│   └── src/               # Entry point for the NodeJS Charts server
│   └── nodejs_server/     # Main lib code for the NodeJs Charts server
├── tools/               # Developer tools (e.g., golden generators, verifiers)
├── nl_app.py            # Entry point for the NL server
├── web_app.py           # Entry point for the main website server
├── run_*.sh             # Various convenience scripts to run the servers/tests locally
└── skaffold.yaml        # Configuration for Skaffold (Kubernetes development, Cloud Deploy)
```

## Running Flask Locally

For changes that do not test GCP deployment or involve mixer changes, one can
simply run flask in a local environment (Mac or Linux machine). The local
Flask app talks to the [autopush mixer](https://autopush.api.datacommons.org).

Note: the `autopush mixer` contains the latest data and mixer code changes. It
is necessary to update the mixer submodule if compatibility is required between
website and mixer changes.

### Package javascript and static assets

```bash
./run_npm.sh
```

This will watch static files change and re-build on code edit.

If there are errors, make sure to run `nvm use v18.4.0` to set the correct version.

### Start the Flask Server

Start the flask webserver locally at `localhost:8080`

```bash
./run_server.sh
```

To enable NL search, follow the "Start NL Server" instructions in the next section.
Then, start the flask webserver with language models enabled via `-m`:

```bash
./run_server.sh -m
```

If you don't have access to the DataCommons Maps API, you can bring up website without
place search functionality:

```bash
./run_server.sh -e lite
```

There are multiple environments for the server, specified by `-e` options.
For example, `custom` is for custom data commons and `iitm` is
for iitm data commons.

To start multiple instances, bind each server instance to a different port.
The following example will start localhost on port 8081. The default is 8080.

Please note the strict syntax requirements for the script, and leave a space
after the flag. So: `./run_server.sh -p 8081` but not `./run_server.sh -p=8081`.

#### 🛠️ Troubleshooting server startup

<details>
  <summary>
    <b>ModuleNotFoundError</b>: missing python libraries...
  </summary>
  Clear the environment and rebuild all required libraries by running:

```bash
rm -rf .venv
./run_test.sh --setup_python
```

</details>

### Start NL Server

Natural language models are hosted on a separate server. For features that
depend on it (all NL-based interfaces and endpoints), the NL server needs
to be brought up locally (in a separate process):

```bash
./run_nl_server.sh -p 6060
```

By default the NL server runs on port 6060.

If you run into problems starting the server, try running these commands before restarting the server:

```bash
./run_test.sh --setup_python
rm -rf ~/.datacommons
rm -rf /tmp/datcom-nl-models
rm -rf /tmp/datcom-nl-models-dev
```

### Use Local Mixer

If local mixer is needed, can start it locally by following [these
instructions](https://github.com/datacommonsorg/mixer/blob/master/docs/developer_guide.md#develop-mixer-locally-as-a-go-server-recommended).
This allows development with custom BigTable or mixer code change. Make sure to
also [run ESP locally](https://github.com/datacommonsorg/mixer/blob/master/docs/developer_guide.md#running-esp-locally).

Then start the Flask server with `-l` option to let it use the local mixer:

```bash
./run_server.sh -l
```

## Running Tests

### Prerequisite: Install web browser and webdriver

:exclamation:**IMPORTANT**: Make sure that your **ChromeDriver version** is
compatible with your **local Google Chrome version**.

Before running the tests, install a browser and webdriver. We recommend
you use Google Chrome browser and ChromeDriver.

<details>
<summary>Instructions for installing Google Chrome and ChromeDriver</summary>

1.  Chrome browser can be downloaded [here](https://www.google.com/chrome/).

1.  ChromeDriver can be downloaded
    [here](https://chromedriver.chromium.org/downloads/version-selection). You can view the latest ChromeDriver version [here](https://chromedriver.storage.googleapis.com/LATEST_RELEASE). Or, download it using a package manager directly:

    ```bash
    npm install chromedriver
    ```

1.  Make sure PATH is updated with ChromeDriver's location. You can view the latest ChromeDriver version
    [here](https://chromedriver.storage.googleapis.com/LATEST_RELEASE).

If you're using a Linux system, you can run the following commands to download Chrome
browser and ChromeDriver, this will also include the path setup:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb; sudo apt-get -fy install
CHROMEDRIVERV=$(curl https://chromedriver.storage.googleapis.com/LATEST_RELEASE)
wget https://chromedriver.storage.googleapis.com/${CHROMEDRIVERV}/chromedriver_linux64.zip
unset CHROMEDRIVERV
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/bin/chromedriver
sudo chown root:root /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver
```

</details>

### Run tests

:exclamation: NOTE: If using MacOS with an ARM processor (M1 chip), run local NL server before running the tests:

```bash
./run_nl_server.sh -p 6060
```

Run all tests:

```bash
./run_test.sh -a
```

Run client-side tests:

```bash
./run_test.sh -c
```

Run server-side tests:

```bash
./run_test.sh -p
```

Run webdriver tests:

```bash
./run_test.sh -w
```

### Update React test snapshots

```bash
cd static
npm test . -- -u
```

## Deployment

Website is deployed in Kubernetes cluster. A deployment contains the following
containers:

- website: A Flask app with static files compiled by Webpack.
- mixer: A Data Commons API server.
- esp: Google Extensive Service Proxy used for endpoints management.

The code for mixer lives in our [mixer repo](https://github.com/datacommonsorg/mixer) and is included in website as a [submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules). **We read mixer's deployment info from the submodule.**

### Deploy to datcom-website-dev

**Note:** This section covers deploying the full website stack (Website + Mixer) to `datcom-website-dev`. 
*   If you need to deploy mixer changes to `datcom-mixer-dev`, please see [mixer/deploy/README.md](https://github.com/datacommonsorg/mixer/blob/master/deploy/README.md#deploy-to-mixer-dev-instance).

The deployment process involves:
1.  **Building and pushing artifacts** (Docker images) for Website and/or Mixer servers to Artifact Registry.
2.  **Triggering a rollout** via Google Cloud Deploy using those artifacts.

#### 1. Push Website Image

If you have website changes, commit them locally. Then run:

```bash
gcloud auth login
gcloud auth configure-docker
# Builds and pushes website image to GCR
./scripts/push_image.sh datcom-ci DEV
```
*   This will push the `datacommons-website`, `datacommons-nl`, and `datacommons-nodejs` images tagged with `dev-<git-hash>` (e.g., `dev-72c634f`).
  *   **Note**: This script does not push a mixer image.
  * Check for the image in [Artifact Registry (datacommons-website)](https://pantheon.corp.google.com/artifacts/docker/datcom-ci/us/gcr.io/datacommons-website?project=datcom-ci)

#### 2. Get Mixer Image Hash

**Standard Case**: Use an existing image tag available in Artifact Registry.
*   Mixer: [Artifact Registry (datacommons-mixer)](https://pantheon.corp.google.com/artifacts/docker/datcom-ci/us/gcr.io/datacommons-mixer?project=datcom-ci)

<details>
  <summary><strong>Alternative</strong>: If you need to incorporate local mixer changes, click to expand</summary>
<br>

* **Server Code Change**: Push the mixer image to Artifact Registry:

  1. In your fork of **the `mixer` repo**, run 
      ```bash
      # in mixer repo
      ./scripts/push_image.sh datcom-ci DEV
      ```
  2. This will push an image tagged with `dev-<mixer-git-hash>`.

*  **Deployment Change**: If you have modified deployment configurations (e.g., `deploy/helm_charts/values.yaml`, `deploy/helm_charts/envs/*.yaml`), you **MUST** pull these changes into the `website` repository prior to deploying.
   *  Update your local `website` repo's mixer submodule to point to your local `mixer` commit.

</details>

#### 3. Trigger Deployment

Once you have your hashes, run the cloud deploy script.

```bash
# Set your hashes (include the "dev-" prefix)
# Example: website_hash="dev-72c634f"
website_hash=dev-ac24b1f
mixer_hash=56ad581

# Deploy BOTH Website and Mixer to datcom-website-dev using datacommons-website-dev Delivery pipeline
./scripts/deploy_website_cloud_deploy.sh $website_hash $mixer_hash datacommons-website-dev
```

The `deploy_website_cloud_deploy.sh` script creates a new release in Google Cloud Deploy using the specified image tags. It does not build images locally; it deploys the already-pushed artifacts to the GKE dev instance.

Images tagged with "dev-" will not be picked up by our CI/CD pipeline for autodeployment.

View the deployment at [link](https://dev.datacommons.org).

Monitor rollout progress at: [Cloud Deploy Delivery Pipeline](https://pantheon.corp.google.com/deploy/delivery-pipelines/us-central1/datacommons-website-dev?project=datcom-ci)

### Deployment Issue: force stop

Force stop will create additional secrets pending/upgrading and stop future dev
deployment by helm. Run below CLI to validate/find the blocking secrets.

```shell
helm history --max 20 dc-website
helm history --max 20 dc-mixer
```

Then roll back to the previous version.

```shell
helm rollback <RELEASE_NAME> [REVISION]
```

After rollback, deployment can proceed again.

## Other Developing Tips

### Deploy latest code/data

The autopush instance(autopush.datacommons.org) always has the latest code and
data. For this to happen in other dev/demo instance, in a clean git checkout,
simply run:

```bash
./script/deploy_latest.sh <ENV_NAME> <REGION>
```

### Debug Flask in Visual Studio Code

1. [Optional] Update variables in 'env' of 'Flask' configurations in
   .vscode/launch.json as needed.

1. In the left hand side menu of VS Code, click on "Run and Debug".

1. On top of the "Run and Debug" pane, select "DC Website Flask" and click on
   the green "Play" button.

1. In "DEBUG CONSOLE" (not "TERMINAL"), check the server logs show up.

This brings up Flask server from the debugger. Now you can set break point and
inspect variables from the debugger pane.

TIPS: you can inspect variable in the botton of "DEBUG CONSOLE" window.

A full tutorial of debugging Flask app in Visual Studio Code is in
[here](https://code.visualstudio.com/docs/python/tutorial-flask).

### Manage Feature Flags

Feature flags are used to gate the rollout of features, and can easily be turned on/off in various environments. Please read the Feature Flags [guide](https://github.com/datacommonsorg/website/blob/master/docs/feature_flags.md).

### Add new charts in Place Page

1. Update [server/config/chart_config/](../server/config/chart_config)`<category>.json` with the new chart.

   ```javascript
      {
        "category": "", // The top level category this chart belongs to. Order of charts in the spec matters.
        "topic": "",  // Strongly encouraged - A page-level grouping for this chart.
        "titleId": "", // Strictly for translation purposes.
        "title": "", // Default (EN) display string
        "description": "", // Strictly for translation purposes.
        "statsVars": [""], // List of stat vars to include in the chart
        "isOverview": true, // Optional - default false. If the chart should be added to the overview page.
        "isChoropleth": true, // Optional - default false. If a map should be used to display the data
        "unit": "",
        "scaling": 100,
        "relatedChart": {  // Defined if there should be comparison charts added
          // All chart fields from above can be specified. If unspecified, it will be inherited.
        }
      }
   ```

1. Update related files.

   - If adding a new category, create a new config file in [server/chart_config](../server/chart_config) and add the new category to:

     - [static/js/shared/util.ts](../static/js/shared/util.ts)
     - [server/\_\_init\_\_.py](../server/__init__.py)

   - If a new stat var is introduced, also update:

     - Labels that appear as chips under comparison charts: [static/js/i18n/strings/en/stats_var_labels.json](../static/js/i18n/strings/en/stats_var_labels.json)
     - Titles on ranking pages: [static/js/i18n/strings/en/stats_var_titles.json](../static/js/i18n/strings/en/stats_var_titles.json)
     - New stat vars which have not been cached: [NEW_STAT_VARS](../server/configmodule.py)

   - If a new unit is required, update:
     - [static/js/i18n/i18n.tsx](../static/js/i18n/i18n.tsx)
     - [static/js/i18n/strings/\*/units.json](static/js/i18n/strings/en/units.json) (with display names and labels for the unit in **ALL** languages)

   Note: Please add very detailed descriptions to guide our translators. See localization.md for more details.

1. Run these commands:

   ```bash
   ./scripts/extract_messages.sh
   ./scripts/compile_messages.sh
   ```

1. **IMPORTANT**: Manually restart Flask to reload the config and translations. Most likely, this means re-running `run_server.py`

1. Test the data on a place page!

### Debugging Webdriver tests

For detailed debugging instructions (disabling headless mode, screenshots, flakiness), see the [WebDriver Testing Guide](webdriver.md#troubleshooting).

### GKE config

The GKE configuration is stored [here](../deploy/helm_charts/dc_website).

### Redis memcache

[Redis memcache](https://pantheon.corp.google.com/memorystore/redis/instances?project=datcom-website-prod)
is used for production deployment. Each cluster has a Redis instance located in
the same region.

### Testing cloudbuild changes

To test .yaml cloudbuild files, you can use cloud-build-local to dry run the file before actually pushing. Find documentation for how to install and use cloud-build-local [here](https://github.com/GoogleCloudPlatform/cloud-build-local).

### Inline Icons

The Data Commons site makes use of Material Design icons. In certain cases, font-based Material Design icon usage can result in
flashes of unstyled content that can be avoided by using SVG icons.

We have provided tools to facilitate the creation and use of Material SVG icons in both the Jinja template and in React components.
For instructions on how to generate and use these SVGs and components, please see: [Icon Readme](../tools/resources/icons/README.md):
