# Data Commons Website

This repo hosts code for the Data Commons website.

## About Data Commons

[Data Commons](https://datacommons.org/) is an open knowledge graph that
provides a unified view across multiple public data sets and statistics.
We've bootstrapped the graph with lots of
[data](https://datacommons.org/datasets) from US Census, CDC, NOAA, etc.,
and through collaborations with the New York Botanical Garden,
Opportunity Insights, and more. However, Data Commons is
meant to be for community, by the community. We are excited to work with you
to make public data accessible to everyone.

To see the extent of data we have today, browse the graph using our
[browser](https://browser.datacommons.org/browser).

## Contributing

### GitHub Workflow

In [https://github.com/datacommonsorg/website](https://github.com/datacommonsorg/website), click on "Fork" button to fork the repo.

Clone your forked repo to your desktop.

Add datacommonsorg/website repo as a remote:

```shell
git remote add dc https://github.com/datacommonsorg/website.git
```

Every time when you want to send a Pull Request, do the following steps:

```shell
git checkout master
git pull dc master
git checkout -b new_branch_name
# Make some code change
git add .
git commit -m "commit message"
git push -u origin new_branch_name
```

Then in your forked repo, you can send a Pull Request. If this is your first
time contributing to a Google Open Source project, you may need to follow the
steps in [CONTRIBUTING.md](CONTRIBUTING.md).

Wait for approval of the Pull Request and merge the change.

### Local Development

#### Get permission to use API KEY

Contact Data Commons team to get permission for access of secret manager.

#### Set Google Application Credential

Contact Data Commons team to get permission for GCP application credential.
Then run the following command once

```bash
gcloud config set project datcom-browser-staging && \
gcloud auth application-default login
```

This will generate a json file in your local machine, record the path and set
the environment variable in your ~/.bash_profile or ~/.bashrc file

```bash
export GOOGLE_APPLICATION_CREDENTIALS=<JSON_CREDENTIAL_PATH>
```

#### Install web browser and webdriver

Before running the tests, install the browser and webdriver. Here we recommend you use Google Chrome browser and ChromeDriver.

* Chrome browser can be downloaded [here](https://www.google.com/chrome/).

* ChromeDriver can be downloaded [here](https://chromedriver.chromium.org/downloads/version-selection), or you can download it using package manager directly:

  ```bash
  npm install chromedriver
  ```

If using Linux system, you can run the following commands to download Chrome browser and ChromeDriver, this will also include the path setup:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb; sudo apt-get -fy install
wget https://chromedriver.storage.googleapis.com/84.0.4147.30/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/bin/chromedriver
sudo chown root:root /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver
```

Note: You can change `84.0.4147.30`(version number) to the lastet version [here](https://chromedriver.storage.googleapis.com/LATEST_RELEASE).

#### Run all the tests

```bash
./run_test.sh -a
```

#### Update React test snapshots

```bash
cd static
npm test testfilename -- -u
```

#### Package javascript and static assets

```bash
./run_npm.sh
```

This will watch static files change and re-build on code edit.

#### Start the Flask Server

Start the flask webserver locally at localhost:8080

```bash
./run_server.sh
```

#### Start the server using Docker

Another way to start the server locally is to use Docker.

Make sure you have installed [Docker Desktop](https://www.docker.com/products/docker-desktop).

Build Docker image

```bash
docker build -t datacommonsorg-website .
```

Run it locally

```bash
docker run \
-p 8080:8080 \
-e GOOGLE_APPLICATION_CREDENTIALS=<JSON_CREDENTIAL_PATH> \
-v $GOOGLE_APPLICATION_CREDENTIALS:<JSON_CREDENTIAL_PATH>:ro \
datacommonsorg-website
```

### Update resource files

#### placeid2dcid.json

This file is stored in GCS bucket: datcom-browser-prod.appspot.com (for prod) and
datcom-browser-staging.appspot.com (for local and staging). To update this file,
please contact Data Commons team.

## License

Apache 2.0

## Support

For general questions or issues, please open an issue on our
[issues](https://github.com/datacommonsorg/website/issues) page. For all other
questions, please send an email to `support@datacommons.org`.

**Note** - This is not an officially supported Google product.
