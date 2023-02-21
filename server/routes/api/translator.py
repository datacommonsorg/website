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
from flask import request

from server.services import datacommons as dc

# Define blueprint
bp = Blueprint("misc", __name__)


@bp.route('/api/translate', methods=['POST'])
def translate():
  sparql = request.json['sparql']
  mapping = request.json['mapping']
  return dc.translate(sparql, mapping)
