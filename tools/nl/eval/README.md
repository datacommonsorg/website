# Run NL Eval

## Produce eval golden data from Explore landing pages

```bash
export NODEJS_API_KEY=<api_key_for_bard.datacommons.org>
python3 fetch_explore_queries.py
```

This produces a csv file that can be imported to Google Sheet for further manual
curation to produce golden data for eval purpose.
