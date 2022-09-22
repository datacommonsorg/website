# Data Commons Website v1

This end to end example aims to show how to install a simple and opinionated setup of the [Data Commons website](https://www.datacommons.org/).

This setup has the following key features:

- A regional GKE instance using workload identity.
- An ingress to the website using global static ip.
- Optional [IAP](https://cloud.google.com/iap) control to limit website access.
- User specified GCP storge project.

# Setup

To deploy this example:

1. Copy and paste `variables.tfvars.tpl` into a new file `variables.tf`.

2. Follow the comments and fill out all values of `variables.tf`.

3. Run `BACKEND_BUCKET=your-backend-bucket && terraform init -backend-config="bucket=$BACKEND_BUCKET"`

Replace your-backend-bucket with the name of the GCS bucket where the Terraform state should be stored in. Do not add the "gs://" prefix.

4.  Run `terraform apply -var-file="variables.tfvars"`

This should return a prompt with a list of resources to be created/modified/deleted, enter "yes" to continue.
