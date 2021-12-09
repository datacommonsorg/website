# Tool to clear the website cache

This tool clears all the [redis memcache](https://pantheon.corp.google.com/memorystore/redis/locations/us-central1/instances/webserver-cache/details?project=datcom-website-prod) of prod website deployment and it's
deployed as a cloud function. Much of the steps are borrowed from [here](https://cloud.google.com/memorystore/docs/redis/connect-redis-instance-functions#python).

## Deploy the function to Cloud Function

This is only needed when main.py is changed.

```bash
gcloud config set project datcom-website-prod

gcloud functions deploy clear_cache \
--runtime python37 \
--trigger-http \
--region us-central1 \
--vpc-connector projects/datcom-website-prod/locations/us-central1/connectors/redis-connector
```

## Execute

```bash
gcloud functions call clear_cache
```

If successful, the response displays `result: OK`. Otherwise, go to the GCP
console to check [logs](https://pantheon.corp.google.com/functions/details/us-central1/clear_cache?project=datcom-website-prod&tab=logs).
