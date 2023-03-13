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
"""Disease browser related handlers."""

from dataclasses import dataclass
import json
from json import JSONEncoder

import flask
from flask import Response

from server.cache import cache
import server.services.datacommons as dc

bp = flask.Blueprint('api.disease', __name__, url_prefix='/api/disease')

# disease of final parent
FINAL_PARENT_DISEASE_DCID = "bio/DOID_4"


# class which defines an object storing parent dcid and name
@dataclass
class DiseaseParent:
  dcid: str
  name: str


# subclass JSONEncoder
class DiseaseParentEncoder(JSONEncoder):

  def default(self, o):
    return o.__dict__


# Cache for one day.
@cache.memoize(timeout=3600 * 24)
@bp.route('/<path:dcid>')
def get_node(dcid):
  """Returns data given a disease node."""
  return dc.bio(dcid)


@bp.route('/diseaseParent/<path:dcid>')
def get_disease_parents(dcid):
  """Returns a list of parent nodes for a given disease node."""
  # list to store parent node
  list_parent = []
  curr_dcid = dcid
  # dcid of the biggest parent node where iteration stops
  while (curr_dcid != FINAL_PARENT_DISEASE_DCID):
    node_dcids = dc.property_values([curr_dcid],
                                            "specializationOf").get(
                                                curr_dcid, [])
    if not node_dcids:
      break
    node_dcid = node_dcids[0]
    node_names = dc.property_values([node_dcid],
                                            "name").get(node_dcid, [])
    node_name = node_dcid
    if node_names:
      node_name = node_names[0]
    list_parent.append(DiseaseParent(node_dcid, node_name))
    curr_dcid = node_dcid
  # return a list of dcid and name lists
  return Response(json.dumps(list_parent, cls=DiseaseParentEncoder),
                  200,
                  mimetype='application/json')

