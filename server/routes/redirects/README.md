The `redirects.json` file in this directory is stored in a GCS bucket and
read by the Flask server on server start. A rollout/restart is required
for these changes to be read and take effect in production.

Redirects can be used at datacommons.org/link/<REDIRECT-NAME>

Make changes to this file **very carefully**, and then copy it over as:

```bash
gcloud storage cp redirects.json gs://datcom-website-config/
```
