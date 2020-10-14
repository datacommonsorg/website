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

from flask import Blueprint, redirect, request, url_for

bp = Blueprint(
    "redirects",
    __name__,
)


@bp.route('/kg')
def kg():
    dcid = request.args.get('dcid', '')
    if dcid:
        url = url_for('browser.kg_entity', dcid=dcid)
    else:
        url = url_for('browser.kg_main')
    return redirect('https://datacommons.org' + url, code=302)


@bp.route('/gni')
def gni():
    return redirect(url_for('tools.timeline'), code=302)


@bp.route('/scatter')
def scatter():
    return redirect(url_for('tools.scatter'), code=302)


@bp.route('/documentation')
def documentation():
    return redirect('https://docs.datacommons.org/', code=302)


@bp.route('/colab')
def colab():
    return redirect('https://docs.datacommons.org/tutorials.html', code=302)


@bp.route('/getinvolved')
def get_involved():
    return redirect('https://docs.datacommons.org/contributing/', code=302)


# This is used to handle explore more link from Google search. Do not remove.
# arg params from search: mprop, dcid, popt
@bp.route('/explore/place')
def explore():
    return redirect('https://datacommons.org' +
                    url_for('place.place', dcid=request.args.get('dcid')),
                    code=302)
