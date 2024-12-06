# Copyright 2024 Google LLC
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
"""
Given a topics mcf, this script generates a topic cache json and a NL descriptions CSV.
"""

import csv
from dataclasses import dataclass
from dataclasses import field
import json
import logging

from absl import app
from absl import flags
import requests

PARSER = 'mcf_parser.py'
PARSER_URL = f'https://raw.githubusercontent.com/datacommonsorg/import/master/simple/kg_util/{PARSER}'

_ID = 'ID'
_DCID = 'dcid'

_PREDICATE_TYPE_OF = "typeOf"
_PREDICATE_NAME = "name"
_PREDICATE_SEARCH_DESCRIPTION = "searchDescription"
_PREDICATE_RELEVANT_VARIABLE = "relevantVariable"
_PREDICATE_RELEVANT_VARIABLE_LIST = "relevantVariableList"
_PREDICATE_MEMBER = "member"
_PREDICATE_MEMBER_LIST = "memberList"
_TYPE_TOPIC = 'Topic'

_DCID_COL = "dcid"
_SENTENCE_COL = "sentence"
_SENTENCE_SEPARATOR = ";"

FLAGS = flags.FLAGS

flags.DEFINE_string('topics_mcf_file', 'sdg_topics.mcf',
                    'MCF file that the topic nodes are read from')
flags.DEFINE_string('topic_cache_file', 'sdg_topic_cache.json',
                    'JSON file that the topic cache is written to')
flags.DEFINE_string('topic_sentences_file', 'sheets_svs.csv',
                    'CSV file that the topic sentences are written to')

logging.getLogger().setLevel(logging.INFO)


@dataclass
class Triple:
  subject_id: str
  predicate: str
  object_id: str = ""
  object_value: str = ""


@dataclass
class TopicCacheNode:
  dcid: str
  types: list[str] = field(default_factory=list)
  names: list[str] = field(default_factory=list)
  relevantVariables: list[str] = field(default_factory=list)
  members: list[str] = field(default_factory=list)

  def _csv_to_list(self, csv: str) -> list[str]:
    return [item.strip() for item in csv.split(',')]

  def maybe_add(self, triple: Triple):
    if triple.predicate == _PREDICATE_TYPE_OF:
      self.types.append(triple.object_id)
    elif triple.predicate == _PREDICATE_NAME:
      self.names.append(triple.object_value)
    elif triple.predicate == _PREDICATE_RELEVANT_VARIABLE:
      self.relevantVariables.append(triple.object_id)
    elif triple.predicate == _PREDICATE_RELEVANT_VARIABLE_LIST:
      self.relevantVariables.extend(self._csv_to_list(triple.object_value))
    elif triple.predicate == _PREDICATE_MEMBER:
      self.members.append(triple.object_id)
    elif triple.predicate == _PREDICATE_MEMBER_LIST:
      self.members.extend(self._csv_to_list(triple.object_value))

  def json(self) -> dict[str, any]:
    result: dict[str, any] = {}
    result["dcid"] = [self.dcid]
    if self.types:
      result["typeOf"] = self.types
    if self.names:
      result["name"] = self.names
    if self.relevantVariables:
      result["relevantVariableList"] = self.relevantVariables
    if self.members:
      result["memberList"] = self.members
    return result


@dataclass
class SentenceCandidates:
  name: str = ""
  searchDescriptions: list[str] = field(default_factory=list)

  def maybe_add(self, triple: Triple):
    if triple.predicate == _PREDICATE_SEARCH_DESCRIPTION:
      self.searchDescriptions.append(triple.object_value)
    elif triple.predicate == _PREDICATE_NAME:
      self.name = triple.object_value

  def sentences(self) -> str:
    sentences: list[str] = []

    if self.searchDescriptions:
      sentences = self.searchDescriptions
    elif self.name:
      sentences = [self.name]

    return _SENTENCE_SEPARATOR.join(sentences)


def generate_nl_sentences(triples: list[Triple], topic_sentences_file: str):
  """Generates NL sentences based on name and searchDescription triples.

  This method should only be called for triples of types for which NL sentences
  should be generated. Currently it is Topic.

  This method does not do the type checks itself and the onus is on the caller
  to filter triples.

  The dcids and sentences are written to a CSV using the specified File.
  """

  dcid2candidates: dict[str, SentenceCandidates] = {}
  for triple in triples:
    dcid2candidates.setdefault(triple.subject_id,
                               SentenceCandidates()).maybe_add(triple)

  rows = []
  for dcid, candidates in dcid2candidates.items():
    sentences = candidates.sentences()
    if not sentences:
      logging.warning("No NL sentences generated for DCID: %s", dcid)
      continue
    rows.append({_DCID_COL: dcid, _SENTENCE_COL: sentences})

  logging.info("Writing %s NL sentences to: %s", len(rows),
               topic_sentences_file)

  with open(topic_sentences_file, 'w', newline='') as fw:
    writer = csv.DictWriter(fw, fieldnames=[_DCID_COL, _SENTENCE_COL])
    writer.writeheader()
    writer.writerows(rows)


def generate_topic_cache(triples: list[Triple], topic_cache_file: str):
  """Generates topic cache based on Topic and StatVarPeerGroup triples.

  This method should only be called for triples of types for which topic cache
  should be generated (Topic and StatVarPeerGroup).

  This method does not do the type checks itself and the onus is on the caller
  to filter triples.

  The topic cache is written to the specified topic_cache_file.
  """

  dcid2nodes: dict[str, TopicCacheNode] = {}
  for triple in triples:
    dcid2nodes.setdefault(triple.subject_id,
                          TopicCacheNode(triple.subject_id)).maybe_add(triple)

  nodes = []
  for node in dcid2nodes.values():
    nodes.append(node.json())

  result = {"nodes": nodes}
  logging.info("Writing %s topic cache nodes to: %s", len(nodes),
               topic_cache_file)
  with open(topic_cache_file, 'w') as fw:
    json.dump(result, fw, indent=1)


def mcf_to_triples(mcf_file: str) -> list[Triple]:
  with open(PARSER, 'w') as fw:
    fw.write(requests.get(PARSER_URL).text)
  import mcf_parser as mcflib

  parser_triples: list[list[str]] = []
  # DCID references
  local2dcid: dict[str, str] = {}
  with open(mcf_file, 'r') as f:
    for parser_triple in mcflib.mcf_to_triples(f):
      [subject_id, predicate, value, _] = parser_triple
      if predicate == _DCID:
        local2dcid[subject_id] = value
      else:
        parser_triples.append(parser_triple)

    triples = list(map(lambda x: _to_triple(x, local2dcid), parser_triples))

    logging.info("Read %s triples from: %s", len(triples), mcf_file)
    return triples


def _to_triple(parser_triple: list[str], local2dcid: dict[str, str]) -> Triple:
  [subject_id, _predicate, value, value_type] = parser_triple

  if subject_id not in local2dcid:
    raise ValueError(f"dcid not specified for node: {subject_id}")

  subject_id = local2dcid[subject_id]
  if value_type == _ID:
    return Triple(subject_id, _predicate, object_id=value)
  else:
    return Triple(subject_id, _predicate, object_value=value)


def _filter_triples_by_type(triples: list[Triple],
                            type_of: str) -> list[Triple]:
  filter_dcids = set()
  for triple in triples:
    if triple.predicate == _PREDICATE_TYPE_OF and triple.object_id == type_of:
      filter_dcids.add(triple.subject_id)

  return list(filter(lambda triple: triple.subject_id in filter_dcids, triples))


def main(_):
  triples = mcf_to_triples(FLAGS.topics_mcf_file)
  generate_topic_cache(triples, FLAGS.topic_cache_file)
  topic_triples = _filter_triples_by_type(triples, _TYPE_TOPIC)
  generate_nl_sentences(topic_triples, FLAGS.topic_sentences_file)


if __name__ == "__main__":
  app.run(main)
