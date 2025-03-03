# # Copyright 2025 Google LLC
# #
# # Licensed under the Apache License, Version 2.0 (the "License");
# # you may not use this file except in compliance with the License.
# # You may obtain a copy of the License at
# #
# #      http://www.apache.org/licenses/LICENSE-2.0
# #
# # Unless required by applicable law or agreed to in writing, software
# # distributed under the License is distributed on an "AS IS" BASIS,
# # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# # See the License for the specific language governing permissions and
# # limitations under the License.

import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

from deepdiff import DeepDiff

# Assuming the code from the original file is in a file named 'your_module.py'
# and fetch and utils are mocked appropriately
from server.routes.experiments.biomed_nl.traversal import get_next_hop_triples
from server.routes.experiments.biomed_nl.traversal import Path
from server.routes.experiments.biomed_nl.traversal import PathFinder
from server.routes.experiments.biomed_nl.traversal import PathStore
from server.routes.experiments.biomed_nl.traversal import Property
from server.routes.experiments.biomed_nl.traversal import should_explore


def fetch_triples_side_effect(dcids, out, max_pages):

  triples = {
      "gene1": {
          True: {
              "ortholog": [{
                  "dcid": "gene2",
                  "types": ["Gene"]
              }],
              "symbol": [{
                  "value": "literal_value"
              }],
          },
          False: {
              "geneId": [{
                  "dcid": "gene_disease1",
                  "types": ["DiseaseGeneAssociation"]
              }],
          }
      },
      "disease1": {
          True: {
              "symptom": [{
                  "dcid": "symptom1",
                  "types": ["Symptom"]
              }, {
                  "dcid": "symptom2",
                  "types": ["Symptom"]
              }, {
                  "dcid": "symptom3_and_class",
                  "types": ["Symptom", "Class"]
              }],
              "severity": [{
                  "dcid": "severe",
                  "types": ["TypeEnum"]
              }],
          },
          False: {
              "diseaseId": [{
                  "dcid": "gene_disease1",
                  "types": ["DiseaseGeneAssociation"]
              }, {
                  "dcid": "gene_disease2",
                  "types": ["DiseaseGeneAssociation"]
              }, {
                  "dcid": "genetic_variant_disease1",
                  "types": ["GeneticVariantDiseaseAssociation"]
              }]
          }
      },
      "gene_disease1": {
          True: {
              "geneId": [{
                  "dcid": "gene1",
                  "types": ["Gene"]
              }],
              "diseaseId": [{
                  "dcid": "disease1",
                  "types": ["Disease"]
              }],
          },
      },
      "symptom1": {
          False: {
              "symptom": [{
                  "dcid": "disease1",
                  "types": ["Disease"]
              }, {
                  "dcid": "disease2",
                  "types": ["Disease"]
              }],
          }
      },
      'gene2': {
          True: {
              'name': {
                  'value': 'gene2 name'
              }
          }
      },
      'genetic_variant_disease1': {
          True: {
              'name': {
                  'value': 'genvar assoc name'
              }
          }
      }
  }

  return {dcid: triples.get(dcid, {}).get(out, {}) for dcid in dcids}


class TestTraversal(unittest.TestCase):

  @patch('server.lib.fetch.triples')
  def test_get_next_hop_triples(self, mock_fetch_triples):
    # Mock the return value of fetch.triples
    mock_fetch_triples.side_effect = fetch_triples_side_effect

    outgoing_result = get_next_hop_triples(['gene1', 'disease1'], out=True)

    mock_fetch_triples.assert_called_once()

    # Assertions
    expected_outgoing_result = {
        "gene1": {
            "(ortholog)": {"gene2"},
            "(symbol)": set(),
        },  # prop2 has a literal
        "disease1": {
            "(symptom)": {"symptom1", 'symptom2'},
            '(severity)': set()
        }  # prop3 is skipped because its a terminal
    }

    assert DeepDiff(outgoing_result,
                    expected_outgoing_result,
                    ignore_order=True) == {}

    incoming_result = get_next_hop_triples(['gene1', 'disease1'], out=False)
    expected_incoming_result = {
        "gene1": {
            "(DiseaseGeneAssociations linked by geneId)": {'gene_disease1'}
        },  # prop2 has a literal
        "disease1": {
            '(DiseaseGeneAssociations linked by diseaseId)': {
                'gene_disease1', 'gene_disease2'
            },
            '(GeneticVariantDiseaseAssociations linked by diseaseId)': {
                'genetic_variant_disease1'
            }
        }  # prop3 is skipped because its a terminal
    }
    assert DeepDiff(incoming_result,
                    expected_incoming_result,
                    ignore_order=True) == {}

  @patch('server.lib.fetch.triples')
  def test_traversal_without_sampling(self, mock_fetch):
    mock_fetch.side_effect = fetch_triples_side_effect

    def null_sample(_):
      return

    path_finder = PathFinder('', '', ['gene1', 'disease1'])
    path_finder.path_store.sample_next_hops = null_sample
    path_finder.traverse_n_hops(['gene1', 'disease1'], 2)

    expected_path_store = {
        'gene1': {
            '(ortholog) (name)': set(),
            '(symbol)': set(),
            '(DiseaseGeneAssociations linked by geneId) (geneId)': {'gene1'},
            '(DiseaseGeneAssociations linked by geneId) (diseaseId)': {
                'disease1'
            },
        },
        'disease1': {
            "(symptom) (Diseases linked by symptom)": {"disease1", 'disease2'},
            '(severity)':
                set(),
            '(DiseaseGeneAssociations linked by diseaseId) (geneId)': {'gene1'},
            '(DiseaseGeneAssociations linked by diseaseId) (diseaseId)': {
                'disease1'
            },
            '(GeneticVariantDiseaseAssociations linked by diseaseId) (name)':
                set()
        }
    }
    assert DeepDiff(path_finder.path_store.path_store,
                    expected_path_store,
                    ignore_order=True) == {}

  def test_sampling_path_store(self):
    # TODO: DO_NOT_SUBMIT
    pass

  def test_filter_paths(self):
    # TODO: DO_NOT_SUBMIT
    pass

  def test_select_paths(self):
    # TODO: DO_NOT_SUBMIT
    pass

  def test_find_paths(self):
    # TODO: DO_NOT_SUBMIT (heavily mocked!)
    pass

  def test_traverse_path(self):
    # TODO: DO_NOT_SUBMIT
    pass
