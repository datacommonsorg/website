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
'''Traverses DC KG to find node paths that answer a NL query.'''

import math
import re

from google import genai
from sentence_transformers import SentenceTransformer
from sentence_transformers import util

import server.lib.fetch as fetch
import server.routes.experiments.biomed_nl.utils as utils

MIN_SAMPLE_SIZE = 3
TERMINAL_NODE_TYPES = ['Class', 'Provenance']
PATH_FINDING_MAX_V2NODE_PAGES = 2


def is_terminal(node):
  '''Determines if a node value should be skipped during graph traversal.

    Exploration continues if the node is not a terminal node. Terminal nodes
    are defined as those with types including 'Class', 'Provenance', or any
    type ending with 'Enum' or nodes without a dcid.

    Args:
        node: A single node value from V2 Node API response.

    Returns:
        True if the node should be skipped in further traversal, False otherwise.
  '''
  if 'dcid' not in node:
    return True

  if any(terminal in node['types'] for terminal in TERMINAL_NODE_TYPES):
    return True

  if any(node_type.endswith("Enum") for node_type in node['types']):
    return True

  return False


def get_next_hop_triples(dcids, out=True):
  '''Retrieves triples for the next hop in the graph traversal.

    Args:
        dcids: A list of DCIDs to fetch triples for.
        out: A boolean indicating whether to fetch outgoing (True, default)
          or incoming (False) triples.

    Returns:
        A dictionary representing the next hop triples, where:
          - Keys are dcids
          - Values are dictionaries mapping formatted property labels to sets of
            object DCIDs.  Empty sets are used to represent properties with no
            further DCIDs to explore (e.g., properties with literal values).

    Example Output:
    {
      "dcid1": {
          "(outgoingNodeProperty)": {"dcid3"},
          "(stringTypeProperty)": set(),        
          "(Genes linked by propertyD)": {"dcid5"}
      },
      "dcid2": {
          "(enumTypeProperty)": set()
      }
    }
  '''
  triples = fetch.triples(dcids, out, max_pages=PATH_FINDING_MAX_V2NODE_PAGES)

  result = {}
  for subject_dcid, properties in triples.items():
    result_dcid = result.setdefault(subject_dcid, {})
    for property, value_objects in properties.items():
      formatted_property_label = Property.format_label(property)
      for value_object in value_objects:
        if is_terminal(value_object):
          result_dcid.setdefault(formatted_property_label, set())
          continue

        if out:
          result_dcid.setdefault(formatted_property_label,
                                 set()).add(value_object['dcid'])
        else:
          for value_object_type in value_object.get('types', []):
            result_dcid.setdefault(
                Property.format_label(property, value_object_type),
                set()).add(value_object['dcid'])

  return result


class Property:

  @staticmethod
  def is_incoming(property_label):
    '''Checks if a property label represents an incoming link.'''
    return Property.incoming_token() in property_label

  @staticmethod
  def incoming_token():
    '''Returns the token(s) used to generate incoming link property labels.'''
    return 's linked by '

  @staticmethod
  def format_label(property, incoming_type=''):
    '''Formats a property label represting a single hop in a path.'''
    if incoming_type:
      return f'({incoming_type + Property.incoming_token() + property})'

    return f'({property})'

  @staticmethod
  def parse_label(property_label, include_incoming_types):
    '''Extracts the property id and optionally incoming node type from a
    formatted property label.'''
    label = re.sub(r"[()]", "", property_label)
    if Property.is_incoming(property_label):
      split_label = label.split(Property.incoming_token())
      if include_incoming_types:
        return split_label[1], split_label[0]
      else:
        return split_label[1]
    return label


class Path:

  @staticmethod
  def parse(path, include_incoming_types=True):
    '''Parses a path string into a list of individual property labels.'''
    return [
        Property.parse_label(prop, include_incoming_types)
        for prop in path.split(') ')
    ]

  @staticmethod
  def add_hop(path, formatted_property_label):
    return ' '.join([path, formatted_property_label])


class PathStore:

  def __init__(self):
    self.path_store = {}
    self.property_descriptions = {}

  @classmethod
  def from_selected_paths(cls, selected_paths, original):
    instance = cls()
    for path_str in selected_paths:
      start_dcid = re.findall('path\d+: (.*?) \(', path_str)[0]
      path = path_str.split(start_dcid)[1].strip()
      next_dcids = original.path_store.get(start_dcid, {}).get(path, set())
      instance.path_store.setdefault(start_dcid,
                                     {}).setdefault(path,
                                                    set()).update(next_dcids)
    return instance

  def get_start_dcids(self):
    return list(self.path_store.keys())

  def get_next_dcids(self):
    '''Returns a list of all DCIDs that are the target of the last hop across
    all paths in the PathStore.'''
    next_dcids = []
    for path in self.path_store.values():
      next_dcids.extend(path.values())
    return next_dcids

  def get_paths_from_start(self):
    '''Returns a dictionary mapping start DCIDs to lists of the paths
    originating from them.'''
    return {dcid: list(props.keys()) for dcid, props in self.path_store.items()}

  def merge_triples_into_path_store(self, triples):
    '''Merges new triples into the existing path store by extending the paths.

    Modifies self.path_store in place by extending the paths based on matching
    the target nodes of the existing paths with subject_dcids in the triples to
    be merged.

    Args:
        triples: A dictionary representing the new triples to merge.  The
          structure should match the format returned by `get_next_hop_triples`
          where:
          - Keys are dcids matching "target" dcids in the path_store.
          - Values are dictionaries where keys are formatted propery_labels
            and values are sets of dcids representing values for that property.

    Example:
      Inputs: 
        - self.path_store: {
            'dcid1': {
              '(prop1) (prop2)': {'dcid3'},
              '(prop3)': {'dcid4'}
            },
            'dcid2': {
              '(prop4) (prop5)': {'dcid5'}
            }
          }
        - triples: {
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
      Result:
        - self.path_store: {
            'dcid1': {
              '(prop1) (prop2) (propA)': {'dcid6'},
              '(prop1) (prop2) (propB)': {'dcid7'},
              '(prop3) (propC)': {'dcid8'}
            },
            'dcid2': {
              '(prop4) (prop5) (propD)': {'dcid9'}
            }
          }
    '''
    if not self.path_store:
      self.path_store = triples
      return

    merged_path_store = {}
    for start_dcid, paths in self.path_store.items():
      for path, next_dcids in paths.items():
        if not next_dcids:
          merged_path_store.setdefault(start_dcid, {})[path] = set()
          continue

        for next_dcid in next_dcids:
          for prop, prop_vals in triples.get(next_dcid, {}).items():
            merged_path = Path.add_hop(path, prop)
            merged_path_store.setdefault(start_dcid,
                                         {}).setdefault(merged_path,
                                                        set()).update(prop_vals)

    self.path_store = merged_path_store

  def sample_next_hops(self, min_sample_size):
    """Reduces the set of next_dcids for each path down to the minimum set that
    spans all unique next_hop possibilities.

    Modifies self.path_store in place.

    Args:
      min_sample_size: The minimum number of DCIDs that should remain for each
        path. 
    
    TODO: Extract similar sampling technique used in entity_recognition and move
      to shared utils.
    """

    next_dcids = self.get_next_dcids()
    outgoing_props = fetch.properties(next_dcids, out=True)
    incoming_props = fetch.properties(next_dcids, out=False)
    dcid_to_all_props = {
        node_dcid:
            list(
                set(
                    outgoing_props.get(node_dcid, []) +
                    incoming_props.get(node_dcid, [])))
        for node_dcid in set(outgoing_props.keys()) | set(incoming_props.keys())
    }

    sample_path_store = {}

    for start_dcid, paths in self.path_store.items():

      sample_path_store[start_dcid] = {}

      for path, next_dcids in paths.items():

        sample_path_store[start_dcid][path] = set()
        unique_next_props_for_path = {
            next_prop for dcid in next_dcids
            for next_prop in dcid_to_all_props.get(dcid, [])
        }

        sample_dcids = set()
        skipped_dcids = []

        dcids_to_props = {
            dcid: dcid_to_all_props.get(dcid, []) for dcid in next_dcids
        }
        # Sort properties by length for deterministic testing.
        for dcid, props in sorted(dcids_to_props.items(),
                                  key=lambda item: len(item[1]),
                                  reverse=True):
          if not unique_next_props_for_path:
            if len(sample_dcids) >= min_sample_size:
              break
            sample_dcids.add(dcid)
          elif any(prop in unique_next_props_for_path for prop in props):
            sample_dcids.add(dcid)
            unique_next_props_for_path.difference_update(props)
          else:
            skipped_dcids.append(dcid)

        num_samples_to_add = min_sample_size - len(sample_dcids)
        if num_samples_to_add > 0:
          sample_dcids.update(skipped_dcids[:num_samples_to_add])
        sample_path_store[start_dcid][path] = sample_dcids

    self.path_store = sample_path_store

  def fetch_property_descriptions(self):
    '''Fetches and stores descriptions for properties in the path store.

    Updates `self.property_descriptions` with descriptions retrieved from
    DC KG.  If a description isn't found, the property name itself is used as
    the description.
    '''

    all_prop_dcids = {
        prop for paths in self.path_store.values() for path in paths
        for prop in Path.parse(path, include_incoming_types=False)
    }

    descriptions = fetch.property_values(all_prop_dcids, 'description')

    merged_descriptions = {}
    for prop in all_prop_dcids:
      if not descriptions.get(prop, []):
        merged_descriptions[prop] = prop
      else:
        merged_descriptions[prop] = '. '.join([
            f"{prop} means {description}"
            for description in descriptions.get(prop)
        ])

    self.property_descriptions = merged_descriptions

  def get_property_descriptions(self):
    if not self.property_descriptions:
      self.fetch_property_descriptions()
    return self.property_descriptions

  def filter_by_properties(self, selected_properties):
    '''Filters the paths in the path store, keeping only those containing specified properties.

    This method modifies self.path_store in place, removing paths that do not
    contain at least one of the selected_properties.

    Args:
        selected_properties: A list of property names to filter by.
    '''

    filtered_path_store = {}
    for start_dcid, paths in self.path_store.items():
      for path, next_dcids in paths.items():
        # If the path contains any of the selected_properties, then keep it.
        if any(property in Path.parse(path, include_incoming_types=False)
               for property in selected_properties):
          filtered_path_store.setdefault(start_dcid, {})[path] = next_dcids

    self.path_store = filtered_path_store


class PathFinder:

  def __init__(self, query, start_entity_name, start_entity_dcids):
    # Set params
    self.query = query
    self.start_entity_name = start_entity_name
    self.start_dcids = start_entity_dcids
    self.path_store = PathStore()
    self.selected_paths = PathStore()
    self.input_tokens = 0
    self.output_tokens = 0
    self.gemini = None
    self.embeddings_model = None
    self.gemini_model_str = ''

  def initialize_models(self,
                        gemini_api_key,
                        gemini_model_str='gemini-2.0-flash-001'):
    self.embeddings_model = SentenceTransformer(
        'all-MiniLM-L6-v2')  # Or another lightweight model
    self.gemini = genai.Client(
        api_key=gemini_api_key,
        http_options=genai.types.HttpOptions(api_version='v1alpha'))
    self.gemini_model_str = gemini_model_str

  def traverse_n_hops(self, start_dcids, n):
    '''Traverses the graph for a specified number of hops, updating the path store.

    Args:
        start_dcids: A list of starting DCIDs.
        n: The number of hops to traverse.
    '''
    dcids = start_dcids
    for _ in range(n):
      if not dcids:
        return

      out_triples = get_next_hop_triples(dcids, out=True)
      in_triples = get_next_hop_triples(dcids, out=False)
      triples = {
          dcid: {
              **out_triples.get(dcid, {}),
              **in_triples.get(dcid, {})
          } for dcid in set(out_triples.keys()) | set(in_triples.keys())
      }

      self.path_store.merge_triples_into_path_store(triples)
      self.path_store.sample_next_hops(MIN_SAMPLE_SIZE)
      dcids = self.path_store.get_next_dcids()

  def filter_paths_with_embeddings_model(self, pct=0.1):
    '''Filters paths based on cosine similarity between property descriptions 
    and the query.

    Args:
        pct: The percentage of top properties to keep (e.g., 0.1 for 10%).

    Returns:
        A list of the top properties that were selected for filtering.
    '''

    property_descriptions = self.path_store.get_property_descriptions()

    # TODO: add a description to description in DC KG.
    property_descriptions['description'] = (
        'The description describes the entity by its characteristics or '
        'attributes, providing information about that entity to help to define '
        'and distinguish it.')

    prop_embeds = {
        prop:
            self.embeddings_model.encode(property_descriptions[prop],
                                         convert_to_tensor=True)
        for prop in property_descriptions
    }
    query_embed = self.embeddings_model.encode(self.query,
                                               convert_to_tensor=True)

    properties_to_similarity_score = {
        prop: util.cos_sim(query_embed, prop_embed).item()
        for prop, prop_embed in prop_embeds.items()
    }
    num_top_properties = math.ceil(len(properties_to_similarity_score) * pct)
    top_props = [
        property[0]
        for property in sorted(properties_to_similarity_score.items(),
                               key=lambda item: item[1],
                               reverse=True)[:num_top_properties]
    ]

    self.path_store.filter_by_properties(top_props)

    return top_props

  def select_paths(self):
    '''Selects paths to purpose using the Gemini model based on a prompt.

    Returns:
        True if the traversal should terminate, False otherwise.
    '''

    should_terminate = True

    prompt = utils.TRAVERSAL_PROMPT.format(
        QUERY=self.query,
        START_ENT=self.start_entity_name,
        START_DCIDS=self.start_dcids,
        LINKS=self.path_store.get_paths_from_start(),
        METADATA=self.path_store.get_property_descriptions())
    response = self.gemini.models.generate_content(model=self.gemini_model_str,
                                                   contents=prompt)
    input_tokens, output_tokens = utils.get_gemini_response_token_counts(
        response)
    self.input_tokens += input_tokens
    self.output_tokens += output_tokens

    if response.text.startswith('DONE'):
      should_terminate = True
    elif response.text.startswith('CONTINUE'):
      should_terminate = False
    elif response.text.startswith('NONE'):
      return True
    else:
      # This branch only occurs if there has been an error with Gemini.
      return True

    paths = [
        line.strip()
        for line in response.text.split('\n')
        if bool(re.match(r"^path\d+:", line.strip()))
    ]

    self.selected_paths = PathStore.from_selected_paths(paths, self.path_store)

    return should_terminate

  def find_paths(self):
    '''Finds paths in the graph based on the query, traversing and filtering.

    Returns:
        A tuple containing:
            - selected_paths: A Pathstore object of selected paths.
            - top_props: The list of properties that were used to do filtering.
    '''

    self.traverse_n_hops(self.start_dcids, 3)
    top_props = self.filter_paths_with_embeddings_model()
    should_terminate = self.select_paths()

    if should_terminate:
      return self.selected_paths
    self.path_store = self.selected_paths

    self.traverse_n_hops(self.path_store.get_next_dcids(), 3)
    top_props = top_props.extend(self.filter_paths_with_embeddings_model())
    should_terminate = self.select_paths()

    if not should_terminate:
      # Long term, we could continue traversing if we are confident in the LLM
      # choices.
      pass
    return top_props
