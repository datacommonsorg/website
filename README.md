## Development Locally

### Download the config file that contains api key.

Save https://storage.cloud.google.com/datcom-browser-prod.appspot.com/configmodule.py in
current folder. If you don't have permission, please contact DataCommons team

### Run all the tests.

```bash
./run_test.sh
```

### Package javascript and static assets.

```bash
cd static
npm install --update
npm run-script watch
```

### Start Flask Server.

- Install Python3 virtual enviornment: https://docs.python.org/3/library/venv.html

  ```bash
  python3 -m venv .env
  ```

- Activate the python3 virtual environment:

  ```bash
  source .env/bin/activate
  ```

- Start flask webserver locally at localhost:8080
  ```bash
  ./run_local.sh
  ```

## Deploy to AppEngine

- Build compiled asset bundle:

  ```bash
  cd static
  npm run-script build
  cd ..
  ```

- Deploy to Staging:

  ```bash
  gcloud config set project datcom-browser-staging
  gcloud app deploy app_staging.yaml -q --no-promote
  ```

- Deploy to Prod:

  ```bash
  gcloud config set project datcom-browser-prod
  gcloud app deploy app_prod.yaml -q --no-promote
  ```


## Update resource files

### placeid2dcid.json
This file is stored in GCS bucket: datcom-browser-prod.appspot.com (for prod) and
datcom-browser-prod.appspot.com (for local and staging). For updating this file,
please contact DataCommons team.
