# Place Page SEO Experiments

This folder holds manually written jinja templates used to rapidly iterate on
frontend changes to our place pages, to test which changes best improve our SEO.

The production website reads not from this folder, but from a copy of this
folder stored in GCS. If changes are made to this folder, the changes can be
synced to GCS using `./scripts/sync_seo_experiment_templates_to_gcs.sh` from
the root directory.

File structure:
```text
config/seo_experiments/
├─ html_templates/        <-- this folder gets sync'ed with GCS
│  ├─ active/             <-- templates actively being used for a live experiment
|  ├─ archive/            <-- templates from not currently active experiments
├─ README.md              <-- this README
```
