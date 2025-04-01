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

import enum
import json
import math
import re
import time

from markupsafe import escape
from pydantic import BaseModel

import server.lib.fetch as fetch
from server.routes.experiments.biomed_nl.entity_recognition import \
    annotate_query_with_types
from server.routes.experiments.biomed_nl.entity_recognition import \
    recognize_entities_from_query
import server.routes.experiments.biomed_nl.utils as utils
import server.services.datacommons as dc

MIN_SAMPLE_SIZE = 3
TERMINAL_NODE_TYPES = ['Class', 'Provenance']
PATH_FINDING_MAX_V2NODE_PAGES = 2
EMBEDDINGS_MODEL = 'ft-final-v20230717230459-all-MiniLM-L6-v2'
MAX_HOPS_TO_FETCH_ALL_TRIPLES = 3
MAX_UNFILTERED_PATHS_FOR_TRAVERSAL = 100
MAX_ENTITY_INFO_SIZE_MB = 9

FETCH_ENTITIES_TIMEOUT = 180  # 3 minutes

DESCRIPTION_OF_DESCRIPTION_PROPERTY = (
    'The description describes the entity by its characteristics or '
    'attributes, providing information about that entity to help to define '
    'and distinguish it.')


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
  triples = {}
  for dcid_batch in utils.batch_requested_nodes(dcids):
    triples.update(
        fetch.triples(dcid_batch, out, max_pages=PATH_FINDING_MAX_V2NODE_PAGES))

  result = {}
  for subject_dcid, properties in triples.items():
    result_dcid = result.setdefault(subject_dcid, {})
    for prop, value_objects in properties.items():
      formatted_property_label = Property.format_label(prop)
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
                Property.format_label(prop, value_object_type),
                set()).add(value_object['dcid'])

  return result


def get_all_triples(dcids):
  result = {}
  for dcid_batch in utils.batch_requested_nodes(dcids):
    out_triples = fetch.triples(dcid_batch, out=True, max_pages=None)
    in_triples = fetch.triples(dcid_batch, out=False, max_pages=None)
    for dcid in dcid_batch:
      result.setdefault(dcid, {})['outgoing'] = out_triples.get(dcid, {})
      result.setdefault(dcid, {})['incoming'] = in_triples.get(dcid, {})
    if utils.get_dictionary_size_mb(result) > MAX_ENTITY_INFO_SIZE_MB:
      print('hello2')
      return result
  return result


class Property:
  '''Manages property labels, including formatting and parsing.

  This class provides static methods for handling property labels,
  distinguishing between incoming and outgoing properties, and extracting
  information from formatted labels.  It uses a specific token to identify
  incoming properties.

  The format of property labels handled by this class is:
    - Outgoing: (property_id)  e.g., (drugGenericName)
    - Incoming: (node_type + incoming_token + property_id) e.g., (ChemicalCompoundGeneticVariantAssociations linked by compoundID)
  '''

  @staticmethod
  def is_incoming(property_label):
    '''Checks if a property label represents an incoming link.'''
    return Property.incoming_token() in property_label

  @staticmethod
  def incoming_token():
    '''Returns the token(s) used to generate incoming link property labels.'''
    return 's linked by '

  @staticmethod
  def format_label(prop, incoming_type=''):
    '''Formats a property label representing a single hop in a path.'''
    if incoming_type:
      return f'({incoming_type + Property.incoming_token() + prop})'

    return f'({prop})'

  @staticmethod
  def parse_label(property_label):
    '''Extracts the property id and node type from a
    formatted property label. Node type is empty string for outgoing properties.
    
    Example 1:
      - Input: '(drugGenericName)'
      - Output: 'drugGenericName', ''

    Example 2:
      - Input: '(ChemicalCompoundGeneticVariantAssociations linked by compoundID)'
      - Output: compoundID, ChemicalCompoundGeneticVariantAssociation
    '''
    prop = re.sub(r"[()]", "", property_label)

    if Property.is_incoming(property_label):
      split_label = prop.split(Property.incoming_token())
      return split_label[1], split_label[0]

    return prop, ''


class Path:
  '''Parses and manipulates path strings representing sequences of properties.

    This class provides static methods for parsing path strings into lists of
    property IDs and node types, as well as for constructing new path strings
    by adding hops.  It relies on the `Property` class to handle individual
    property labels.  The expected format for path strings is a sequence of
    formatted property labels (as defined by the `Property` class), separated
    by ') ('.

    Example Path String:
        '(prop1) (type1s linked by prop2) (prop3)'
    '''

  @staticmethod
  def parse_properties(path):
    '''Parses a path string into a list of individual property labels.

    Returns:
      A list of strings where each item is a DCID of a Property in DC KG.
    
    Example:
      - Inputs: 
          path: '(ChemicalCompoundGeneticVariantAssociations linked by compoundID) (variantID)'
      
      - Output:
        ['compoundID', 'variantID']

    '''

    property_list = []
    for property_label in path.split(') ('):
      # parse_label removes extra parentheses
      prop, _ = Property.parse_label(property_label)
      property_list.append((prop))
    return property_list

  def parse_property_and_type(path):
    '''Parses a path string into a list of individual property labels and incoming type.

     Returns:
      A list of tuples where the first item is a DCID of a Property in DC KG and
      the second item is type of the source entity if the property is an incoming
      arc within the path.   
    
    Example 1:
      - Inputs: 
          path: '(ChemicalCompoundGeneticVariantAssociations linked by compoundID) (variantID)'
      
      - Output:
        [('compoundID', 'ChemicalCompoundGeneticVariantAssociations'), ('variantID', '')]
    '''

    property_and_type_list = []
    for property_label in path.split(') ('):
      prop, node_type = Property.parse_label(property_label)
      property_and_type_list.append((prop, node_type))
    return property_and_type_list

  @staticmethod
  def add_hop(path, formatted_property_label):
    return ' '.join([path, formatted_property_label])


class PathStore:
  '''Manages a store of paths starting from specific DCIDs along with property descriptions.

    The `PathStore` class stores and manipulates a collection of paths,
    represented as nested dictionaries.

    The core data structure, `self.current_paths`, is a nested dictionary with
    the structure:
      {
        start_dcid: {
          path_string: set(next_dcids),
          ...
        },
        ...
      }
    where
      - `start_dcid`:  The DCID of the starting node for a set of paths.
      - `path_string`: A string representing the sequence of properties
       connecting the `start_dcid` to the `next_dcids`. The format is a
       space-separated sequence of formatted property labels, as defined by
       the `Property` class.  Example: `(prop1) (type1s linked by prop2) (prop3)`
      - `next_dcids`: A set of DCIDs representing the nodes reached by
       following the `path_string` from the `start_dcid`.

    The class also maintains:
      - `self.selected_paths`: A subset of `current_paths`, created by the 
          `select_paths` method
      - `self.property_descriptions`: Stores descriptions fetched from the DC KG 
          for properties in the paths.

    Args:
        min_sample_size (int, optional):  The minimum number of "next DCIDs" to
            retain for each path during the `sample_next_hops` operation.
            Defaults to `MIN_SAMPLE_SIZE`.
    '''

  def __init__(self, min_sample_size=MIN_SAMPLE_SIZE):
    self.current_paths = {}
    self.selected_paths = {}
    self.property_descriptions = {}
    self.min_next_dcid_sample_size = min_sample_size

  def select_paths(self, selected_path_strs):
    """Copies the specified paths to the selected_paths field from current_paths.

    This method updates the self.selected_paths attribute to contain only
    the paths specified in selected_path_strs. It extracts the starting
    DCID and path string from each input string and retrieves the
    corresponding DCIDs from the self.current_paths dictionary. If a path
    string is not found or has an invalid format, it is skipped.  The
    self.selected_paths attribute is modified in-place; no new object
    is created.

    Args:
        selected_path_strs: A list of strings, where each string represents a
            path to be selected.  The expected format is:
            "path<number>: <start_dcid> (<path_string>)", e.g.,
            "path1: place1 (prop1->prop2->prop3)".  The part in parentheses
            is the path.

    Returns:
        None.  The self.selected_paths attribute of the object is updated.
        If selected_path_strs is empty, self.selected_paths will be
        an empty dictionary. If no matching paths are found,
        self.selected_paths will also be empty.

    Example:
      - Inputs:
        - self.current_paths = {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
            '(propC)': {'dcid1'}
        },
        'start2': {
            '(propA) (propD)': {'dcid1', 'dcid2', 'dcid3', 'dcid4'},
            '(propC)': {'dcid1'}
        }
      - selected_path_strs = [
        'path1: start1 (propA) (propB)',
        'path2: start2 (propC)'
        ]

      - Result:
        self.selected_paths - {
        'start1': {
            '(propA) (propB)': {'dcid1', 'dcid2', 'dcid3'},
        },
        'start2': {
            '(propC)': {'dcid1'}
        }
    """

    selected_path_store = {}
    for path_str in selected_path_strs:
      start_dcid = re.findall(r'path\d+: (.*?) \(', path_str)[0]
      property_path = path_str.split(start_dcid)[1].strip()
      next_dcids = self.current_paths.get(start_dcid,
                                          {}).get(property_path, set())
      selected_path_store.setdefault(start_dcid,
                                     {}).setdefault(property_path,
                                                    set()).update(next_dcids)

    self.selected_paths = selected_path_store

  def get_start_dcids(self):
    return list(self.current_paths.keys())

  def get_next_dcids(self):
    '''Returns a list of all DCIDs that are the target of the last hop across
    all paths in the PathStore.'''
    next_dcids = set()
    for path in self.current_paths.values():
      for dcids in path.values():
        next_dcids.update(dcids)
    return list(next_dcids)

  def get_paths_from_start(self, only_selected_paths=False):
    '''Returns a dictionary mapping start DCIDs to lists of the paths
    originating from them.'''

    paths = self.current_paths
    if only_selected_paths:
      paths = self.selected_paths

    return {dcid: list(props.keys()) for dcid, props in paths.items()}

  def merge_triples_into_path_store(self, triples):
    '''Merges new triples into the existing path store by extending the paths.

    Modifies self.current_paths in place by extending the paths based on matching
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
        - self.current_paths: {
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
        - self.current_paths: {
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
    if not self.current_paths:
      self.current_paths = triples
      self.sample_next_hops()
      return

    merged_path_store = {}
    for start_dcid, paths in self.current_paths.items():
      paths_from_start_dcid = merged_path_store.setdefault(start_dcid, {})
      for path, next_dcids in paths.items():
        if not next_dcids:
          paths_from_start_dcid[path] = set()
          continue

        for next_dcid in next_dcids:
          for prop, prop_vals in triples.get(next_dcid, {}).items():
            merged_path = Path.add_hop(path, prop)
            paths_from_start_dcid.setdefault(merged_path,
                                             set()).update(prop_vals)

    self.current_paths = merged_path_store
    self.sample_next_hops()

  def sample_next_hops(self):
    """Reduces the set of next_dcids for each path down to the minimum set that
    spans all unique next_hop possibilities.

    Modifies self.current_paths in place.
    
    TODO: Extract similar sampling technique used in entity_recognition and move
      to shared utils.
    """

    next_dcids = self.get_next_dcids()

    outgoing_props = {}
    incoming_props = {}
    for dcid_batch in utils.batch_requested_nodes(next_dcids):
      outgoing_props.update(fetch.properties(dcid_batch, out=True))
      incoming_props.update(fetch.properties(dcid_batch, out=False))

    dcid_to_all_props = {}
    for dcid in set(outgoing_props.keys()) | set(incoming_props.keys()):
      props = set()
      props.update(outgoing_props.get(dcid, []))
      props.update(incoming_props.get(dcid, []))
      dcid_to_all_props[dcid] = list(props)

    sample_path_store = {}

    for start_dcid, paths in self.current_paths.items():

      sample_path_store[start_dcid] = {}

      for path, next_dcids in paths.items():

        sample_path_store[start_dcid][path] = set()

        unique_next_props_for_path = set()
        for dcid in next_dcids:
          unique_next_props_for_path.update(dcid_to_all_props.get(dcid, []))

        sample_dcids = set()
        skipped_dcids = []

        for dcid in sorted(next_dcids):
          props = dcid_to_all_props.get(dcid, [])
          if not unique_next_props_for_path:
            if len(sample_dcids) >= self.min_next_dcid_sample_size:
              break
            sample_dcids.add(dcid)
          elif any(prop in unique_next_props_for_path for prop in props):
            sample_dcids.add(dcid)
            unique_next_props_for_path.difference_update(props)
          else:
            skipped_dcids.append(dcid)

        num_samples_to_add = self.min_next_dcid_sample_size - len(sample_dcids)
        if num_samples_to_add > 0:
          sample_dcids.update(skipped_dcids[:num_samples_to_add])
        sample_path_store[start_dcid][path] = sample_dcids

    self.current_paths = sample_path_store

  def get_property_descriptions(self):
    '''Fetches and stores descriptions for properties in the path store.

    Updates `self.property_descriptions` with descriptions retrieved from
    DC KG.  If a description isn't found, the property name itself is used as
    the description.
    '''

    all_property_dcids = set()
    for paths in self.current_paths.values():
      for path in paths:
        all_property_dcids.update(Path.parse_properties(path))

    property_dcids_to_fetch = all_property_dcids.difference(
        self.property_descriptions.keys())
    if not property_dcids_to_fetch:
      return self.property_descriptions

    descriptions = {}
    for dcid_batch in utils.batch_requested_nodes(
        list(property_dcids_to_fetch)):
      descriptions.update(fetch.property_values(dcid_batch, 'description'))

    for prop in property_dcids_to_fetch:
      if not descriptions.get(prop, []):
        self.property_descriptions[prop] = prop
      else:
        self.property_descriptions[prop] = '. '.join([
            f"{prop} means {description}"
            for description in descriptions.get(prop)
        ])
    return self.property_descriptions

  def filter_by_properties(self, selected_properties):
    '''Filters the paths in the path store, keeping only those containing specified properties.

    This method modifies self.current_paths in place, removing paths that do not
    contain at least one of the selected_properties.

    Args:
        selected_properties: A list of property names to filter by.
    '''

    filtered_path_store = {}
    for start_dcid, paths in self.current_paths.items():
      for path in paths:
        path_properties = Path.parse_properties(path)
        if any(prop in path_properties for prop in selected_properties):
          # If the path contains any of the selected_properties, then keep it.
          filtered_path_store.setdefault(start_dcid, {})[path] = paths[path]

    self.current_paths = filtered_path_store


class PathFinder:
  '''Facilitates pathfinding in a knowledge graph based on a natural language query.

    The `PathFinder` class implements a multi-stage process for finding relevant
    paths in a knowledge graph connecting a starting entity to other entities
    related to a user's query.  It leverages both graph traversal techniques
    and large language models (LLMs) for path selection and termination.

    Path finding can be broken down into the following steps 
    0. Determine whether the query is asking for an overview or traversal and
       extract the starting entity + dcids.
    1. Explore the knowledge graph outwards from the
       starting entity's DCIDs for a specified number of hops, using the
       `traverse_n_hops` method.  This populates the `PathStore` with
       discovered paths.
    2. Filters the discovered paths by comparing
       the semantic similarity between property descriptions and the user's
       query using a SentenceTransformer model. This
       reduces the number of paths to a manageable subset.
    3. Prompts Gemini model to analyze the remaining paths and select the most 
       promising ones for further exploration or termination.  The LLM is
       provided with the query, starting entity, current paths, and property
       metadata.
    5. Steps 1-3 can be repeated, further traversing the graph
       from the endpoints of the selected paths, refining the path set with
       each iteration.
    6. The process terminates either when the LLM indicates that a satisfactory 
       answer has been found ("DONE" response) or when no relevant paths remain 
       ("NONE" response), or in an error state.

    Attributes:
        query (str): The user's natural language query.
        start_entity_name (str): The name of the starting entity.
        start_dcids (list): A list of DCIDs for the starting entity.
        path_store (PathStore): An instance of the `PathStore` class to manage
            discovered paths.
        input_tokens (int):  Tracks the cumulative number of input tokens used
            in Gemini API calls.
        output_tokens (int): Tracks the cumulative number of output tokens used
            in Gemini API calls.
        gemini: A Gemini client object.
        gemini_model_str (str, optional): Name of the Gemini model to use.
    '''

  class TraversalTypes(enum.Enum):
    OVERVIEW = "Overview"
    TRAVERSAL = "Traversal"

  class DetectedEntities(BaseModel):
    raw_str: str
    sanitized_str: str
    synonyms: list[str]

  class StartInfo(BaseModel):
    traversal_type: "PathFinder.TraversalTypes"
    entities: "list[PathFinder.DetectedEntities]"

  def __init__(self,
               query,
               gemini_client=None,
               gemini_model_str='gemini-2.0-flash-001'):
    # Set params
    self.raw_query = query
    self.query = query
    self.start_entity_name = ''
    self.start_dcids = []
    self.path_store = PathStore()
    self.input_tokens = 0
    self.output_tokens = 0
    self.gemini = gemini_client
    self.gemini_model_str = gemini_model_str
    self.traversal_type = None

  def find_start_and_traversal_type(self):
    '''Parses the raw query using a Gemini model to identify the query type,
    entities, and their types.

    This method performs the following steps:
    1. Formats a prompt for the Gemini model using the raw query.
    2. Calls the Gemini model to generate a structured JSON response containing
       parsed information about the query.
    3. Extracts the query type from the Gemini response and sets the
       `self.query_type` attribute.
    4. Identifies the primary starting entity from the parsed entities and
       sets `self.start_entity_name` and creates a list of potential
       starting strings (including synonyms).
    5. Creates a mapping between sanitized entity strings and their original
       raw strings, including synonyms.
    6. Uses an external function `recognize_entities_from_query` to identify
       entities and their associated Data Commons IDs (DCIDs) and recognized
       types within the query.
    7. Populates the `self.start_dcids` list with the DCIDs of the starting
       entity.
    8. Creates a mapping between the raw entity strings and their recognized
       types.
    9. Uses an external function `annotate_query_with_types` to add type
       information to the original raw query, storing the result in
       `self.query`.

    Returns:
      List of GraphEntities that were detected from the query to be displayed in
      final page result.
    '''
    prompt = utils.PARSE_QUERY_PROMPT.format(QUERY=self.raw_query)

    gemini_response = self.gemini.models.generate_content(
        model=self.gemini_model_str,
        contents=prompt,
        config={
            'response_mime_type': 'application/json',
            'response_schema': PathFinder.StartInfo,
        })
    parsed_response = PathFinder.StartInfo(**json.loads(gemini_response.text))
    self.traversal_type = parsed_response.traversal_type

    # Take the first entity because we only want to traverse from one starting point
    start_entity = parsed_response.entities[0]
    self.start_entity_name = start_entity.sanitized_str
    start_strs = [start_entity.sanitized_str] + start_entity.synonyms

    str_to_raw = {}
    for entity in parsed_response.entities:
      str_to_raw[entity.sanitized_str] = entity.raw_str
      for synonym in entity.synonyms:
        str_to_raw[synonym] = entity.raw_str

    detected_entities = recognize_entities_from_query(' '.join(
        (str_to_raw.keys())))

    displayed_entities = {}

    start_dcids = set()
    raw_to_types = {}
    for entity in detected_entities:
      raw_to_types.setdefault(str_to_raw.get(entity.name, entity.name),
                              []).extend(entity.types)
      # Check if the resolved KG entity name is a substring of the identified
      # start strings. The substring check is required because gemini might
      # identify "abcd genes" as the start entity when we actually match on just
      # "abcd".
      if any(entity.name in start_str for start_str in start_strs):
        start_dcids.add(entity.dcid)

      if entity.dcid in displayed_entities:
        combined_types = list(
            set(displayed_entities[entity.dcid].types) | set(entity.types))
        displayed_entities[entity.dcid].types = combined_types
      else:
        displayed_entities[entity.dcid] = entity.model_copy()

    self.start_dcids = list(start_dcids)
    self.query = annotate_query_with_types(self.raw_query, raw_to_types)

    return list(displayed_entities.values())

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
      dcids = self.path_store.get_next_dcids()

  def filter_paths_with_embeddings(
      self,
      pct=0.3,
      max_paths_before_filtering=MAX_UNFILTERED_PATHS_FOR_TRAVERSAL):
    '''Filters paths based on cosine similarity between property descriptions 
    and the query.

    Args:
        pct: The percentage of top properties to keep (e.g., 0.1 for 10%).

    Returns:
        A list of the top properties that were selected for filtering.
    '''
    property_descriptions = self.path_store.get_property_descriptions()

    total_paths = len([
        path for paths_from_start_dcid in
        self.path_store.get_paths_from_start().values()
        for path in paths_from_start_dcid
    ])
    if total_paths < max_paths_before_filtering:
      # If there's not too many paths for Gemini to choose from, then skip
      # filtering by embedding
      return list(property_descriptions.keys())

    # TODO: add a description to description in DC KG.
    property_descriptions['description'] = DESCRIPTION_OF_DESCRIPTION_PROPERTY

    # note: the keys of the nl_encode output are santized copies of the inputs
    embeddings = dc.nl_encode(
        EMBEDDINGS_MODEL,
        list(property_descriptions.values()) + [self.query.lower()])
    sanitized_query = str(escape(self.query.lower()))
    query_embed = embeddings[sanitized_query]

    property_similarity_scores = {}
    for prop, description in property_descriptions.items():
      # sanitize the description to match sanitized output of nl_encode
      sanitized_description = str(escape(description))
      cosine_similarity = utils.cos_sim(
          query_embed, embeddings[sanitized_description]).item()
      property_similarity_scores[prop] = cosine_similarity

    num_top_properties = math.ceil(len(property_similarity_scores) * pct)
    top_props = [
        property[0] for property in sorted(property_similarity_scores.items(),
                                           key=lambda item: item[1],
                                           reverse=True)[:num_top_properties]
    ]

    self.path_store.filter_by_properties(top_props)

    return top_props

  def is_traversal_complete(self):
    '''Prompts gemini to select which paths to pursue and whether traversal can
    terminate.

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

    self.path_store.select_paths(paths)

    return should_terminate

  def find_paths(self):
    '''Finds paths in the graph based on the query, traversing and filtering.

    Returns:
        A tuple containing:
            - selected_paths: A Pathstore object of selected paths.
            - top_props: The list of properties that were used to do filtering.
    '''

    self.traverse_n_hops(self.start_dcids, 3)
    top_props = self.filter_paths_with_embeddings()
    should_terminate = self.is_traversal_complete()

    if should_terminate:
      return self.path_store.selected_paths
    self.path_store.current_paths = self.path_store.selected_paths

    self.traverse_n_hops(self.path_store.get_next_dcids(), 3)
    top_props = top_props.extend(self.filter_paths_with_embeddings())
    should_terminate = self.is_traversal_complete()

    if not should_terminate:
      # Long term, we could continue traversing if we are confident in the LLM
      # choices.
      pass
    return top_props

  def get_traversed_entity_info(self):
    '''Retrieves information about entities traversed along specified paths.

    This method iterates through the selected paths defined in `self.path_store`. 
    It traverses these paths, starting at the keys which are dcids and paths are
    properties that should be fetched for each subsequent node. At each hop, all
    triples are fetched for each node.

    Returns:
        dict: A dictionary containing all triples of the traversed entities where
          - Keys are DCIDs
          - Values are dictionaries containing 'incoming' and
        'outgoing' properties, each of which is a list of triples.
          The dictionary *also* contains a key "property_descriptions" which is
        a description of the properties, taken from the path_store
        
        boolean: Whether the traversal terminated prematurely due to memory or 
          time limit.

        The structure of the returned dictionary is approximately:

        ```
        {
            "dcid1": {
                "incoming": {
                    "property1": [
                        {"dcid": "dcid2", "types": ["Type1"]},
                        {"dcid": "dcid3", "types": ["Type2"]}
                    ],
                    "property2": [...]
                },
                "outgoing": {
                    "property3": [
                        {"dcid": "dcid4", "types": ["Type3"]}
                    ],
                    ...
                }
            },
            "dcid2": { ... },
            ...
            "property_descriptions": {
                "property1": 'description of Property1',
                "property2": 'description of Property2',
            }
        }
        ```
    '''
    entity_info = {}
    start_time = time.time()

    paths_from_start = self.path_store.get_paths_from_start(
        only_selected_paths=True)
    entity_info.update(get_all_triples(list(paths_from_start.keys())))
    for start_dcid in paths_from_start:
      for path in paths_from_start[start_dcid]:
        exceeded_time_limit = time.time() - start_time > FETCH_ENTITIES_TIMEOUT
        exceeded_mem_limit = utils.get_dictionary_size_mb(
            entity_info) > MAX_ENTITY_INFO_SIZE_MB
        if exceeded_time_limit or exceeded_mem_limit:
          print('hello')
          print(exceeded_time_limit, exceeded_time_limit)
          terminated_prematurely = True
          return entity_info, terminated_prematurely

        dcids = [start_dcid]
        properties_in_path = Path.parse_property_and_type(path)
        for index, (prop, incoming_node_type) in enumerate(properties_in_path):

          next_dcids = set()
          for dcid in dcids:

            if incoming_node_type:
              incoming_prop_vals = entity_info.get(dcid,
                                                   {}).get('incoming',
                                                           {}).get(prop, [])
              incoming_dcids = [
                  node['dcid'] for node in incoming_prop_vals if
                  not is_terminal(node) and incoming_node_type in node['types']
              ]
              next_dcids.update(incoming_dcids)
            else:
              outgoing_prop_vals = entity_info.get(dcid,
                                                   {}).get('outgoing',
                                                           {}).get(prop, [])
              outgoing_dcids = [
                  node['dcid']
                  for node in outgoing_prop_vals
                  if not is_terminal(node)
              ]
              next_dcids.update(outgoing_dcids)

          # Only fetch triples for a given dcid one time.
          fetch_dcids = [dcid for dcid in next_dcids if dcid not in entity_info]
          is_not_last_hop = index < (len(properties_in_path) - 1)
          should_fetch_hop = is_not_last_hop or len(
              properties_in_path) < MAX_HOPS_TO_FETCH_ALL_TRIPLES
          if fetch_dcids and should_fetch_hop:
            entity_info.update(get_all_triples(fetch_dcids))
          dcids = list(next_dcids)

    # TODO: fetch *all* property descriptions, instead of the just path store's
    entity_info[
        'property_descriptions'] = self.path_store.get_property_descriptions()

    return entity_info, False
