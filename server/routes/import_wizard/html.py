# Copyright 2022 Google LLC
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
"""Import Wizard routes"""

import os
import subprocess

from flask import Blueprint
from flask import jsonify
from flask import render_template
from flask import request

bp = Blueprint('import_wizard', __name__, url_prefix='/import')


@bp.route('/old')
def main():
  return render_template('/import_wizard.html')


@bp.route('/')
def main_new():
  return render_template('/import_wizard2.html')


# This is only used in CSV + SQL backend, converting raw CSV data into resolved
# CSV.
@bp.route('/simple/convert', methods=['POST'])
def convert():
  raw_data_path = request.json.get("rawDataPath") or os.environ.get(
      "RAW_DATA_PATH")
  sql_data_path = request.json.get("sqlDataPath") or os.environ.get(
      "SQL_DATA_PATH")
  command1 = [
      "python",
      "import/simple/stats/main.py",
      "--input_path",
      f"{raw_data_path}/input.csv",  # TODO: use gcs and local folder path.
      "--output_dir",
      f"{sql_data_path}",
  ]
  # TODO: save debug information in another folder
  command2 = ["rm", f"{sql_data_path}/debug_resolve.csv"]
  output = []
  for command in [command1, command2]:
    try:
      result = subprocess.run(command, capture_output=True, text=True)
      if result.returncode == 0:
        output.append({"status": "success", "output": result.stdout.strip()})
      else:
        return jsonify({
            "status": "failure",
            "error": result.stderr.strip()
        }), 500
    except Exception as e:
      return jsonify({"status": "error", "message": str(e)}), 500
  return jsonify(output), 200


# This is a proxy to trigger Mixer import for csv + SQL backend.
# This can only be used for bundled mixer and website in the same docker image.
@bp.route('/simple/load2sql', methods=['POST'])
def load2sql():
  command = [
      "curl",
      "-X",
      "POST",
      "localhost:8081/import",
  ]
  try:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode == 0:
      return jsonify({
          "status": "success",
          "output": result.stdout.strip()
      }), 200
    else:
      return jsonify({"status": "failure", "error": result.stderr.strip()}), 500
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)}), 500