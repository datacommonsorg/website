# Copyright 2025 Google LLC
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

import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

from deepdiff import DeepDiff
from server.routes.experiments.biomed_nl.traversal import get_next_hop_triples
from server.routes.experiments.biomed_nl.traversal import Path
from server.routes.experiments.biomed_nl.traversal import PathFinder
from server.routes.experiments.biomed_nl.traversal import PathStore
from server.routes.experiments.biomed_nl.traversal import Property


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

  def test_merge_triples(self):
    path_store = PathStore()
    path_store.path_store = {
        'dcid1': {
            '(prop1) (prop2)': {'dcid3'},
            '(prop3)': {'dcid4'}
        },
        'dcid2': {
            '(prop4) (prop5)': {'dcid5'}
        }
    }

    input_triples = {
        'dcid3': {
            '(propA)': {'dcid6'},
            '(propB)': {'dcid7'}
        },
        'dcid4': {
            '(propC)': {'dcid8'}
        },
        'dcid5': {
            '(propD)': {'dcid9'}
        }
    }

    path_store.merge_triples_into_path_store(input_triples)

    expected_path_store = {
        'dcid1': {
            '(prop1) (prop2) (propA)': {'dcid6'},
            '(prop1) (prop2) (propB)': {'dcid7'},
            '(prop3) (propC)': {'dcid8'}
        },
        'dcid2': {
            '(prop4) (prop5) (propD)': {'dcid9'}
        }
    }
    assert DeepDiff(path_store.path_store,
                    expected_path_store,
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

  @patch('server.lib.fetch.properties')
  def test_sampling_path_store(self, mock_fetch_properties):

    def fetch_properties_response(dcids, out):
      properties = {
          "dcid1": {
              True: ['prop1'],
              False: ['prop2']
          },
          "dcid2": {
              True: ['prop2'],
          },
          "dcid3": {
              True: ['prop2'],
              False: ['prop3']
          },
          "dcid4": {
              True: ['prop4'],
          },
      }
      return {dcid: properties.get(dcid, {}).get(out, []) for dcid in dcids}

    mock_fetch_properties.side_effect = fetch_properties_response

    path_store = PathStore()
    initial_path_store = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propC)': {'dcid1'}
        },
        'start2': {
            '(propA) (propD)': {'dcid1', 'dcid2', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'}
        }
    }
    path_store.path_store = initial_path_store
    path_store.sample_next_hops(2)
    expected_store_sample_min_2 = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid3'},
            '(propC)': {'dcid1'}
        },
        'start2': {
            '(propA) (propD)': {'dcid1', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'}
        }
    }
    assert DeepDiff(path_store.path_store,
                    expected_store_sample_min_2,
                    ignore_order=True) == {}

    path_store.path_store = initial_path_store
    path_store.sample_next_hops(3)
    expected_store_sample_min_3 = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propC)': {'dcid1'}
        },
        'start2': {
            '(propA) (propD)': {'dcid1', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'}
        }
    }
    assert DeepDiff(path_store.path_store,
                    expected_store_sample_min_3,
                    ignore_order=True) == {}

  @patch('server.lib.fetch.property_values')
  def test_filter_paths(self, mock_description_values):

    def description_values_response(nodes, prop, out=True, constraints=''):
      assert prop == 'description'
      assert out == True
      assert constraints == ''
      descriptions = {
          'propA': ['description1 of propA', 'description2 of propA'],
          'propB': ['description of propB'],
          'propC': ['description of propC'],
          'propD': ['description of propD'],
          'propE': [],
      }
      return {dcid: descriptions.get(dcid, []) for dcid in nodes}

    mock_description_values.side_effect = description_values_response

    path_finder = PathFinder('query', '', [])
    path_finder.path_store.path_store = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propC)': {'dcid1'},
            '(propD) (propE)': {'dcid5'}
        },
        'start2': {
            '(propA) (Types linked by propD)': {'dcid1', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'},
            '(propB)': {'dcid6', 'dcid7'}
        }
    }

    def encode_response(text, convert_to_tensor):
      assert convert_to_tensor == True
      embeddings_ordered_by_query_similarity = [
          [0.2, 0.8, 0.1, 0.5],
          [0.1, 0.1, 0.1, 0.9],
          [0.9, 0.1, 0.2, 0.1],
          [0.8, 0.1, 0.9, 0.2],
          [0.3, 0.3, 0.7, 0.2],
      ]
      embeddings = {
          'propA means description1 of propA. propA means description2 of propA':
              embeddings_ordered_by_query_similarity[2],
          'propB means description of propB':
              embeddings_ordered_by_query_similarity[0],
          'propC means description of propC':
              embeddings_ordered_by_query_similarity[3],
          'propD means description of propD':
              embeddings_ordered_by_query_similarity[4],
          'propE':
              embeddings_ordered_by_query_similarity[1],
          'query': [0.15, 0.45, 0.1, 0.7],
      }
      if 'The description describes' in text:
        return [0.0] * 4
      return embeddings[text]

    descriptions = {
        'propA':
            'propA means description1 of propA. propA means description2 of propA',
        'propB':
            'propB means description of propB',
        'propC':
            'propC means description of propC',
        'propD':
            'propD means description of propD',
        'propE':
            'propE',
        'description': (
            'The description describes the entity by its characteristics or '
            'attributes, providing information about that entity to help to define '
            'and distinguish it.')
    }

    embeddings_mock = MagicMock()
    embeddings_mock.encode.side_effect = encode_response
    path_finder.embeddings_model = embeddings_mock

    props = path_finder.filter_paths_with_embeddings_model(
        pct=0.3)  # Rounds up to top 2 props

    assert set(props) == {'propB', 'propE'}

    filtered_path_store = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propD) (propE)': {'dcid5'}
        },
        'start2': {
            '(propB)': {'dcid6', 'dcid7'},
        }
    }
    assert DeepDiff(path_finder.path_store.path_store,
                    filtered_path_store,
                    ignore_order=True) == {}
    assert DeepDiff(path_finder.path_store.property_descriptions,
                    descriptions,
                    ignore_order=True) == {}

  def test_select_paths_none(self):
    mocked_response_text = "NONE"
    mock_gemini_response = MagicMock(text=mocked_response_text,
                                     usage_metadata=MagicMock(
                                         prompt_token_count=10,
                                         candidates_token_count=100))
    mock_client_instance = MagicMock(models=MagicMock(
        generate_content=MagicMock(return_value=mock_gemini_response)))

    path_finder = PathFinder('', '', [])
    path_finder.gemini = mock_client_instance
    path_finder.path_store.path_store = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propC)': {'dcid1'},
            '(propD) (propE)': {'dcid5'}
        },
        'start2': {
            '(propA) (propD)': {'dcid1', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'},
            '(propB)': {'dcid6', 'dcid7'}
        }
    }
    path_finder.path_store.property_descriptions = {
        'propA':
            'propA means description1 of propA. propA means description2 of propA',
        'propB':
            'propB means description of propB',
        'propC':
            'propC means description of propC',
        'propD':
            'propD means description of propD',
        'propE':
            'propE',
        'description': (
            'The description describes the entity by its characteristics or '
            'attributes, providing information about that entity to help to define '
            'and distinguish it.')
    }

    should_terminate = path_finder.select_paths()
    assert should_terminate == True
    assert path_finder.selected_paths.path_store == {}
    assert path_finder.input_tokens == 10
    assert path_finder.output_tokens == 100

  def test_select_paths_continue(self):
    mocked_response_text = '''CONTINUE

    path1: start1 (propA) (propB)
    path2: start2 (propA) (Types linked by propD)
    '''

    mock_gemini_response = MagicMock(text=mocked_response_text,
                                     usage_metadata=MagicMock(
                                         prompt_token_count=10,
                                         candidates_token_count=100))
    mock_client_instance = MagicMock(models=MagicMock(
        generate_content=MagicMock(return_value=mock_gemini_response)))

    path_finder = PathFinder('', '', [])
    path_finder.gemini = mock_client_instance
    path_finder.path_store.path_store = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propC)': {'dcid1'},
            '(propD) (propE)': {'dcid5'}
        },
        'start2': {
            '(propA) (Types linked by propD)': {'dcid1', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'},
            '(propB)': {'dcid6', 'dcid7'}
        }
    }
    path_finder.path_store.property_descriptions = {
        'propA':
            'propA means description1 of propA. propA means description2 of propA',
        'propB':
            'propB means description of propB',
        'propC':
            'propC means description of propC',
        'propD':
            'propD means description of propD',
        'propE':
            'propE',
        'description': (
            'The description describes the entity by its characteristics or '
            'attributes, providing information about that entity to help to define '
            'and distinguish it.')
    }

    should_terminate = path_finder.select_paths()
    assert should_terminate == False
    assert path_finder.selected_paths.path_store == {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
        },
        'start2': {
            '(propA) (Types linked by propD)': {'dcid1', 'dcid3', 'dcid4'},
        }
    }
    assert path_finder.input_tokens == 10
    assert path_finder.output_tokens == 100

  def test_select_paths_select(self):
    mocked_response_text = '''DONE

    path1: start1 (propA) (propB)
    path2: start2 (propA) (Types linked by propD)
    '''

    mock_gemini_response = MagicMock(text=mocked_response_text,
                                     usage_metadata=MagicMock(
                                         prompt_token_count=10,
                                         candidates_token_count=100))
    mock_client_instance = MagicMock(models=MagicMock(
        generate_content=MagicMock(return_value=mock_gemini_response)))

    path_finder = PathFinder('', '', [])
    path_finder.gemini = mock_client_instance
    path_finder.path_store.path_store = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propC)': {'dcid1'},
            '(propD) (propE)': {'dcid5'}
        },
        'start2': {
            '(propA) (Types linked by propD)': {'dcid1', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'},
            '(propB)': {'dcid6', 'dcid7'}
        }
    }
    path_finder.path_store.property_descriptions = {
        'propA':
            'propA means description1 of propA. propA means description2 of propA',
        'propB':
            'propB means description of propB',
        'propC':
            'propC means description of propC',
        'propD':
            'propD means description of propD',
        'propE':
            'propE',
        'description': (
            'The description describes the entity by its characteristics or '
            'attributes, providing information about that entity to help to define '
            'and distinguish it.')
    }

    should_terminate = path_finder.select_paths()
    assert should_terminate == True
    assert path_finder.selected_paths.path_store == {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
        },
        'start2': {
            '(propA) (Types linked by propD)': {'dcid1', 'dcid3', 'dcid4'},
        }
    }
    assert path_finder.input_tokens == 10
    assert path_finder.output_tokens == 100
