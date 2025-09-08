# Tool to clear the website and mixer cache

This directory contains a script and a Cloud Build configuration to clear the Redis cache for the website and mixer applications.

TODO: Move this over to a helper repo to be shared across mixer and website.

## Manual Execution

The `run.sh` script allows you to clear the cache for a specific target (`website` or `mixer`) and environment (`dev`, `staging`, `prod`, or `autopush`).

### Usage

```bash
./tools/clearcache/run.sh <TARGET> <ENVIRONMENT>
```

### Examples

To clear the website cache in the `dev` environment:

```bash
./tools/clearcache/run.sh website dev
```

To clear the mixer cache in the `autopush` environment:

```bash
./tools/clearcache/run.sh mixer autopush
```

## Cloud Build Execution

The `cloudbuild.clear_cache.yaml` file defines a Cloud Build job that can be triggered to clear the cache. This is the recommended way to clear the cache in a controlled environment.

### Triggering the Build

You can trigger the build using the `gcloud` command-line tool. You need to provide the `_TARGET` and `_ENVIRONMENT` substitutions.

### Examples

To clear the website cache in the `autopush` environment:

```bash
gcloud builds submit --config tools/clearcache/cloudbuild.clear_cache.yaml --substitutions=_TARGET=website,_ENVIRONMENT=autopush
```

To clear the mixer cache in the `autopush` environment:

```bash
gcloud builds submit --config tools/clearcache/cloudbuild.clear_cache.yaml --substitutions=_TARGET=mixer,_ENVIRONMENT=autopush
```
