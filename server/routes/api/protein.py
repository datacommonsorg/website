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
import pprint
import flask
from flask import request, Response
import itertools

from cache import cache
import services.datacommons as dc

BIO_DCID_PREFIX = 'bio/'
DEFAULT_INTERACTION_SCORE = -1

bp = flask.Blueprint('api.protein', __name__, url_prefix='/api/protein')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/<path:dcid>')
def get_node(dcid):
    """Returns data given a protein node."""
    response = dc.fetch_data('/internal/bio', {
        'dcid': dcid,
    },
                             compress=False,
                             post=False,
                             has_payload=False)
    return response


def id(id_or_dcid):
    return id_or_dcid.replace(BIO_DCID_PREFIX, '')


def dcid(id_or_dcid):
    if id_or_dcid.startswith(BIO_DCID_PREFIX):
        return id_or_dcid
    return BIO_DCID_PREFIX + id_or_dcid


def node(node_id_or_dcid, depth):
    node_id = id(node_id_or_dcid)
    protein, species = node_id.split('_')
    return {
        'id': node_id,
        'name': protein,
        'species': species,
        'depth': depth,
    }


def extract_intactmi(score_dcids):
    for score_dcid in score_dcids:
        if score_dcid.startswith("IntactMiScore"):
            return float(score_dcid.replace("IntactMiScore", ""))
    return DEFAULT_INTERACTION_SCORE


def interactors(interaction_id_or_dcid):
    interaction_id = id(interaction_id_or_dcid)
    protein1, species1, protein2, species2 = interaction_id.split('_')
    return f'{protein1}_{species1}', f'{protein2}_{species2}'


def target(interaction_id_or_dcid, source_id_or_dcid):
    interaction_id, source_id = id(interaction_id_or_dcid), id(
        source_id_or_dcid)
    interactor_id1, interactor_id2 = interactors(interaction_id)
    if interactor_id1 == source_id:
        return interactor_id2
    return interactor_id1


def reverse_interaction_id(interaction_id):
    interactor_id1, interactor_id2 = interactors(interaction_id)
    return f'{interactor_id2}_{interactor_id1}'


def reverse_interaction_dcid(interaction_dcid):
    return dcid(reverse_interaction_id(id(interaction_dcid)))


def filter_interaction_dcids(interaction_dcids):
    dcids = set()
    uniques = []
    for interaction_dcid in interaction_dcids:
        source_id, target_id = interactors(interaction_dcid)
        # filter out self-interactions
        if source_id == target_id:
            continue
        reverse_dcid = reverse_interaction_dcid(interaction_dcid)
        if interaction_dcid in dcids or reverse_dcid in dcids:
            uniques.append(interaction_dcid)
        else:
            dcids.update([interaction_dcid, reverse_dcid])
    return uniques


def symmetrize_scores(scores):
    scores_sym = {}
    for interaction_id, score in scores.items():
        reverse_id = reverse_interaction_id(interaction_id)
        reverse_score = scores.get(reverse_id, DEFAULT_INTERACTION_SCORE)
        scores_sym[interaction_id] = scores_sym[reverse_id] = max(
            score, reverse_score)
    return scores_sym


def flatten(nested_list):
    flat = []
    for L in nested_list:
        flat.extend(L)
    return flat


'''
Stability: If a appears before b in target_ids and they both end up in the same
partition, a still appears before b in the partition.
'''


def partition_expansion_cross(target_ids, node_set):
    expansion_targets = []
    cross_targets = []
    for target_id in target_ids:
        if target_id in node_set:
            cross_targets.append(target_id)
        else:
            expansion_targets.append(target_id)
    return expansion_targets, cross_targets


'''
Retrieves graph data for protein-protein interaction graph via degree-bounded BFS

Request params:
 - proteinDcid: the DCID of the page protein (e.g. 'bio/P53_HUMAN')
 - scoreThreshold: interaction score threshold above which to display an edge between two interacting proteins
 - numInteractors: we take {numInteractors} top-scoring expansion links of each node during BFS
 - depth: the maximum distance of any returned node from the center protein

'''


@bp.route('/ppi/bfs/', methods=['POST'])
def bfs():
    # adjacency list representation. maps interaction ids to list of target nodes, sorted in descending order by score
    scores = {}

    center_protein_dcid = request.json['proteinDcid']
    score_threshold = request.json['scoreThreshold']
    max_interactors = request.json['maxInteractors']
    max_depth = request.json['depth']

    interaction_dcid_set = set()
    node_id_set = set([id(center_protein_dcid)])
    nodes = [[node(center_protein_dcid, 0)]]
    # nodes = node_from_id(center_protein_dcid)
    links = [[]]

    last_layer_node_dcids = [center_protein_dcid]
    for depth in range(1, max_depth + 2):
        # retrieve interactor dict of form {'bio/P53_HUMAN': ['bio/CRB_HUMAN', ...], 'bio/FGFR1_HUMAN': [...], ...}
        layer_interactors = dc.property_values(last_layer_node_dcids,
                                               "interactingProtein", "in")
        layer_scores = dc.property_values(flatten(layer_interactors.values()),
                                          "confidenceScore", "out")
        layer_scores = {
            id(interaction_dcid): extract_intactmi(score_list)
            for interaction_dcid, score_list in layer_scores.items()
        }
        layer_scores = symmetrize_scores(layer_scores)
        # add key:value pairs from layer_scores to scores
        scores.update(layer_scores)
        last_layer_node_dcids = []
        expansion_links = []
        new_nodes = []

        for source_dcid, interaction_dcids in layer_interactors.items():
            interaction_dcids_new = [
                interaction_dcid for interaction_dcid in interaction_dcids
                if interaction_dcid not in interaction_dcid_set
            ]
            interaction_dcids_filtered = filter_interaction_dcids(
                interaction_dcids_new)

            # add both interaction dcids and their reversals
            interaction_dcid_set.update(interaction_dcids_filtered)
            interaction_dcid_set.update(
                map(reverse_interaction_dcid, interaction_dcids_filtered))

            source_id = id(source_dcid)
            target_ids = [
                target(interaction_dcid, source_id)
                for interaction_dcid in interaction_dcids_filtered
            ]
            target_scorer = lambda target_id: scores.get(
                f'{source_id}_{target_id}', DEFAULT_INTERACTION_SCORE)
            target_ids_filtered = filter(
                lambda target_id: target_scorer(target_id) > score_threshold,
                target_ids)
            target_ids_sorted = sorted(target_ids_filtered,
                                       key=target_scorer,
                                       reverse=True)
            expansion_target_ids, cross_target_ids = partition_expansion_cross(
                target_ids_sorted, node_id_set)
            expansion_target_ids = expansion_target_ids[:max_interactors]
            print('expansion targets', source_id, expansion_target_ids)
            print('cross targets', source_id, cross_target_ids)
            print('node set', node_id_set)
            target_link_getter = lambda target_id: {
                'source': source_id,
                'target': target_id,
                'score': target_scorer(target_id)
            }
            links[-1].extend(map(target_link_getter, cross_target_ids))
            # TODO: track distance of each node to center
            new_nodes.extend([
                node(expansion_target_id, depth)
                for expansion_target_id in expansion_target_ids
            ])

            if depth != max_depth + 1:
                node_id_set.update(expansion_target_ids)
                expansion_links.extend(
                    map(target_link_getter, expansion_target_ids))
                last_layer_node_dcids.extend(map(dcid, expansion_target_ids))

        if depth != max_depth + 1:
            nodes.append(new_nodes)
            links.append(expansion_links)

    graph = {'nodeDataNested': nodes, 'linkDataNested': links}

    return Response(json.dumps(graph))
