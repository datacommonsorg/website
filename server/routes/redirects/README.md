The `redirects.json` file in this directory is stored in a GCS bucket and
read by the production Flask server on each redirection call (to achieve
immediate update without rollout/restart).

Redirects can be used at datacommons.org/link/<REDIRECT-NAME>

Make changes to this file **very carefully**, and then copy it over as:

```bash
gsutil cp redirects.json gs://datcom-website-config/
```
