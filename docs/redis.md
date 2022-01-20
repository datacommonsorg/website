# Use Redis as memory cache

## Deploy Redis

If you would like to use [Cloud Memorystore](https://cloud.google.com/memorystore/docs/redis/quickstart-gcloud), run

```bash
cd gke
./create_redis.sh <REGION>
```

Need to run this for all the regions that the app is hosted. The regions can be
found in config.yaml.

Record the **host** and **port** as deployment config file
([example](../deploy/overlays/prod/redis.json)) and make a patch to the
deployment ([example](../deploy/overlays/patch_deployment.yaml)).

## Clear the cache

Follow the instructions of [clear cache tool](../tools/clearcache/README.md) to clear Redis cache.

Note the tool now only clears production Redis cache. You may need to update it
to clear other Redis instance.
