# Data Commons Website installation

This is the installation step for custom Datacommons web application. This step assumes that:

- the setup script under terraform-datacommons-website has been run.
- The email activation link for the newly registered domain has been clicked.
- custom-datacommons-support@google.com has replied back stating that data access is granted.

## Steps

1. Please fill in the fields in `variables.tfvars`.
2. PLease run the following commands.

```sh
git submodule foreach git pull origin master
git submodule update --init --recursive
```

3. Run the following script.

```sh
terraform init && terraform apply --var-file="variables.tfvars" -auto-approve
```
