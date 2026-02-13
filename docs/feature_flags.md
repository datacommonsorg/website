# Feature Flags in Data Commons

Feature flags allow us to rapidly deploy flag-gated changes per environment, outside of the typical build schedule.

## Deployment

This script automates the deployment of feature flags from `master` to a Google Cloud Storage (GCS) bucket and optionally restarts a Kubernetes deployment.

The Cloud Build trigger, [update-feature-flags](https://pantheon.corp.google.com/cloud-build/triggers?e=13803378&mods=-monitoring_api_staging&project=datcom-ci&pageState=(%22triggers%22:(%22f%22:%22%255B%257B_22k_22_3A_22_22_2C_22t_22_3A10_2C_22v_22_3A_22_5C_22update-feature-flags_5C_22_22%257D%255D%22))):
*  Checks for changes to the feature flag files when pushing to main.
*  Invokes [cloudbuild.update_feature_flags.yaml](https://github.com/datacommonsorg/website/blob/master/build/ci/cloudbuild.update_feature_flags.yaml), which calls [scripts/update_gcs_feature_flags.sh](https://github.com/datacommonsorg/website/blob/master/scripts/update_gcs_feature_flags.sh) for the appropriate environments.

### Manual Usage

Note: this script is automatically executed by the Cloud Build job update-feature-flags on PR merge into main. This script should only be manually executed in one-off, rare circumstances.

```bash
./scripts/update_gcs_feature_flags.sh <environment>
```

Where `<environment>` is one of:

* `dev`
* `staging`
* `production`
* `autopush`

### Environment Variables

* `GOOGLE_APPLICATION_CREDENTIALS`: The path to your Google Cloud credentials file.

### How it Works

1. **Validate the environment:** The script checks if the provided environment is one of the valid options (`dev`, `staging`, `production`, or `autopush`).
2. **Construct the filename:** The filename is created using the provided environment (e.g., `dev.json`, `staging.json`).
3. **Find the Python command:** The script searches for the Python interpreter (`python3` or `python`).
4. **Validate the JSON file:** It uses the Python `json.tool` module to check if the JSON file is valid.
5. **Construct the bucket name:** The bucket name is formed using the environment, with "datcom-website-" as a prefix and "prod-resources" for production.
6. **Confirm for production:** If deploying to production, it asks for confirmation from the user.
7. **Fetch staging flags (production only):** If deploying to production, it fetches the feature flags from the staging bucket (`datcom-website-staging-resources/feature_flags.json`).
8. **Compare staging and production flags (production only):** If deploying to production, it compares the staging and production flags and exits if there are differences.
9. **Upload the JSON file to GCS:** It uses the `gsutil` command to upload the JSON file to the appropriate GCS bucket.
10. **Prompt for Kubernetes restart:** It asks the user if they want to restart the Kubernetes deployment.
11. **Restart the Kubernetes deployment (optional):** If the user confirms, it uses `gcloud` commands to restart the Kubernetes deployment.

### GCS Buckets

The feature_flags.json file is uploaded to the following GCS buckets:
* Autopush: [datcom-website-autopush-resources](https://pantheon.corp.google.com/storage/browser/datcom-website-autopush-resources;tab=objects?e=13803378&mods=-monitoring_api_staging&project=datcom-ci)
* Dev: [datcom-website-dev-resources](https://pantheon.corp.google.com/storage/browser/datcom-website-dev-resources;tab=objects?e=13803378&mods=-monitoring_api_staging&project=datcom-ci)
* Staging: [datcom-website-staging-resources](https://pantheon.corp.google.com/storage/browser/datcom-website-staging-resources;tab=objects?e=13803378&mods=-monitoring_api_staging&project=datcom-ci&prefix=&forceOnObjectsSortingFiltering=false)
* Production: [datcom-website-prod-resources](https://pantheon.corp.google.com/storage/browser/datcom-website-prod-resources;tab=objects?e=13803378&mods=-monitoring_api_staging&project=datcom-ci&prefix=&forceOnObjectsSortingFiltering=false)

### Checked in Flag Files

This script uploads the feature flag configuration files from the Github master branch, into the following GCS Buckets above. You can find the flag configs in [`server/config/feature_flag_configs`](https://github.com/datacommonsorg/website/tree/9ed3b4aa8639056a410befcb0df1bc2373f33807/server/config/feature_flag_configs).


### Important Notes

* This script assumes you have the Google Cloud SDK installed and configured.
* The script expects a JSON file named `dev.json`, `staging.json`, or `production.json` in the current directory.
* The script can be modified to upload different files or perform additional actions after the deployment.
* The script skips the production.json file. Updates to these files cause immediate restarts to the Kubernetes pods. Production changes should be done separately.

## Adding a New Flag

1. **Add flag to configs**: Use [this script](https://github.com/datacommonsorg/website/tree/master/scripts/create_feature_flag.sh) to add a new flag to the config files. The flag will be added to all environments except production so that prod isn't redeployed more than necessary.
    > ```bash
    > ./scripts/create_feature_flag.sh
    > ```
    * **Submit a PR with just this change** before moving to the next step so that the rest is rollback safe.
2. **Define flag in server layer**: Add your flag constant to [feature_flags.py](https://github.com/datacommonsorg/website/blob/master/server/lib/feature_flags.py#L19) helper file for use in the API layer.
3. **Define flag in client layer**: Add your flag constant to [feature_flags/util.ts](https://github.com/datacommonsorg/website/blob/master/static/js/shared/feature_flags/util.ts#L18) helper file for use in the client layer.
4. **Check flag value and implement your feature**
    * [server layer example](https://github.com/datacommonsorg/website/blob/53ea3aa41e8478526bb2052b1738d7146f180d2f/server/routes/shared_api/autocomplete/autocomplete.py#L62)
    * [client layer example](https://github.com/datacommonsorg/website/blob/53ea3aa41e8478526bb2052b1738d7146f180d2f/static/js/apps/visualization/main.ts#L35)
5. **Deploy & update GCS Flag files**: Once your code reaches production, you can enable your flags and run the script to update the GCS flag files.
6. **Restart Kubernetes**: The script to update the GCS flag files will prompt you to restart Kubernetes, on restart the new flags will be applied and your feature will be enabled.

## Manually enable or disable feature flags

> [!NOTE]
> Manually enabling or disabling currently only works for client side code. On the server side, you'll need to
> propagate the feature flag in request arguments.

Feature flags can be enabled manually on any datacommons.org page using the `enable_feature` URL parameter.

For example, to enable the "autocomplete" feature:

* Enable: https://datacommons.org/explore?enable_feature=autocomplete

To enable both the autocomplete and page_overview_ga features:

* Enable: https://datacommons.org/explore?enable_feature=autocomplete&enable_feature=page_overview_ga

To manually disable a feature flag, use the `disable_feature` URL parameter.

For example, to disable the "autocomplete" feature:

* Disable: https://datacommons.org/explore?disable_feature=autocomplete

These URL overrides take precedence over the environment-specific feature flag settings defined in server/config/feature_flag_configs/<environment>.json

### Propagating Feature Flags

This override can be utilized to propagate the feature flags into future pages.

For example, the following anchor element would maintain the "autocomplete" feature enabled:

`<a href="https://datacommons.org/explore?enable_feature=autocomplete">Autocomplete Still Enabled<a/>`
