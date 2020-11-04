# node-package Docker Image

## Description

node-package is a Docker image based on node:12 that comes with a pre-installed node_modules.zip based on the Data Commons dc/website/package.json.

## node_modules.zip is pre-installed

Installing node dependencies from scratch is very slow.
To improve the overall speed of running `npm install`, the node-package image comes bundled with an existing `node_modules.zip`.

You can unzip this file and install the delta file updates rather than
installing the entire node_modules from scratch.

`npm install` is smart enough to know which files to install.
Simply run `npm install`with your newer `package.json`


## How to build the Docker image

To generate the Docker image and push it to GCS, run

```bash
gcloud builds submit . --config=cloudbuild.yaml
```

Note: You may need to contact the Data Commons team to get permission to push the
image into the `datcom-ci` project.

## How to update the node_modules folder inside the image

Building the Docker image will automatically download the latest `package.json` from `dc/website:master` and run `npm install`.

The `node_modules/` folder will be zipped for faster transfer: `node_modules.zip`

The dependencies inside node-modules will be up-to-date as of the date the image was built.

Running `npm install` over the existing `node_modules` with a newer `package.json` will install any missing files.