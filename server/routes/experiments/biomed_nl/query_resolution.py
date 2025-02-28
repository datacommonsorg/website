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


def sample_dcids_by_type(dcids):
  """Samples a set of DCIDs such that all unique types of the original DCID list
  are present in the sample.

  Args:
    dcids: A list of DCIDs to sample from.

  Returns:
    A list of tuples, where each tuple contains:
      - A DCID.
      - A list of types associated with that DCID.
  """
  get_types_response = fetch.raw_property_values(dcids, 'typeOf')

  # Create a set of all types from across all of the dcids that match an entity.
  remaining_unique_types = {
      type_node['name']
      for type_nodes in get_types_response.values()
      for type_node in type_nodes
  }

  sampled_dcids_and_types = []
  for dcid in dcids:
    dcid_types = list(
        {node_type['name'] for node_type in get_types_response.get(dcid, [])})

    if any(dcid_type in remaining_unique_types for dcid_type in dcid_types):
      remaining_unique_types.difference_update(set(dcid_types))
      sampled_dcids_and_types.append((dcid, dcid_types))
    elif not remaining_unique_types:
      sampled_dcids_and_types.append((dcid, dcid_types))
      if len(sampled_dcids_and_types) >= MIN_SAMPLES:
        break

  return sampled_dcids_and_types


def find_entities_from_query(query):
  """Searches the DC KG for entities from the query and returns each recognized
  entity's DCID and types.

  Args:
    query: The query string to process.

  Returns:
    A dictionary where:
      - Keys are the substring from the query that found a match in DC KG.
      - Values are lists of tuples, each tuple containing:
        - A DCID.
        - A list of types associated with that DCID.
  """
  recognize_response = dc.recognize_entities(query)

  result = {}
  for item in recognize_response:
    queried_entity = item['span']

    dcids = [
        entity['dcid']
        for entity in item.get('entities', [])
        if 'dcid' in entity
    ]

    if not dcids:
      continue

    result[queried_entity] = sample_dcids_by_type(dcids)

  return result


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
        entity.lower(), f"[{entity} (typeOf: {','.join(types)})]")
  return annotated_query


def identify_query_traversal_start(query):
  """Determines which DC KG entities to begin a graph traversal to answer the given query.

  This function takes a user query, finds matching DC KG entities, and uses
  a language model to rank those entities based on their relevance to the
  query. It then returns the mapping of entities to DCIDs, the selected
  entities, and an annotated version of the query.

  Args:
    query: The user query string.

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
  recognized_entities = find_entities_from_query(query)
  entities_to_recognized_types = {
      entity_str:
          list({dc_type for _, types in dcids_and_types for dc_type in types})
      for entity_str, dcids_and_types in recognized_entities.items()
  }
  entities_to_dcids = {
      entity_str: [dcid for dcid, _ in dcids_and_types]
      for entity_str, dcids_and_types in recognized_entities.items()
  }

  prompt = utils.ENTITY_RANK_PROMPT.format(QUERY=query,
                                           ENTS=entities_to_recognized_types)

  #   response = gemini_model.generate_content(prompt)
  response = None
  response_token_counts = utils.get_gemini_response_token_counts(response)
  response_text = response.text

  if response_text.startswith('NONE'):
    return None, None, None, response_token_counts

  selected_entities = response_text.strip('```\n').split('\n\n')[0].split('\n')
  annotated_query = annotate_query_with_types(query,
                                              entities_to_recognized_types)

  return (entities_to_dcids, selected_entities, annotated_query,
          response_token_counts)
