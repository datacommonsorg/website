# Delete Cron Outputs

The Cron Testing Jobs that run in GKE save outputs to GCS every 4 hours (in case we need to look at the outputs to debug something) and run everyday. This is a tool to delete old outputs (older than 30 days) from the following folders to keep them at a manageable size:

- gs://datcom-website-periodic-testing
- gs://datcom-website-screenshot/autopush.datacommons.org/

To run:
```bash
./run.sh
```