## NL SVG Latency tester

A few tens of queries against the NodeJS NL server (`nodejs/query`) in series and tracks times.

Run it as:

```
./run_latencies.sh
```

## NL SVG Load tester

Runs specified number of queries against the NodeJS NL server (`nodejs/query`), running them specified number of queries at a time.

Run it as:

```
./run_load.sh --total_requests=<total queries to send> --parallel_requests=<number of queries to send at a time>
```