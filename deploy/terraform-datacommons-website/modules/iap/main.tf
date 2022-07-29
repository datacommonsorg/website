# This resource sets up the OAuth consent screen (This is required for IAP).
# As of google provider version 3.48.0: Only "Organization Internal" brands
#    can be created programatically via API. To convert it into an external
#    brands please use the GCP Console.
# Source: https://registry.terraform.io/providers/hashicorp/google/3.48.0/docs/resources/iap_brand
resource "google_iap_brand" "project_brand" {
  project           = var.project_id
  support_email     = var.brand_support_email
  application_title = "Data Commons website"
}

resource "google_iap_client" "project_client" {
  display_name =  "Data Commons OAuth client"
  brand        =  google_iap_brand.project_brand.name
}

resource "google_project_iam_member" "web_users" {
  project = var.project_id
  role    = "roles/iap.httpsResourceAccessor"

  for_each = toset(var.web_user_members)
  member   = format("user:%s", each.key)
}