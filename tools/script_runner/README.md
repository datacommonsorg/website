# Generic Script Runner

This directory contains a generic script runner that can be used to execute scripts in a containerized environment. The Dockerfile in this directory is configured to copy the `tools/` and `scripts/` directories, as well as all top-level scripts, into the container.

## Cloud Build Execution

The `cloudbuild.push_image.yaml` file defines a Cloud Build job that builds and pushes the script runner image to the Google Container Registry. This image can then be used in subsequent Cloud Build steps to execute scripts.

### Triggering the Build

You can trigger the build using the `gcloud` command-line tool.

```bash
gcloud builds submit --config tools/script_runner/cloudbuild.push_image.yaml --project=datcom-ci
```
