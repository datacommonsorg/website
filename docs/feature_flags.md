# Feature Flags in Data Commons

Feature flags allow us to rapidly deploy flag-gated changes per environment, outside of the typical build schedule. 

## Deployment
This script automates the deployment of feature flags from `master` to a Google Cloud Storage (GCS) bucket and optionally restarts a Kubernetes deployment.

### Usage

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

## Adding a New Flag

1. **Add flag in flag configurations**: Check the flags in the Github master branch [`server/config/feature_flag_configs`](https://github.com/datacommonsorg/website/tree/master/server/config/feature_flag_configs). The flag must be added to all environments.
    * TIP: Use [this script](https://github.com/datacommonsorg/website/tree/master/scripts/create_feature_flag.sh) to add a new flag to each config file.
    > ```
    > ./scripts/create_feature_flag.sh <flag_name> <owner> <description>
    > ```
2. **Define flag in server layer**: Add your flag constant to [feature_flags.py](https://github.com/datacommonsorg/website/blob/master/server/lib/feature_flags.py#L19) helper file for use in the API layer.
3. **Define flag in client layer**: Add your flag constant to [feature_flags/util.ts](https://github.com/datacommonsorg/website/blob/master/static/js/shared/feature_flags/util.ts#L18) helper file for use in the client layer.
4. **Check flag value and implement your feature**
5. **Deploy & update GCS Flag files**: Once your code reaches production, you can enable your flags and run the script to update the GCS flag files.
6. **Restart Kubernetes**: The script to update the GCS flag files will prompt you to restart Kubernetes, on restart the new flags will be applied and your feature will be enabled.

## Manually enable feature flags

Feature flags can be enabled manually on any datacommons.org page using the `enable_feature` URL parameter.

For example, to enable the "autocomplete" feature:
 - Enable: https://datacommons.org/explore?enable_feature=autocomplete

To enable both the autocomplete and metadata_modal features:
 - Disable: https://datacommons.org/explore?enable_feature=autocomplete&enable_feature=metadata_modal
 
These URL overrides take precedence over the environment-specific feature flag settings defined in server/config/feature_flag_configs/<environment>.json
