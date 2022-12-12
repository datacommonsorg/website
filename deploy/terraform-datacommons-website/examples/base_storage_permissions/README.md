# Datacommons storage permission setup

This script exists to allow custom DC instances to access base BT/BQ and is meant
to be run by the owners of the DC storage project.

## Steps

Run the following script and make sure to replace the custom DC robot SA email.

```sh
export ROBOT_EMAIL=<custom DC robot sa email>
terraform init && terraform apply -var="custom_dc_web_robot_email=$ROBOT_EMAIL" -auto-approve
```
