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
- For the apikey, you can go to the [Bard Apigee Console](https://pantheon.corp.google.com/apigee/apps?mods=-monitoring_api_staging&project=datcom-bard) and either:
  1. Use an existing key
  2. Create your own key by [creating an "API Product", "App", and "Developer"](https://cloud.google.com/apigee/docs/api-platform/security/api-keys).
