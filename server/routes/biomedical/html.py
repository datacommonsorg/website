# Copyright 2024 Google LLC
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
"""Biomedical Data Commons main routes"""

import json
import os

import flask
from flask import Blueprint
from flask import current_app
from flask import render_template

bp = Blueprint('biomedical', __name__)

_PAGE_CONFIG_FILE = "config/biomedical_landing_page/display_items.json"


def get_page_config() -> dict:
  """Load JSON config of page content"""
  path = os.path.join(current_app.root_path, _PAGE_CONFIG_FILE)
  with open(path) as f:
    return json.load(f)


@bp.route('/')
def main():
  config_data = get_page_config()
  return render_template('/biomedical/landing.html', config_data=config_data)
