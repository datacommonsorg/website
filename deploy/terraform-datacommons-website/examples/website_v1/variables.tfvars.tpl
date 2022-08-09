# GCP project where the website should be installed.
# Type: string
project_id = 

# GCP project where the data is.
# To use the storage project owned by dc-core team, 
# please send an email to support@datacommons.org including
# the GCP project id specified in the tfvars file created 
# from this template.
# After the dc-core team approves access, specify "datcom-store".
# Type: string
storage_project_id = 

# Who to contact for issues related to installed applications.
# Type: string
brand_support_email = 

# A list of users to allow access to the DC website.
# Type: List[string]
# Format: Comma separated list of quoted strings, enclosed by []
web_user_members =

# GCP region where the cluster will be created in. 
# Type: string
region = 
