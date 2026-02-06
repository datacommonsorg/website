from io import BytesIO
import os
from pathlib import Path

from flask import redirect
from flask import session
from flask import url_for
from google.cloud import storage
from shared.lib.gcs import get_path_parts
from shared.lib.gcs import is_gcs_path
from werkzeug.datastructures import FileStorage

from .constants import INPUT_DIR


def validate_session():
  """Validate session security (IP address consistency, session existence)"""
  if 'username' not in session:
    return False

  return True


def require_login(f):
  """Decorator to require login for protected routes"""
  from functools import wraps

  @wraps(f)
  def decorated_function(*args, **kwargs):
    if not validate_session():
      return redirect(url_for('admin_panel.index'))
    return f(*args, **kwargs)

  return decorated_function


def upload_file_to_storage(INPUT_DIR: str, blob_location,
                           file_content: BytesIO | FileStorage) -> None:
  if is_gcs_path(INPUT_DIR):
    # Store file in the cloud storage
    client = storage.Client()

    bucket_name, _ = get_path_parts(INPUT_DIR)

    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_location)

    blob.upload_from_file(file_content, content_type="application/octet-stream")
  else:
    # Store file in the local file system
    local_base_folder_loc = INPUT_DIR.rsplit('/', 1)[0]
    filepath = os.path.join(local_base_folder_loc, blob_location)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, 'wb+') as f:
      f.write(file_content.read())


def delete_file_from_storage(INPUT_DIR: str, blob_location: str) -> bool:
  """Delete a file from GCS or local storage. Returns True if deleted."""
  if is_gcs_path(INPUT_DIR):
    # Delete file from cloud storage
    client = storage.Client()

    bucket_name, _ = get_path_parts(INPUT_DIR)

    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_location)

    if blob.exists():
      blob.delete()
      return True
    return False
  else:
    # Delete file from local file system
    local_base_folder_loc = INPUT_DIR.rsplit('/', 1)[0]
    filepath = os.path.join(local_base_folder_loc, blob_location)

    if os.path.exists(filepath):
      os.remove(filepath)
      return True
    return False


def upload_db_configs(cfg):
  """ Function for uploading default configs """

  configs_location = Path(
      __file__).resolve().parent.parent.parent / f'config/custom_dc/{cfg.ENV}/'
  for cfg_file in os.listdir(configs_location):
    cfg_file_bytes = BytesIO()
    cfg_file_bytes.write(Path(configs_location / cfg_file).read_bytes())
    cfg_file_bytes.seek(0)

    blob_location = f"{INPUT_DIR.rsplit('/', 1)[1]}/{cfg_file}"

    if is_gcs_path(INPUT_DIR):
      _, blob_name = get_path_parts(INPUT_DIR)
      blob_location = f'{blob_name}/{cfg_file}'

    upload_file_to_storage(INPUT_DIR, blob_location, cfg_file_bytes)
