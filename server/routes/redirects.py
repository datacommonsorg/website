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

"""Permanent redirects to support the website re-organization and merging of
browser.datacommons.org with datacommons.org
"""

from flask import Blueprint
from flask import redirect

bp = Blueprint(
  "redirects",
  __name__,
)


@bp.route('/gni')
def gni():
    return redirect('https://datacommons.org/tools/timeline', code=301)


@bp.route('/download')
def download():
    return redirect('https://datacommons.org/tools/download', code=301)


@bp.route('/bulk_download')
def download_bulk():
    return redirect('https://datacommons.org/tools/bulk_download', code=301)


@bp.route('/scatter')
def scatter():
    return redirect('https://datacommons.org/tools/scatter', code=301)
