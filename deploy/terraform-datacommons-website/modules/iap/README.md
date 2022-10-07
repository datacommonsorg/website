# IAP module.

This module provides the GCP resources related to setting up [IAP](https://cloud.google.com/iap). IAP restrict access to applications. IAP can be used to protect both internal facing and internal facing applications.

This module sets the IAP allowlist at the project level. This means that applications protected using the OAuth client created from this module will have the same allowlist, specified by the input web_user_members.

## Usage

```tf
module "dc_iap" {
  source                   =  "../../modules/iap"

  project_id               = "my-project-id"
  brand_support_email      = "my-brand-support-email"
  web_user_members         = [ "user1@domain", "user2@domain" ... ]
}
```

Note: Change the source path if the caller module is not from a particular example in the examples folder.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| brand\_support\_email | Who to contact for issues related to installed applications. | `string` | n/a | yes |
| web\_user\_members | A list of users allowlisted for applications controlled using IAP. | `List[string]` | `website-ksa` | no |
| project\_id | GCP project id where the DC applications will be running in.| `string` | n/a | yes |

