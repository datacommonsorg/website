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

import flask

from cache import cache
import services.datacommons as dc_service

bp = flask.Blueprint('api.protein', __name__, url_prefix='/api/protein')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/<path:dcid>')
def get_node(dcid):
    """Returns data given a protein node."""
    response = dc_service.fetch_data('/internal/bio', {
        'dcid': dcid,
    },
                                     compress=False,
                                     post=False,
                                     has_payload=False)
    return response
<<<<<<< Updated upstream
=======


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
        center_protein_dcid = request.json['proteinDcid']
        score_threshold = request.json['scoreThreshold']
        max_interactors = request.json['maxInteractors']
        max_depth = request.json['maxDepth']
    except KeyError as key_error:
        raise BadRequest(f'Missing request parameter {key_error}')

    # interaction dcid --> IntactMi score of interaction
    scores = {}
    # set of interaction DCIDs for all links in the graph and their reversals
    interaction_dcid_set = set()
    # set of node ids for all nodes in the graph
    node_id_set = set([_id(center_protein_dcid)])

    center_protein_node = _node(center_protein_dcid, 0)
    center_protein_node['fx'] = 0
    center_protein_node['fy'] = 0

    # to become final nested list of returned node dicts
    nodes = [[center_protein_node]]
    # to become final nested list of returned link dicts
    links = [[]]

    # used to request the next layer of interactors
    last_layer_node_dcids = [center_protein_dcid]
    for depth in range(1, max_depth + 2):
        # retrieve interactor dict of form {'bio/P53_HUMAN': ['bio/CBP_HUMAN', ...], 'bio/FGFR1_HUMAN': [...], ...}
        layer_interactors = dc.property_values(last_layer_node_dcids,
                                               "interactingProtein", "in")
        # retrieve score dict of form {'bio/P53_HUMAN_CBP_HUMAN': ['IntactMiScore0.97', 'AuthorScore3.0'], ...}
        layer_scores = dc.property_values(_flatten(layer_interactors.values()),
                                          "confidenceScore", "out")
        # convert score dict to form {'bio/P53_HUMAN_CBP_HUMAN': 0.97} (keep only IntactMi scores)
        layer_scores = {
            _id(interaction_dcid): _extract_intactmi(score_list)
            for interaction_dcid, score_list in layer_scores.items()
        }
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
                lambda interaction_dcid: interaction_dcid not in
                interaction_dcid_set, interaction_dcids)
            interaction_dcids_filtered = _filter_interaction_dcids(
                interaction_dcids_new)
            # add both interaction dcids and their reversals
            interaction_dcid_set.update(interaction_dcids_filtered)
            interaction_dcid_set.update(
                map(_reverse_interaction_dcid, interaction_dcids_filtered))

            source_id = _id(source_dcid)
            target_ids = list(
                map(
                    lambda interaction_dcid: _other_interactor(
                        interaction_dcid, source_id),
                    interaction_dcids_filtered))
            # getter for score of source-target interaction
            target_scorer = lambda target_id: scores.get(
                f'{source_id}_{target_id}', DEFAULT_INTERACTION_SCORE)
            # true if score-target interaction has score above threshold
            target_ids_filtered = filter(
                lambda target_id: target_scorer(target_id) > score_threshold,
                target_ids)
            # sort in descending order of score
            target_ids_sorted = sorted(target_ids_filtered,
                                       key=target_scorer,
                                       reverse=True)
            partition = _partition_expansion_cross(target_ids_sorted,
                                                   node_id_set)
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
                expansion_links.extend(
                    map(target_link_getter, expansion_target_ids))
                last_layer_node_dcids.extend(map(_dcid, expansion_target_ids))

        if depth != max_depth + 1:
            nodes.append(
                [_node(new_node_id, depth) for new_node_id in new_node_ids])
            node_id_set.update(new_node_ids)
            links.append(expansion_links)

    graph = {'nodeDataNested': nodes, 'linkDataNested': links}

    return Response(json.dumps(graph))
>>>>>>> Stashed changes
