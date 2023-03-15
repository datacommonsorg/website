# Data Commons Website set up

First, welcome to Datacommons. This is the first of two steps that needs to be done
in order to have a running instance of the customized Datacommons web application.

This step will do the following.

- Enable required APIS on GCP.
- Register a new url for the website.
- Allocate an IP address for the website.
- Configure DNS information.
- Create a robot service account to be used for running the web application.

## Steps

### 1. Change the value of project_id and contact_email in variables.tfvars

1. GCP project id where the Data Commons web application will be located.
2. A working email that can be used to verify the new domain to be created.

### 2. Run the following command from this directory

```sh
terraform init && terraform apply --var-file="variables.tf" -auto-approve
```

Please email custom-datacommons-support@google.com if you see any errors.

### 3. Click on the activation link that is sent to the contact email

### 4. Please send an email to custom-datacommons-support@google.com using the following template

```text
replace <project_id> with your GCP project id.

Subject: [Custom Datacommons setup] <project_id> requires data access.

Message:

We are setting up a new custom Datacommons instance and would like to access
the base layer of BT and BQ cache.
```
