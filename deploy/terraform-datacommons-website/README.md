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

3. Terraform stores the state of installation in a file. The examples in these modules use GCS to store the state file.

    Note: Examples in these modules assume that the backend bucket already exists. The backend bucket does not have to be in the same GCP project as the resources being installed. You can use the [mb](https://cloud.google.com/storage/docs/gsutil/commands/mb) command to create a new bucket.

    ```
    export PROJECT=<Terraform state project id>
    export BUCKET=<Terraform state bucket name>
    gsutil mb -p $PROJECT gs://$BUCKET
    ```

## Software Dependencies

### Terraform and Plugins

- [Terraform](https://www.terraform.io/downloads.html) 1.2.5
- [Terraform Provider for GCP](https://github.com/hashicorp/terraform-provider-google) v4.28
- [Terraform Provider for GCP Beta](https://github.com/hashicorp/terraform-provider-google-beta) v4.28

    Note: Terraform providers are implicit dependencies installed through `terraform init` call. They do not need to be installed explicitly.

### gcloud and gsutil

Please follow the [gcloud install doc](https://cloud.google.com/sdk/docs/install) and the [gsutil install doc](https://cloud.google.com/storage/docs/gsutil_install) to install both cli tools in the machine that is calling Terraform. Some modules may need to call gcloud/gsutil in the background.

## Notes

### null resources

There are several resources named "null_resource" throughout the examples and modules. A null_resource does not represent a GCP resource. Instead, it executes script as if the completion of the script is the "create" operation. It is a workaround for things to be automated for which no official Terraform resource exists.

Some operations should always be run, regardless of whether it has been run before(Ex: fetching the latest mixer proto). For such operations, use null_resource with the following trigger.

```text
triggers = {
  always_run = "${timestamp()}"
}
```