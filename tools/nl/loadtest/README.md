# NodeJS Server Load Testing

## NL SVG Latency tester

A few tens of queries against the NodeJS NL server (`nodejs/query`) in series and tracks times.

Run it as:

```bash
./run_latencies.sh
```

## NL SVG Load tester

Runs specified number of queries against the NodeJS NL server (`nodejs/query`), running them specified number of queries at a time.

Run it as:

```bash
./run_load.sh \
    --instance=<bard|dev> \
    --total_requests=<total queries to send> \
    --parallel_requests=<number of queries to send at a time> \
    --apikey=<apikey for bard instance>
```

Notes about the arguments:

- If total requests is not set, this tool will run through all the queries in queryset.csv once
- If parallel requests is not set, this tool will run requests one after another in series
- With the current setup, 20000 total requests and 150 parallel requests will run for about 7 mins and achieve a qps of around 45
- For the apikey, you can go to the [Apigee Console](https://pantheon.corp.google.com/apigee/apps?mods=-monitoring_api_staging&project=datcom-apigee) and either find or create a key that is enabled for the product `datacommons-nl-api-internal`. You may also need to create a developer and app for yourself to associate the key with; see the [Apigee docs](https://cloud.google.com/apigee/docs/api-platform/security/api-keys) for guidance.
