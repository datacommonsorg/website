# Node Docker Image

## Description

node is a Docker image based on node:18.4.0-slim that comes with a pre-installed
node_module based on the Data Commons
[package.json](https://github.com/datacommonsorg/website/blob/master/static/package.json)

## node_modules is pre-installed

Installing node dependencies from scratch is very slow. To improve the overall
speed of running `npm install`, the Docker image comes bundled with an existing
`node_modules` directory.

Copy `node_modules` and update the dependencies rather than installing the
entire node_modules from scratch.

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

## How to update the node_modules folder inside the Docker image

Building the Docker image will automatically download the latest
[package.json](https://github.com/datacommonsorg/website/blob/master/static/package.json)
and run `npm install`.

The dependencies inside `node-modules/` will be up-to-date as of the date the
Docker image was built.

Running `npm install` over the existing `node_modules` with a newer version
[package.json](https://github.com/datacommonsorg/website/blob/master/static/package.json)
will install any missing files.
