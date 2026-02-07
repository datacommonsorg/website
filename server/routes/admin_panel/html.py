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
import os

from flask import Blueprint
from flask import redirect
from flask import render_template
from flask import Response
from flask import send_file
from flask import session
from flask import url_for
from google.cloud import storage
import server.lib.config as lib_config
from shared.lib.gcs import get_path_parts
from shared.lib.gcs import is_gcs_path

from .constants import BUCKET_BLOB_DOMAIN_LOGO_LOC
from .constants import INPUT_DIR
from .utils import require_login

bp = Blueprint('admin_panel', __name__, url_prefix='/admin')


@bp.route('/', methods=['GET'])
def index():
  cfg = lib_config.get_config()

  # If already logged in, redirect to dashboard
  if 'username' in session:
    return redirect(url_for('admin_panel.dashboard'))

  return render_template(f'{cfg.TEMPLATES_BASE_LOCATION}/login.html')


@bp.route('/dashboard')
@require_login
def dashboard():
  """Display dashboard with file management"""
  cfg = lib_config.get_config()

  # Clear upload messages only if they've been shown (flag indicates fresh load)
  return render_template(f'{cfg.TEMPLATES_BASE_LOCATION}/dashboard.html')


def _extract_logo_from_local():
  local_base_folder_loc = INPUT_DIR.rsplit('/', 1)[0]
  filepath = os.path.join(local_base_folder_loc, BUCKET_BLOB_DOMAIN_LOGO_LOC)
  if not os.path.exists(filepath):
    return Response(None, status=404)

  return send_file(filepath, as_attachment=True, download_name="logo.png")


@bp.route('/domain-logo', methods=['GET'])
def domain_logo():
  if not is_gcs_path(INPUT_DIR):
    return _extract_logo_from_local()

  client = storage.Client()

  bucket_name, _ = get_path_parts(INPUT_DIR)

  bucket = client.bucket(bucket_name)
  blob = bucket.get_blob(BUCKET_BLOB_DOMAIN_LOGO_LOC)

  if not blob:
    return _extract_logo_from_local()

  return blob.download_as_bytes()
