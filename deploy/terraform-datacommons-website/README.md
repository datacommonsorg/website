# Terraform Data Commons module

This module handles the creation of Data Commons applications on Google Cloud Platform.

For more on Data Commons, visit https://datacommons.org/about.

# Compatibility

This module is tested on Terraform 1.2.5

# Requirements

Before this module can be used on a project, you must ensure that the following pre-requisites are fulfilled:

1. All [software dependencies](#software-dependencies) are installed on the machine where Terraform is executed.

2. Run `gcloud auth application-default login` to configure GCP credentials.

Note: Alternatively, [create a Service Account](https://cloud.google.com/docs/authentication/production#create_service_account) and export a Service Account key.

3. Terraform stores the state of installation in a file. The examples in these modules use GCS to store the state file. If a 

## Software Dependencies

### Terraform and Plugins

- [Terraform](https://www.terraform.io/downloads.html) 1.2.5
- [Terraform Provider for GCP](https://github.com/hashicorp/terraform-provider-google) v4.28
- [Terraform Provider for GCP Beta](https://github.com/hashicorp/terraform-provider-google-beta) v4.28

### gcloud and gsutil

Please follow the [gcloud install doc](https://cloud.google.com/sdk/docs/install) and the [gsutil install doc](https://cloud.google.com/storage/docs/gsutil_install) to install both cli tools in the machine that is calling Terraform. Some modules may need to call gcloud/gsutil in the background. 
