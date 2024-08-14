# Custom Data Commons Terraform Deployment

## Overview

Deploying your own Custom Data Commons instance on Google Cloud Platform (GCP) lets you to host and manage your own data while leveraging the [Google Data Commons](https://datacommons.org/) repository of over 260K statistical variables. This deployment is managed using Terraform, which automates the provisioning of infrastructure and services on GCP.

## Features

* Supports multiple Data Commons instances in the same GCP account
* Creates Data Commons Website service container in Cloud Run
* Creates Data Commons Data task container in Cloud Run
* Enables all required Google Cloud APIs
* Creates Redis instance (optional)
* Creates MySQL instance


* Creates new service account with minimum required permissions
* Automatically provisions required Data Commons API key. Stores key in GCP secrets container.
* Automatically provisions required Data Commons API key. Stores key in GCP secrets container.
* Generates random MySQL password and stores in GCP secrets container.

## Architecture

![Custom Data Commons Architecture](https://docs.datacommons.org/assets/images/custom_dc/customdc_setup3.png)


## Pre-requisites

- **A [Google Cloud Project](https://cloud.google.com)**: You must have a GCP project where the custom Data Commons instance will be deployed.
- **[gcloud](https://cloud.google.com/sdk/docs/install)**: Ensure gcloud is installed on your local machine for the initial environment setup.
- **[Terraform](https://developer.hashicorp.com/terraform/install)**: Ensure Terraform is installed on your local machine to manage the infrastructure as code.

## Deployment Configuration Variables

Deployment configuration variable definitions are located in the `variables.tf` file. You can copy `terraform.tfvars.sample` to `terraform.tfvars` and fill in the required values, allowing Terraform to automatically use these settings. Alternatively, you can enter the required variables interactively when running `terraform apply`.

## Required Variables

- **project_id**: The Google Cloud project ID where the resources will be created.
- **namespace**: A unique namespace to differentiate multiple instances of custom Data Commons within the same project.

## Optional Configuration Variables

Optional variables are defined in `variables.tf`. Notable ones include:

- **region**: The GCP region where resources will be deployed. [View available regions](https://cloud.google.com/about/locations).
- **redis_enabled**: Set to false to disable redis caching for the website.
- **dc_web_service_image**: Docker image to use for the web service container. Default: `gcr.io/datcom-ci/datacommons-website-compose:latest`
- **dc_data_job_image**: Docker image to use for the data loading job. Default: `gcr.io/datcom-ci/datacommons-data:latest`
- **make_dc_web_service_public**: By default, the Data Commons web service is publicly accessible. Set this to `false` if your GCP account has restrictions on public access. [Reference](https://cloud.google.com/run/docs/authenticating/public).

## Deployment Instructions

To deploy a new Custom Data Commons instance to the GCP account `your-gcp-account`:

### 1. Navigate to the Deployment Directory

```bash
cd deploy/terraform-custom-datacommons/
```

### 2. Define GCP variables at `modules/variables.tfvars`

Create a `modules/variables.tfvars` using the sample file `modules/variables.tfvars.sample` as a starting point

```
cp modules/variables.tfvars.sample modules/variables.tfvars
```

Edit `modules/variables.tfvars` and fill in your own gcp [project_id](https://support.google.com/googleapi/answer/7014113?hl=en)
and user-defined `namespace`. The `namespace` can be any value, and is used to
support deploying multiple Data Commons environments to the same GCP project.

For example:

```
project_id  = "your-gcp-project"
namespace   = "dan-dev"
```

### 3. Run the Setup Script

Before running Terraform, you need to enable the necessary APIs in your Google Cloud project. 
Run the following setup script, replacing `your-gcp-project` with your actually gcp project id

```bash
./setup.sh your-gcp-project
```

This script will automatically enable the required APIs, including Compute Engine, Cloud SQL, Cloud Run, and others.

### 4. Initialize Terraform

Navigate to the terraform directory

```bash
cd terraform
```

Run the following command once to initialize Terraform. This command sets up the backend for Terraform, downloads required providers, and prepares the environment for deployment.

```bash
terraform init
```

### 5. Apply the Terraform Configuration

Apply the Terraform configuration to deploy your custom Data Commons instance:

```bash
terraform apply
```

Terraform will prompt you to confirm the actions before creating resources. Review the plan and type `yes` to proceed.

Once the deployment is complete, terraform should output something like:

```
cloud_run_service_name = "<namespace>-datacommons-web-service"
cloud_run_service_url = "https://<namespace>-datacommons-web-service-abc123-uc.a.run.app"
dc_api_key = <sensitive>
dc_gcs_data_bucket_path = "<namespace>-datacommons-data-<project-id>"
maps_api_key = <sensitive>
mysql_instance_connection_name = "<project-id>:us-central1:<namespace>-datacommons-mysql-instance"
mysql_instance_public_ip = "<mysql_ip>"
mysql_user_password = <sensitive>
redis_instance_host = "<redis_ip>"
redis_instance_port = 6379
```

### 6. Open Data Commons

Open your Custom Data Commons instance in the browser using the above
`cloud_run_service_url` (e.g, `https://my-namespace-datacommons-web-service-abc123-uc.a.run.app`),

### 7. Load custom data

Upload custom data to the GCS bucket specified by the terraform output `dc_gcs_data_bucket_path` (e.g., `gs://my-namespace-datacommons-data-my-project`).

Set the default project using gcloud


Add new datasets to `gs://my-namespace-datacommons-data-my-project/input`. From this repository's root directory, run:

```
# Replace DATA_BUCKET with your bucket path from dc_gcs_data_bucket_path above
export DATA_BUCKET=dan2-datacommons-data-dwnoble-datcom-dev-002
gsutil cp -r custom_dc/sample/* gs://$DATA_BUCKET/input/
```

Load custom data into data commons

```
export PROJECT_ID=your-project
export REGION=us-central1
gcloud run jobs execute dan2-datacommons-data-job --region=us-central1
```

### 8. Using Terraform Workspaces and Namespace

If you need to deploy multiple instances of Data Commons within the same GCP project, or across different projects, you can use Terraform workspaces and the `namespace` variable.

- **Workspaces**: Terraform workspaces allow you to manage multiple instances of your Terraform configuration in the same directory. To create a new workspace:

  ```bash
  terraform workspace new <workspace_name>
  ```

  Switch between workspaces using:

  ```bash
  terraform workspace select <workspace_name>
  ```

- **Namespace**: The `namespace` variable helps you to prefix resource names, ensuring they don't conflict when deploying multiple instances in the same GCP project. Set the `namespace` variable uniquely for each deployment.

### Example for Multiple Instances

To deploy multiple instances in the same project or across different projects:

1. **Different Projects**: Specify a different `project_id` for each deployment.
2. **Same Project**: Use different `namespace` values and Terraform workspaces to isolate the deployments.

```bash
terraform apply -var="namespace=instance1"
```

Repeat the above command with a different namespace to deploy another instance.

## Conclusion

By following these steps, you can deploy and manage custom instances of Data Commons on GCP using Terraform. This setup allows you to host your own data, integrate it with Google's public datasets, and run multiple instances within the same project or across different projects.

For more details on optional configurations, refer to the `variables.tf` file in the deployment directory.