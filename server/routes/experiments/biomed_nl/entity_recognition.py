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
'''Recognizes DC KG entities from a NL query.'''
from google import genai

import server.lib.fetch as fetch
import server.routes.experiments.biomed_nl.utils as utils
import server.services.datacommons as dc

MIN_SAMPLES = 3


def sanitize_query(query):
  """Sanitizes a query string for better search results.

  Removes question marks, replaces commas with spaces, and strips apostrophes
  from possessive words.

  Args:
    query: The query string to sanitize.

  Returns:
    The sanitized query string.

  TODO: Replace this with an LLM call that instead identifies entities in the
        query and suggests alternative names
  """
  query = query.replace('?', '')
  query = query.replace(', ', ' ')
  for word in set(query.split(' ')):
    if word.endswith("'s"):
      query = query.replace(word, word[:-2])
  return query


def sample_dcids_by_type(dcids, min_sample_size):
  """Samples a set of DCIDs such that all unique types of the original DCID list
  are present in the sample.

  Args:
    dcids: A list of DCIDs to sample from.
    min_sample_size: The minimum number of DCIDs expected in the sample. This is
      ignored if original list of dcids is smaller.

  Returns:
    A tuple of:
      - The sample list of DCIDs.
      - The list of types represented by those DCIDs.
  """
  get_types_response = fetch.raw_property_values(dcids, 'typeOf')

  # Create a set of all types from across all of the dcids that match an entity.
  remaining_unique_types = {
      type_node['name']
      for type_nodes in get_types_response.values()
      for type_node in type_nodes
      if 'name' in type_node
  }

  unique_types = list(remaining_unique_types)

  sample_dcids = []
  first_pass_skipped = []
  for dcid in dcids:
    dcid_types = [
        node_type.get('name', '')
        for node_type in get_types_response.get(dcid, [])
    ]

    if any(dcid_type in remaining_unique_types for dcid_type in dcid_types):
      # Remove the types of the sampled dcid from the set of unique types that
      # needs to be added to the set since they are now represented in the
      # sample set.
      remaining_unique_types.difference_update(dcid_types)
      sample_dcids.append(dcid)
    elif not remaining_unique_types:
      sample_dcids.append(dcid)
      if len(sample_dcids) >= min_sample_size:
        break
    else:
      first_pass_skipped.append(dcid)

  # If some dcids were skipped in the first pass to find all unique types, but
  # the current sample size does not exceed the expected min, add some of the
  # skipped dcids into the sampling.
  num_skipped_samples_to_add = min_sample_size - len(sample_dcids)
  if num_skipped_samples_to_add > 0:
    sample_dcids.extend(first_pass_skipped[:num_skipped_samples_to_add])

  return sample_dcids, unique_types


def recognize_entities_from_query(query):
  """Searches the DC KG for entities from the query to extract each entity's DCID
  and types.

  Args:
    query: The query string to process.

  Returns:
    A tuple containing two dictionaries:
      - entities_to_dcids: A dictionary where keys are recognized entity spans
        (strings) and values are lists of corresponding DCIDs (strings).
      - entities_to_recognized_types: A dictionary where keys are recognized
        entity spans (strings) and values are lists of associated types
        (strings).
  """
  recognize_response = dc.recognize_entities(query)
  entities_to_dcids = {}
  entities_to_recognized_types = {}
  for item in recognize_response:
    queried_entity = item['span']

    dcids = [
        entity['dcid']
        for entity in item.get('entities', [])
        if 'dcid' in entity
    ]

    if not dcids:
      continue

    dcids, types = sample_dcids_by_type(dcids, MIN_SAMPLES)
    entities_to_dcids[queried_entity] = dcids
    entities_to_recognized_types[queried_entity] = types

  return entities_to_dcids, entities_to_recognized_types


def annotate_query_with_types(query, entities_to_types):
  """Augments the query by providing the type of the entity in DC KG.

  This function replaces each entity in the query with an annotated version that
  includes the entity name and its types enclosed in square brackets.

  Args:
    query: The input query string.
    entities_to_types: A dictionary mapping entities to a list of their types.

  Returns:
    The annotated query string.
  """
  annotated_query = query.lower()
  for entity, types in entities_to_types.items():
    annotated_query = annotated_query.replace(
        entity.lower(), f"[{entity} (typeOf: {', '.join(sorted(types))})]")
  return annotated_query


def get_traversal_start_entities(query, gemini_client):
  """Determines which DC KG entities to begin a graph traversal to answer the given query.

  This function takes a user query, finds matching DC KG entities, and uses
  a language model to rank those entities based on their relevance to the
  query. It then returns the mapping of entities to DCIDs, the selected
  entities, and an annotated version of the query.

  Args:
    query: The user query string.
    gemini_client: A Gemini client object with pre-configured API key.

  Returns:
    A tuple containing the following:
      - entities_to_dcids: A dictionary mapping recognized entity strings to 
        lists of DCIDs.
      - selected_entities: A list of entity strings that were selected as
        most relevant to the query.
      - annotated_query: The original query string annotated with entity
        types.
      - response_token_counts: Token counts associated with the language
        model's response.

    If the language model returns "NONE", the function returns:
      - None, None, None, response_token_counts
  """

  query = sanitize_query(query)
  entities_to_dcids, entities_to_recognized_types = recognize_entities_from_query(
      query)

  prompt = utils.ENTITY_RANK_PROMPT.format(QUERY=query,
                                           ENTS=entities_to_recognized_types)

  response = gemini_client.models.generate_content(model='gemini-2.0-flash-001',
                                                   contents=prompt)
  response_token_counts = utils.get_gemini_response_token_counts(response)
  response_text = response.text

  if response_text.startswith('NONE'):
    return {}, [], '', response_token_counts

  selected_entities = response_text.strip('```\n').split('\n\n')[0].split('\n')
  annotated_query = annotate_query_with_types(query,
                                              entities_to_recognized_types)

  return (entities_to_dcids, selected_entities, annotated_query,
          response_token_counts)
