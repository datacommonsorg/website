# Copyright 2020 Google LLC
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

from flask import Blueprint
from flask import render_template


bp = Blueprint(
  "gni",
  __name__,
)


# TODO(shifucun/beets): Re-organize the path names
@bp.route('/gni')
def explore():
    return render_template('gni/explore.html')


@bp.route('/download')
def download():
    return render_template('gni/download.html')


@bp.route('/download2')
def download_bulk():
    return render_template('gni/download_bulk.html')


@bp.route('/scatter')
def scatter():
    return render_template('gni/scatter.html')
