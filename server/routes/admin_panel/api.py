# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
from datetime import datetime
import hmac
from io import BytesIO
import json
import logging
import os

from flask import Blueprint
from flask import request
from flask import session
from google.cloud import storage
import server.lib.config as lib_config
from shared.lib.gcs import get_path_parts
from shared.lib.gcs import is_gcs_path
from werkzeug.utils import secure_filename

from .constants import ADMIN_PANEL_PASSWORD
from .constants import ADMIN_PANEL_USERNAME
from .constants import BUCKET_BLOB_DOMAIN_CONFIG_LOC
from .constants import BUCKET_BLOB_DOMAIN_LOGO_LOC
from .constants import INPUT_DIR
from .utils import delete_file_from_storage
from .utils import require_login
from .utils import upload_file_to_storage
from .validate import validate_csv

bp = Blueprint('admin_panel_api', __name__, url_prefix='/admin/api')


def allowed_file(filename, extensions):
  """Check if file extension is allowed"""
  return '.' in filename and filename.rsplit('.', 1)[1].lower() in extensions


@bp.route('/login', methods=['POST'])
def login():
  # Prevention authorizing when credentials were not set.
  if not all([ADMIN_PANEL_USERNAME, ADMIN_PANEL_PASSWORD]):
    logging.warning('Admin credentials were not configured')

    return {
        'category': 'error',
        'message': 'Login failed. Please check your credentials.'
    }, 400

  username = request.form.get('username')
  password = request.form.get('password')

  # Validate credentials
  if username == ADMIN_PANEL_USERNAME and hmac.compare_digest(password, ADMIN_PANEL_PASSWORD):
    # Create permanent session with expiration
    session.permanent = True
    session['username'] = username
    session['login_time'] = datetime.now().isoformat()
    session['ip_address'] = request.remote_addr

    return {'category': 'success', 'message': 'OK'}, 200
  else:
    return {
        'category': 'error',
        'message': 'Login failed. Please check your credentials.'
    }, 400


@bp.route('/logout', methods=['POST'])
@require_login
def logout():
  """Logout user"""
  session.clear()
  return {'category': 'success', 'message': 'OK'}, 200


@bp.route('/upload', methods=['POST'])
@require_login
def upload_file():
  """Handle file upload"""
  cfg = lib_config.get_config()

  if 'file' not in request.files:
    return {'category': 'error', 'message': 'No file part in request'}, 400

  file = request.files['file']

  base_filename = filename = request.form.get('baseFilename')
  replace_file_mode = request.form.get('replaceFileMode', False)

  if not filename or not file.filename:
    return {'category': 'error', 'message': 'No file selected'}, 400

  if file and allowed_file(file.filename, cfg.ALLOWED_DATA_EXTENSIONS):
    # Add timestamp to filename to avoid conflicts and include original filename to the one
    # that will be uploaded to cloud storage
    if not replace_file_mode:
      timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
      filename = f'{timestamp}__{secure_filename(file.filename)}__{filename}'

    try:
      validation_result = validate_csv(file,
                                       cfg.CSV_SCHEMAS.get(base_filename, {}))
    except Exception as e:
      logging.error(f'Error during file validation {e!r}')
      return {
          'category': 'error',
          'message': 'Error during file validation',
      }, 400

    # Fail if any row has validation errors
    if not validation_result.is_valid:
      return {
          'category':
              'error',
          'message':
              f'File validation failed: {validation_result.invalid_rows_count} row(s) have errors',
          'validation_errors': [
              f"Row {row}, Column {col}: {msg}"
              for row, col, msg in validation_result.errors
          ],
          **validation_result.response_info
      }, 400

    # Reset file pointer after validation
    validation_result.valid_csv.seek(0)

    try:
      blob_location = f"{INPUT_DIR.rsplit('/', 1)[1]}/{filename}"
      if is_gcs_path(INPUT_DIR):
        _, blob_name = get_path_parts(INPUT_DIR)
        blob_location = f'{blob_name}/{filename}'

      upload_file_to_storage(INPUT_DIR, blob_location,
                             validation_result.valid_csv)

      return {
          'category': 'success',
          'message': f'File "{file.filename}" uploaded successfully!',
          **validation_result.response_info
      }, 200

    except Exception as e:
      logging.error(f'Error during uploading file {e!r}')
      return {
          'category': 'error',
          'message': 'Error during uploading file',
          **validation_result.response_info
      }, 400
  else:
    return {
        'category':
            'error',
        'message':
            f'File type not allowed. Allowed types: {", ".join(cfg.ALLOWED_DATA_EXTENSIONS)}'
    }, 400


@bp.route('/update-config', methods=['POST'])
@require_login
def update_config():
  cfg = lib_config.get_config()

  new_config = {}
  for k in cfg.DEFAULT_DOMAIN_CONFIG.keys():
    new_config[k] = request.form.get(k, cfg.DEFAULT_DOMAIN_CONFIG[k])

  new_config_file = BytesIO()
  new_config_file.write(json.dumps(new_config).encode())
  new_config_file.seek(0)

  # Main config upload
  message = "Domain config updated"
  try:
    upload_file_to_storage(INPUT_DIR, BUCKET_BLOB_DOMAIN_CONFIG_LOC,
                           new_config_file)
  except Exception as e:
    logging.error(f'Config uploading failed with {e!r}')
    return {'category': 'error', 'message': 'Config uploading failed'}, 400

  try:
    # Logo upload or deletion
    file = request.files.get('file')

    # If logoPresent is "false" and no new file uploaded, delete existing logo
    if new_config.get('logoPresent') == 'false' and not file:
      if delete_file_from_storage(INPUT_DIR, BUCKET_BLOB_DOMAIN_LOGO_LOC):
        message = "Domain config updated and logo removed"
    elif file and allowed_file(file.filename, cfg.ALLOWED_LOGO_EXTENSIONS):
      upload_file_to_storage(INPUT_DIR, BUCKET_BLOB_DOMAIN_LOGO_LOC, file)
      message = "Domain config and domain logo updated"
  except Exception as e:
    logging.error(f'Logo operation failed with {e!r}')
    return {'category': 'success', 'message': 'Logo operation failed'}, 400

  return {'category': 'success', 'message': message}, 200


@bp.route('/domain-config', methods=['GET'])
def domain_config():
  cfg = lib_config.get_config()

  if is_gcs_path(INPUT_DIR):
    client = storage.Client()

    bucket_name, _ = get_path_parts(INPUT_DIR)

    bucket = client.bucket(bucket_name)
    blob = bucket.get_blob(BUCKET_BLOB_DOMAIN_CONFIG_LOC)

    if not blob:
      return cfg.DEFAULT_DOMAIN_CONFIG

    return json.loads(blob.download_as_bytes())
  else:
    local_base_folder_loc = INPUT_DIR.rsplit('/', 1)[0]
    filepath = os.path.join(local_base_folder_loc,
                            BUCKET_BLOB_DOMAIN_CONFIG_LOC)

    if not os.path.exists(filepath):
      return cfg.DEFAULT_DOMAIN_CONFIG

    with open(filepath) as f:
      return json.load(f)
