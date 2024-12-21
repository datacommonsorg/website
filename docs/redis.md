# Use Redis as memory cache

## Deploy Redis

If you would like to use [Cloud Memorystore](https://cloud.google.com/memorystore/docs/redis/quickstart-gcloud), run

```bash
cd gke
./create_redis.sh <ENV> <REGION>
```

`<ENV>` is the name of an instance and `<REGION>` is a region that the app is hosted in.
This needs to be run for all the regions that the app is hosted. Check out the
regions from the project GKE cluster console.

Record the **host** and **port** as inline config file
([example](../deploy/helm_charts/envs/prod.yaml)) under `website.redis`.

## Clear the cache

Follow the instructions of [clear cache tool](../tools/clearcache/README.md) to clear Redis cache.

Note the tool now only clears production Redis cache. You may need to update it
to clear other Redis instance.
