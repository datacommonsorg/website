## NL Log Miner

Extracts query feedback information from the NL BT tables into a CSV file.

To run it:

```bash
./run.sh
```

This will produce an output CSV in `/tmp/nl_query_log.csv` (`--output_csv`)
with the last 5 (`--past_days`) days worth of logs.
