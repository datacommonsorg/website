# Copyright 2021 Google LLC
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
"""Protein browser related handlers."""

import json
import logging

from flask import Blueprint
from flask import escape
from flask import request
from flask import Response

from server.cache import cache
import server.services.datacommons as dc

BIO_DCID_PREFIX = 'bio/'
LOGGING_PREFIX_PPI = 'Protein browser PPI'

DEFAULT_INTERACTION_MEASUREMENT = 'IntactMiScore'
DEFAULT_INTERACTION_SCORE = -1

SUCCESS_CODE = 200
BAD_REQUEST_CODE = 400

bp = Blueprint('api.protein', __name__, url_prefix='/api/protein')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/<path:dcid>')
def get_node(dcid):
  """Returns data given a protein node."""
  return dc.bio(dcid)


def _log_ppi(message, caller=None):
  '''
    Given message and optionally the name of the function that called _log_ppi, record a log
    '''
  if caller is not None:
    logging.info(f'{LOGGING_PREFIX_PPI}: {caller} - {message}')
  else:
    logging.info(f'{LOGGING_PREFIX_PPI}: {message}')


def _id(id_or_dcid):
  '''
    Delete 'bio/' prefix from a biomedical DCID, if it is present.
    E.g. 'bio/P53_HUMAN' --> 'P53_HUMAN'
    '''
  if id_or_dcid.count(BIO_DCID_PREFIX) > 1:
    raise ValueError(
        f'{id_or_dcid} cannot contain multiple instances of "{BIO_DCID_PREFIX}"'
    )
  return id_or_dcid.replace(BIO_DCID_PREFIX, '')


def _dcid(id_or_dcid):
  '''
    Add 'bio/' prefix to an id if it does not already start with 'bio/'.
    E.g. 'P53_HUMAN' --> 'bio/P53_HUMAN'
    '''
  if id_or_dcid.startswith(BIO_DCID_PREFIX):
    return id_or_dcid
  return BIO_DCID_PREFIX + id_or_dcid


def _node(protein_id_or_dcid, depth):
  '''
    Returns node object.
    Protein dcids are of the form 'bio/{name}_{species}' (e.g. 'bio/P53_HUMAN')
    '''
  try:
    node_id = _id(protein_id_or_dcid)
    protein, species = node_id.split('_')
  # raise exception when node_id does not have exactly 1 '_'
  except ValueError as error:
    _log_ppi(f'Invalid protein identifier "{protein_id_or_dcid}"', '_node')
    raise error
  return {
      'id': node_id,
      'name': protein,
      'species': species,
      'depth': depth,
  }


def _extract_intactmi(score_dcids):
  '''
    Takes list of interaction score DCIDs and numerically parses and returns the first instance
    of an IntactMi score, or the default interaction score if none are found.
    TODO: add example
    '''
  for score_dcid in score_dcids:
    try:
      if score_dcid.startswith(DEFAULT_INTERACTION_MEASUREMENT):
        return float(score_dcid.replace(DEFAULT_INTERACTION_MEASUREMENT, ""))
    except:
      _log_ppi(f'Malformatted {DEFAULT_INTERACTION_MEASUREMENT} {score_dcid}',
               '_extract_intactmi')
      continue
  return DEFAULT_INTERACTION_SCORE


def _interactors(interaction_id_or_dcid):
  '''
    Parse and return ids of two interactors from interaction DCID of the form 'bio/{protein1 id}_{protein2 id}'
    E.g. 'bio/P53_HUMAN_CBP_HUMAN' --> 'P53_HUMAN', 'CBP_HUMAN'
    '''
  try:
    interaction_id = _id(interaction_id_or_dcid)
    protein1, species1, protein2, species2 = interaction_id.split('_')
  except ValueError as error:
    _log_ppi(f'Invalid protein identifier "{interaction_id_or_dcid}"',
             '_interactors')
    raise error
  return {
      'first_interactor': f'{protein1}_{species1}',
      'second_interactor': f'{protein2}_{species2}'
  }


def _other_interactor(interaction_dcid, interactor_id):
  '''
    Given interaction DCID and the id of one of the interactors, return the id of the other one.
    E.g. 'bio/P53_HUMAN_CBP_HUMAN', 'P53_HUMAN' --> 'CBP_HUMAN'
    '''
  interaction_id = _id(interaction_dcid)
  interactor_id1, interactor_id2 = _interactors(interaction_id).values()
  if interactor_id1 == interactor_id:
    return interactor_id2
  elif interactor_id2 == interactor_id:
    return interactor_id1
  raise ValueError(f'{interactor_id} not in {interaction_dcid}')


def _reverse_interaction_id(interaction_id):
  '''
    Given interaction ID of the form '{protein1 id}_{protein2 id}', return '{protein2 id}_{protein1 id}'.
    E.g. 'P53_HUMAN_CBP_HUMAN' --> 'CBP_HUMAN_P53_HUMAN'
    '''
  interactors = _interactors(interaction_id)
  return f'{interactors["second_interactor"]}_{interactors["first_interactor"]}'


def _reverse_interaction_dcid(interaction_dcid):
  '''
    Given interaction DCID of the form 'bio/{protein1 id}_{protein2 id}', return 'bio/{protein2 id}_{protein1 id}'.
    E.g. 'bio/P53_HUMAN_CBP_HUMAN' --> 'bio/CBP_HUMAN_P53_HUMAN'
    '''
  return _dcid(_reverse_interaction_id(_id(interaction_dcid)))


def _filter_interaction_dcids(interaction_dcids):
  '''
    Given list of interaction DCIDs, remove self-interactions and deduplicate (keep one copy of each set of duplicates).
    Self-interactions are interactions DCIDs of the form 'bio/{protein id}_{protein id}' (e.g. 'bio/P53_HUMAN_P53_HUMAN')
    Duplicates include both exact duplicates and reverse duplicates.
    E.g. 'bio/P53_HUMAN_CBP_HUMAN' is duplicate with both itself and 'bio/CBP_HUMAN_P53_HUMAN'.
    '''
  dcid_set = set()
  uniques = []
  for interaction_dcid in interaction_dcids:
    try:
      protein_id1, protein_id2 = _interactors(interaction_dcid).values()
      reverse_dcid = _reverse_interaction_dcid(interaction_dcid)
    # skip malformatted ids
    except ValueError:
      continue
    # filter out self-interactions
    if protein_id1 == protein_id2:
      continue
    if interaction_dcid not in dcid_set:
      uniques.append(interaction_dcid)
      dcid_set.update([interaction_dcid, reverse_dcid])
  return uniques


def _symmetrized_scores(scores):
  '''
    Given a dict mapping interaction IDs to scores, return a new dict D of the same type such that
    1) For any interaction ID in D, its reversal is also a key of D
    2) Any interaction ID in D maps to the same value as its reversal
    3) If an interaction ID is in scores but its reversal is not, D[interaction ID] = scores[interaction ID]
    4) If both an interaction ID F and its reversal R are in scores, D[F] = D[R] = max(scores[F], scores[R])
    '''
  scores_sym = {}
  for interaction_id, score in scores.items():
    try:
      reverse_id = _reverse_interaction_id(interaction_id)
    # skip malformatted ids
    except ValueError:
      continue
    reverse_score = scores.get(reverse_id, DEFAULT_INTERACTION_SCORE)
    scores_sym[interaction_id] = scores_sym[reverse_id] = max(
        score, reverse_score)
  return scores_sym


def _flatten(nested_list):
  '''
    Given a list of lists, return a depth-1 flattened version
    '''
  flat = []
  for L in nested_list:
    flat.extend(L)
  return flat


def _partition_expansion_cross(target_ids, node_set):
  '''
    Return two lists expansion_targets, cross_targets such that
    1) expansion_targets U cross_targets = target_ids
    2) expansion_targets and cross_targets are disjoint
    3) all elements of cross_targets are in node_set
    4) (implied) no elements of expansion_targets are in node_set
    5) Stability: If id1 appears before id2 in target_ids and they are both assigned to the same
       partition (either expansion_targets or cross_targets), id1 appears before id2 in this partition too.
    '''
  expansion_targets = []
  cross_targets = []
  for target_id in target_ids:
    if target_id in node_set:
      cross_targets.append(target_id)
    else:
      expansion_targets.append(target_id)
  return {
      'expansion_targets': expansion_targets,
      'cross_targets': cross_targets
  }


@bp.route('/protein-protein-interaction/', methods=['POST'])
def protein_protein_interaction():
  '''
    Retrieves graph data for protein-protein interaction graph via degree-bounded BFS

    Request params:
    - proteinDcid: the DCID of the page protein (e.g. 'bio/P53_HUMAN')
    - scoreThreshold: interaction score threshold above which to display an edge between two interacting proteins
    - numInteractors: we take {numInteractors} top-scoring expansion links of each node during BFS
    - depth: the maximum distance of any returned node from the center protein

    Returns: A dict of form
    {
        'nodeDataNested': [[...depth 0 node dicts], [...depth 1 node dicts], ...]
        'linkDataNested': [[...depth 0 link dicts], [...depth 1 link dicts], ...]
    }
    The only depth 0 node is the center protein and since we do not support self-interactions at the moment,
    there are no depth-0 links, so for depth m, the above can be simplified to
    {
        'nodeDataNested': [[<center protein>], [...depth 1 nodes], ..., [...depth m nodes]]
        'linkDataNested': [[], [...depth 1 links], ..., [...depth m links]]
    }.

    Each node dict has form
    {
        'id': id of form '{name}_{species}', e.g. 'P53_HUMAN',
        'name': name, e.g. 'P53',
        'species': species, e.g. 'HUMAN',
        'depth': currently the zero-indexed iteration of breadth-bounded BFS protein was added
        TODO: update depth so that it equals the distance of protein to center
        (Note the two are the same when numInteractors = infinity)
    }

    Each link dict has form
    {
        'source': id of source protein,
        'target': id of target protein,
        'score': IntactMi score of interaction
    }

    TODO: example
    '''

  try:
    # escape inputted id to avoid introducing XSS vulnerability
    center_protein_dcid = escape(request.json['proteinDcid'])
    score_threshold = request.json['scoreThreshold']
    max_interactors = request.json['maxInteractors']
    max_depth = request.json['maxDepth']

    if not isinstance(center_protein_dcid, str):
      raise TypeError("proteinDcid must be a string")
    if not (isinstance(score_threshold, int) or
            isinstance(score_threshold, float)):
      raise TypeError('scoreThreshold must be a number')
    if not isinstance(max_interactors, int):
      raise TypeError("maxInteractors must be an integer")
    if not isinstance(max_depth, int):
      raise TypeError("maxDepth must be an integer")

  except KeyError as key_error:
    return f'Missing request parameter {key_error.args[0]}', BAD_REQUEST_CODE

  except TypeError as type_error:
    return f'Incorrect request parameter type: {type_error.args[0]}', BAD_REQUEST_CODE

  try:
    center_protein_node = _node(center_protein_dcid, 0)
  except ValueError:
    return 'Invalid proteinDcid', BAD_REQUEST_CODE

  # interaction dcid --> IntactMi score of interaction
  scores = {}
  # set of interaction DCIDs for all links in the graph and their reversals
  interaction_dcid_set = set()
  # set of node ids for all nodes in the graph
  node_id_set = set([center_protein_node['id']])

  # to become final nested list of returned node dicts
  nodes = [[center_protein_node]]
  # to become final nested list of returned link dicts
  links = [[]]

  # used to request the next layer of interactors
  last_layer_node_dcids = [center_protein_dcid]
  # each iteration k retrieves the nodes and interactions at depth k
  # the last iteration is solely for finding the cross-links of the last layer
  for depth in range(1, max_depth + 2):
    # retrieve interactor dict of form {'bio/P53_HUMAN': ['bio/CBP_HUMAN', ...], 'bio/FGFR1_HUMAN': [...], ...}
    layer_interactors = dc.property_values(last_layer_node_dcids,
                                           "interactingProtein", False)
    # retrieve score dict of form {'bio/P53_HUMAN_CBP_HUMAN': ['IntactMiScore0.97', 'AuthorScore3.0'], ...}
    layer_score_lists = dc.property_values(_flatten(layer_interactors.values()),
                                           "confidenceScore")

    # convert score dict to form {'P53_HUMAN_CBP_HUMAN': 0.97} (keep only IntactMi scores)
    layer_scores = {}
    for interaction_dcid, score_list in layer_score_lists.items():
      try:
        interaction_id = _id(interaction_dcid)
      except ValueError:
        continue
      layer_scores[interaction_id] = _extract_intactmi(score_list)
    layer_scores = _symmetrized_scores(layer_scores)
    scores.update(layer_scores)
    # used to request the next layer of interactors
    last_layer_node_dcids = []
    # links from a protein in the graph to some new protein outside the graph
    expansion_links = []
    # ids of new proteins not currently in graph
    new_node_ids = set()

    for source_dcid, interaction_dcids in layer_interactors.items():
      interaction_dcids_new = filter(
          lambda interaction_dcid: interaction_dcid not in interaction_dcid_set,
          interaction_dcids)
      interaction_dcids_filtered = _filter_interaction_dcids(
          interaction_dcids_new)
      # add both interaction dcids and their reversals
      interaction_dcid_set.update(interaction_dcids_filtered)
      interaction_dcid_set.update(
          map(_reverse_interaction_dcid, interaction_dcids_filtered))

      try:
        source_id = _id(source_dcid)
      except ValueError:
        continue

      target_ids = []
      for interaction_dcid in interaction_dcids_filtered:
        try:
          target_id = _other_interactor(interaction_dcid, source_id)
        except ValueError:
          continue
        target_ids.append(target_id)
      # getter for score of source-target interaction
      target_scorer = lambda target_id: scores.get(f'{source_id}_{target_id}',
                                                   DEFAULT_INTERACTION_SCORE)
      # true if score-target interaction has score above threshold
      target_ids_filtered = filter(
          lambda target_id: target_scorer(target_id) >= score_threshold,
          target_ids)
      # sort in descending order of score
      target_ids_sorted = sorted(target_ids_filtered,
                                 key=target_scorer,
                                 reverse=True)
      partition = _partition_expansion_cross(target_ids_sorted, node_id_set)
      expansion_target_ids = partition['expansion_targets']
      cross_target_ids = partition['cross_targets']
      expansion_target_ids = expansion_target_ids[:max_interactors]
      target_link_getter = lambda target_id: {
          'source': source_id,
          'target': target_id,
          'score': target_scorer(target_id)
      }
      # add cross links to links in last layer
      # (E.g. depth 1 graph will show center, neighbors of center, and cross-links between neighbors)
      links[-1].extend(map(target_link_getter, cross_target_ids))
      # TODO: track distance of each node to center
      new_node_ids.update(expansion_target_ids)

      # final iteration expansion links are extra, shouldn't get rendered
      if depth != max_depth + 1:
        expansion_links.extend(map(target_link_getter, expansion_target_ids))
        last_layer_node_dcids.extend(map(_dcid, expansion_target_ids))

    if depth != max_depth + 1:
      new_nodes = []
      for new_node_id in new_node_ids:
        try:
          new_node = _node(new_node_id, depth)
        except ValueError:
          continue
        new_nodes.append(new_node)
      nodes.append(new_nodes)
      node_id_set.update(new_node_ids)
      links.append(expansion_links)

  graph = {'nodeDataNested': nodes, 'linkDataNested': links}

  return Response(json.dumps(graph)), SUCCESS_CODE
