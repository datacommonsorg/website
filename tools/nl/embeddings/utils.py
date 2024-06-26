# Copyright 2023 Google LLC
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
"""Common Utility functions for Embeddings."""

import csv
from dataclasses import asdict
from dataclasses import dataclass
import datetime as datetime
import glob
import hashlib
import itertools
import logging
import os
import time
from typing import Dict, List

import lancedb
import pandas as pd
import yaml

from nl_server import config_reader
from nl_server import registry
from nl_server.config import Catalog
from nl_server.config import Env
from nl_server.config import IndexConfig
from nl_server.embeddings import EmbeddingsModel
from shared.lib import constants
from shared.lib import gcs
from tools.nl.embeddings.file_manager import FileManager

_COL_DCID = 'dcid'
_COL_SENTENCE = 'sentence'
_CHUNK_SIZE = 100
_NUM_RETRIES = 3
_LANCEDB_TABLE = 'datacommons'
_MD5_SUM_FILE = 'md5sum.txt'


@dataclass
class SentenceObject:
  text: str
  dcid: str  # ';' concatenated dcids
  vector: List[float]


def _chunk_list(data, chunk_size):
  it = iter(data)
  return iter(lambda: tuple(itertools.islice(it, chunk_size)), ())


def get_md5sum(file_path: str) -> str:
  with open(file_path, 'r') as f:
    return hashlib.md5(f.read().encode('utf-8')).hexdigest()


def get_model(catalog: Catalog, env: Env, model_name: str) -> EmbeddingsModel:
  logging.info("Loading model")
  model_config = catalog.models[model_name]
  if model_name in env.vertex_ai_models:
    vertex_ai_config = env.vertex_ai_models[model_name]
    model_config = config_reader.merge_vertex_ai_configs(
        model_config, vertex_ai_config)
  model = registry.create_model(model_config)
  return model


def get_saved_embeddings(embeddings_path: str) -> List[SentenceObject]:
  """Load saved embeddings from a CSV file."""
  try:
    if gcs.is_gcs_path(embeddings_path):
      embeddings_path = gcs.maybe_download(embeddings_path)
    df = pd.read_csv(embeddings_path)
    sentences = []
    for _, row in df.iterrows():
      dcid = row['dcid']
      sentence = row['sentence']
      vector = row.drop(labels=['dcid', 'sentence']).astype(float).tolist()
      sentences.append(SentenceObject(text=sentence, dcid=dcid, vector=vector))
    return sentences
  except Exception as e:
    logging.error(e)
    return []


def build_and_save_preindex(fm: FileManager) -> List[SentenceObject]:
  """
  Build preindex records (text -> dcid) from a directory of CSV files.
  """
  text2sv: Dict[str, set[str]] = {}
  for file_name in glob.glob(fm.local_input_dir() + "/[!_]*.csv"):
    with open(file_name) as f:
      reader = csv.DictReader(f)
      for row in reader:
        texts = row[_COL_SENTENCE].split(';')
        for text in texts:
          text = text.strip()
          if text == '':
            continue
          if text not in text2sv:
            text2sv[text] = set()
          text2sv[text].add(row[_COL_DCID])

  sentences = [
      SentenceObject(text, ';'.join(sorted(dcids)), [])
      for text, dcids in text2sv.items()
  ]
  sentences.sort(key=lambda x: x.text)

  # Write preindex as CSV
  with open(fm.preindex_csv_path(), 'w') as csvfile:
    csv_writer = csv.writer(csvfile, delimiter=',')
    csv_writer.writerow([_COL_SENTENCE, _COL_DCID])
    for sentence in sentences:
      csv_writer.writerow([sentence.text, sentence.dcid])

  # Write md5sum of preindex as a file
  with open(os.path.join(fm.local_output_dir(), _MD5_SUM_FILE), 'w') as f:
    f.write(get_md5sum(fm.preindex_csv_path()))

  return sentences


def retrieve_embeddings(
    model: EmbeddingsModel,
    target_sentences: List[SentenceObject],
    saved_sentences: List[SentenceObject],
) -> List[SentenceObject]:
  """Compute embeddings for a list of sentence objects"""
  logging.info("Compute embeddings")
  logging.info("Target sentences: %d", len(target_sentences))
  start = time.time()
  # Find sentences that are not in saved_sentences
  saved_text2sentence = {x.text: x for x in saved_sentences}
  filtered_sentences = [
      x for x in target_sentences if x.text not in saved_text2sentence
  ]
  logging.info("Filtered sentences to compute embeddings with model: %d",
               len(filtered_sentences))
  # Compute embeddings with model inference
  result: List[SentenceObject] = []
  for i, chunk in enumerate(_chunk_list(filtered_sentences, _CHUNK_SIZE)):
    logging.info('texts %d to %d', i * _CHUNK_SIZE, (i + 1) * _CHUNK_SIZE - 1)
    for i in range(_NUM_RETRIES):
      try:
        resp = model.encode([x.text for x in chunk])
        if len(resp) != len(chunk):
          raise Exception(f'Expected {len(chunk)} but got {len(resp)}')
        for i in enumerate(resp):
          result.append(SentenceObject(chunk[i].text, chunk[i].dcid, resp[i]))
        break
      except Exception as e:
        logging.error('Exception %s', e)
  # Add saved sentences
  for sentence in target_sentences:
    if sentence.text in saved_text2sentence:
      saved_sentence = saved_text2sentence[sentence.text]
      # Note only use the saved sentence vector. The dcid might be different.
      result.append(
          SentenceObject(sentence.text, sentence.dcid, saved_sentence.vector))
  result.sort(key=lambda x: x.dcid)
  logging.info(f'Computing embeddings took {time.time() - start} seconds')
  return result


def save_embeddings_memory(local_dir: str, sentences: List[SentenceObject]):
  """
  Save embeddings as csv file.
  """
  df = pd.DataFrame([x.vector for x in sentences])
  df[_COL_DCID] = [x.dcid for x in sentences]
  df[_COL_SENTENCE] = [x.text for x in sentences]
  local_file = os.path.join(local_dir, constants.EMBEDDINGS_FILE_NAME)
  df.to_csv(local_file, index=False)
  logging.info("Saved embeddings to %s", local_file)


def save_embeddings_lancedb(local_dir: str, sentences: List[SentenceObject]):
  db = lancedb.connect(local_dir)
  records = [{
      _COL_DCID: x.dcid,
      _COL_SENTENCE: x.text,
      'vector': x.vector
  } for x in sentences]
  db.create_table(_LANCEDB_TABLE, records)
  logging.info("Saved embeddings as lancedb file in %s", local_dir)


def save_index_config(fm: FileManager, index_config: IndexConfig):
  with open(fm.index_config_path(), 'w') as f:
    yaml.dump(asdict(index_config), f)
