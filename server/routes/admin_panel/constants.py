# File upload configuration
import os
import re

INPUT_DIR = os.getenv('INPUT_DIR', '')

# Login credentials (constants)
ADMIN_PANEL_USERNAME = os.getenv('ADMIN_PANEL_USERNAME')
ADMIN_PANEL_PASSWORD = os.getenv('ADMIN_PANEL_PASSWORD')

# Folder in the bucket that is used for domain customization
# or any custom data.
BUCKET_BLOB_DOMAIN_CONFIG_LOC = 'common/configmap.json'
BUCKET_BLOB_DOMAIN_LOGO_LOC = 'common/logo.png'

# Supported data types
STRING = "string"
INTEGER = "integer"
FLOAT = "float"
NUMBER = "number"  # Integer or float
DATE_YEAR = "date_year"  # Year as integer (1900-2100)
OPTIONAL = False


def _is_number(v: str) -> bool:
  try:
    float(v)
    return True
  except ValueError:
    return False


# Type validators: return True if valid
TYPE_VALIDATORS = {
    STRING:
        lambda v: len(v) > 0,
    INTEGER:
        lambda v: bool(re.match(r'^-?\d+$', v)),
    NUMBER:
        lambda v: _is_number(v),
    DATE_YEAR:
        lambda v: bool(re.match(r'^-?\d+$', v)) and 1900 <= int(v) <= 2100,
}
