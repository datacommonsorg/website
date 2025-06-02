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

import server.lib.fetch as fetch
import server.routes.experiments.biomed_nl.utils as utils
import server.services.datacommons as dc

MIN_SAMPLES = 3


def sample_dcids_by_type(entity_name, dcids, min_sample_size):
  """Samples a set of DCIDs such that all unique types of the original DCID list
  are present in the sample.

  Args:
    entity_name: The name of the entity whose dcids are being sampled
    dcids: A list of DCIDs to sample from.
    min_sample_size: The minimum number of DCIDs expected in the sample. This is
      ignored if original list of dcids is smaller.

  Returns:
    A list of GraphEntity objects representing the sampled DCIDs.
  """
  get_types_response = fetch.raw_property_values(dcids, 'typeOf')

  # Create a set of all types from across all of the dcids that match an entity.
  remaining_unique_types = {
      type_node['name']
      for type_nodes in get_types_response.values()
      for type_node in type_nodes
      if 'name' in type_node
  }

  graph_entities = []
  first_pass_skipped_entities = []

  for dcid in dcids:
    dcid_types = [
        node_type.get('name', '')
        for node_type in get_types_response.get(dcid, [])
    ]
    dcid_types = list(set(dcid_types))

    if any(dcid_type in remaining_unique_types for dcid_type in dcid_types):
      # Remove the types of the sampled dcid from the set of unique types that
      # needs to be added to the set since they are now represented in the
      # sample set.
      remaining_unique_types.difference_update(dcid_types)
      graph_entities.append(
          utils.GraphEntity(dcid=dcid, types=dcid_types, name=entity_name))
    elif not remaining_unique_types:
      graph_entities.append(
          utils.GraphEntity(dcid=dcid, types=dcid_types, name=entity_name))

      if len(graph_entities) >= min_sample_size:
        break
    else:
      first_pass_skipped_entities.append(
          utils.GraphEntity(dcid=dcid, types=dcid_types, name=entity_name))

  # If some dcids were skipped in the first pass to find all unique types, but
  # the current sample size does not exceed the expected min, add some of the
  # skipped dcids into the sampling.
  num_skipped_samples_to_add = min_sample_size - len(graph_entities)
  if num_skipped_samples_to_add > 0:
    graph_entities.extend(
        first_pass_skipped_entities[:num_skipped_samples_to_add])
  return graph_entities


def recognize_entities_from_query(query):
  """Searches the DC KG for entities from the query to extract each entity's DCID
  and types.

  Args:
    query: The query string to process.

  Returns:
    A list of sampled GraphEntity objects that were detected in the query.
  """
  recognize_response = dc.recognize_entities(query)

  detected_entities = []
  for item in recognize_response:
    queried_entity = item['span']

    dcids = [
        entity['dcid']
        for entity in item.get('entities', [])
        if 'dcid' in entity
    ]

    if not dcids:
      continue

    entities = sample_dcids_by_type(queried_entity, dcids, MIN_SAMPLES)
    detected_entities.extend(entities)
  return detected_entities


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
