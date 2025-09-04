# Use Redis as memory cache

## Deploy Redis

If you would like to use [Cloud Memorystore](https://cloud.google.com/memorystore/docs/redis/quickstart-gcloud), run

```bash
./gke/create_redis.sh website <ENV> <REGION>
```

`<ENV>` is the name of an instance and `<REGION>` is a region that the app is hosted in.
This needs to be run for all the regions that the app is hosted. Check out the
regions from the project GKE cluster console.

Record the **host** and **port** as inline config file.
- [Website example](../deploy/helm_charts/envs/prod.yaml) under `website.redis`.

## Deploying Redis for Mixer

The Redis creation script can also be used for Mixer, either standalone or
with website. Mixer Redis instances are named `mixer-cache`.

Standalone:
```bash
./gke/create_redis.sh mixer-standalone <ENV> <REGION>
```

With website:
```bash
./gke/create_redis.sh mixer-website <ENV> <REGION>
```

You will need to record the host and port, though the expected config format is
YAML instead of JSON.
- [Mixer for website example](../deploy/helm_charts/envs/prod.yaml) under `mixer.redis`.
- [Standalone mixer example](../mixer/deploy/helm_charts/envs/mixer_autopush.yaml) under `mixer.redis`

## Clear the cache

Follow the instructions of [clear cache tool](../tools/clearcache/README.md) to clear Redis cache.

When clearing the cache for website, both `webserver-cache` and `mixer-cache` (if it exists) are cleared.
