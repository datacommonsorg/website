# Node Docker Image

## Description

node is a Docker image based on node:18.4.0-slim that comes with a pre-installed
node_modules based on the Data Commons
[package.json](https://github.com/datacommonsorg/website/blob/master/static/package.json)

## node_modules are pre-installed

Installing node dependencies from scratch is very slow. To improve the overall
speed of running `npm install`, the Docker image comes bundled with existing
`node_modules` directories.

For each directory with a package.json, copy `node_modules` and update the
dependencies rather than installing the entire node_modules from scratch.

`npm install` is smart enough to know which files are not up-to-date. Simply run
`npm install` with a newer version of
[package.json](https://github.com/datacommonsorg/website/blob/master/static/package.json)

## How to build the Docker image

To generate the Docker image and push it to GCS, change the version number in
cloudbuild.yaml, then run:

```bash
./push_image.sh
```

Note: You may need to contact the Data Commons team to get permission to push
the image into the `datcom-ci` project.

## How to use the image

Building the Docker image will automatically download the latest
[package.json](https://github.com/datacommonsorg/website/blob/master/static/package.json)
and run `npm install`.

The dependencies inside `static/node-modules/`, `package/client/node_modules/`,
and `package/web-components/node_modules` will be up-to-date as of the date the
Docker image was built.

To compile client code using these pre-loaded dependencies, from the repo root:

```bash
# Assumes you are running on Cloud Build in the context of the website repo and
# the node image
./build/node/load_preinstalled_modules.sh
./run_test.sh -b
```
