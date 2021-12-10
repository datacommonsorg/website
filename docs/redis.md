# Use Redis as memory cache

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
