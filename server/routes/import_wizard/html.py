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
  sql_data_path = None
  if request.is_json:
    sql_data_path = request.json.get("sqlDataPath")
  if not sql_data_path:
    sql_data_path = os.environ.get("SQL_DATA_PATH")

  # TODO: dynamically create the output dir.
  output_dir = os.path.join(sql_data_path, 'data')

  command1 = [
      "python",
      "-m",
      "stats.main",
      "--input_path",
      f"{sql_data_path}",
      "--output_dir",
      f"{output_dir}",
  ]
  command2 = [
      "curl",
      "-X",
      "POST",
      "localhost:8081/import",
      "-d",
      f'{{"data_path": "{output_dir}"}}',
  ]
  output = []
  for command, cwd in [(command1, "import/simple"), (command2, ".")]:
    try:
      result = subprocess.run(command,
                              capture_output=True,
                              text=True,
                              check=True,
                              cwd=cwd)
      output.append({
          "status": "success",
          "stdout": result.stdout.strip().splitlines()
      })
    except subprocess.CalledProcessError as cpe:
      return jsonify({
          "status": "failure",
          "error": cpe.stderr.strip().splitlines()
      }), 500
    except Exception as e:
      return jsonify({"status": "error", "message": str(e)}), 500
  return jsonify(output), 200