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

import os
import subprocess
import time

from flask import Blueprint
from flask import current_app
from flask import jsonify
from flask import render_template
from flask import request

bp = Blueprint('admin', __name__, url_prefix='/admin')


@bp.route('/load-data', methods=['POST'])
def load_data():
  secret = current_app.config['ADMIN_SECRET']
  request_secret = request.form.get('secret')
  if secret and request_secret != secret:
    return 'Invalid secret', 401
  sql_data_path = None
  if request.is_json:
    sql_data_path = request.json.get("sqlDataPath")
  if not sql_data_path:
    sql_data_path = os.environ.get("SQL_DATA_PATH")

  if not sql_data_path:
    return jsonify({
        "status": "error",
        "message": "sql_data_path is not set"
    }), 500

  # TODO: dynamically create the output dir.
  output_dir = os.path.join(sql_data_path, 'data')
  nl_dir = os.path.join(output_dir, "nl")
  sentences_path = os.path.join(nl_dir, "sentences.csv")
  # TODO: Enable NL for GCS paths once we add support for it.
  load_nl = not sql_data_path.lower().startswith("gs://")

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
      "python",
      "build_custom_dc_embeddings.py",
      "--sv_sentences_csv_path",
      f"{sentences_path}",
      "--output_dir",
      f"{nl_dir}",
  ]
  command3 = [
      "curl",
      "-X",
      "POST",
      "localhost:8081/import",
      "-d",
      f'{{"data_path": "{output_dir}"}}',
  ]
  command4 = [
      "curl",
      "localhost:6060/api/load/",
  ]
  output = []
  for command, stage, cwd, execute in [
      (command1, "import_data", "import/simple", True),
      (command2, "create_embeddings", "tools/nl/embeddings", load_nl),
      (command3, "load_data", ".", True),
      (command4, "load_embeddings", ".", load_nl)
  ]:
    start = time.time()

    def _duration():
      return round(time.time() - start, 2)

    try:
      if not execute:
        output.append({
            "stage": stage,
            "status": "not_run",
            "durationSeconds": 0,
            "stdout": "Stage was not run."
        })
        continue

      result = subprocess.run(command,
                              capture_output=True,
                              text=True,
                              check=True,
                              cwd=cwd)
      output.append({
          "stage": stage,
          "status": "success",
          "durationSeconds": _duration(),
          "stdout": result.stdout.strip().splitlines()
      })
    except subprocess.CalledProcessError as cpe:
      return jsonify({
          "stage": stage,
          "status": "failure",
          "durationSeconds": _duration(),
          "error": cpe.stderr.strip().splitlines()
      }), 500
    except Exception as e:
      return jsonify({
          "stage": stage,
          "status": "error",
          "durationSeconds": _duration(),
          "message": str(e)
      }), 500
  return jsonify(output), 200


@bp.route('/')
def page():
  return render_template('/admin/portal.html')
