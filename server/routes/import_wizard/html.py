# Copyright 2023 Google LLC
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
@bp.route('/simple/load', methods=['POST'])
def load():
  raw_data_path, sql_data_path = None, None
  if request.is_json:
    raw_data_path = request.json.get("rawDataPath")
    sql_data_path = request.json.get("sqlDataPath")
  if not raw_data_path:
    raw_data_path = os.environ.get("RAW_DATA_PATH")
  if not sql_data_path:
    sql_data_path = os.environ.get("SQL_DATA_PATH")

  command1 = [
      "python",
      "import/simple/stats/main.py",
      "--input_path",
      f"{raw_data_path}",
      "--output_dir",
      f"{sql_data_path}",
  ]
  command2 = [
      "curl",
      "-X",
      "POST",
      "localhost:8081/import",
  ]
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