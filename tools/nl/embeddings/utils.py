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
class PreIndex:
  text: str
  dcid: str  # ';' concatenated dcids


@dataclass
class Embedding:
  preindex: PreIndex
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


def load_existing_embeddings(embeddings_path: str) -> List[Embedding]:
  """Load computed embeddings existing embeddings path."""
  try:
    if gcs.is_gcs_path(embeddings_path):
      embeddings_path = gcs.maybe_download(embeddings_path)
    df = pd.read_csv(embeddings_path)
    embeddings = []
    for _, row in df.iterrows():
      dcid = row['dcid']
      sentence = row['sentence']
      vector = row.drop(labels=['dcid', 'sentence']).astype(float).tolist()
      embeddings.append(Embedding(PreIndex(text=sentence, dcid=dcid), vector))
    return embeddings
  except Exception as e:
    logging.error(e)
    return []


def build_and_save_preindexes(fm: FileManager) -> List[PreIndex]:
  """
  Build preindex records from a directory of CSV files.
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

  preindexes = [
      PreIndex(text, ';'.join(sorted(dcids)))
      for text, dcids in text2sv.items()
  ]
  preindexes.sort(key=lambda x: x.text)

  # Write preindexes as CSV
  with open(fm.preindex_csv_path(), 'w') as csvfile:
    csv_writer = csv.writer(csvfile, delimiter=',')
    csv_writer.writerow([_COL_SENTENCE, _COL_DCID])
    for preindex in preindexes:
      csv_writer.writerow([preindex.text, preindex.dcid])

  # Write md5sum of preindexes as a file
  with open(os.path.join(fm.local_output_dir(), _MD5_SUM_FILE), 'w') as f:
    f.write(get_md5sum(fm.preindex_csv_path()))

  return preindexes


def compute_embeddings(
    model: EmbeddingsModel,
    preindexes: List[PreIndex],
    existing_embeddings: List[Embedding],
) -> List[Embedding]:
  """Compute embeddings for the given preindexes

  Args:
    model: The embeddings model object,
    preindexes: A list of preindex to compute embeddings for
    existing_embeddings: A list of embeddings from previous run.
  Return:
    A list of embeddings for the preindexes.
  """
  logging.info("Compute embeddings")
  logging.info("Preindex size: %d", len(preindexes))
  start = time.time()
  # Find preindex that are not in the existing embeddings
  existing_embeddings_map = {x.preindex.text: x for x in existing_embeddings}
  filtered_preindexes = [
      x for x in preindexes if x.text not in existing_embeddings_map
  ]
  logging.info("Size of preindexes to compute embeddings with model: %d",
               len(filtered_preindexes))
  # Compute embeddings with model inference
  result: List[Embedding] = []
  for i, chunk in enumerate(_chunk_list(filtered_preindexes, _CHUNK_SIZE)):
    logging.info('texts %d to %d', i * _CHUNK_SIZE, (i + 1) * _CHUNK_SIZE - 1)
    for i in range(_NUM_RETRIES):
      try:
        resp = model.encode([x.text for x in chunk])
        if len(resp) != len(chunk):
          raise Exception(f'Expected {len(chunk)} but got {len(resp)}')
        for i, vector in enumerate(resp):
          result.append(
              Embedding(PreIndex(chunk[i].text, chunk[i].dcid), vector))
        break
      except Exception as e:
        logging.error('Exception: %s', e)
  # Add existing embeddings
  for preindex in preindexes:
    if preindex.text in existing_embeddings_map:
      existing_embedding = existing_embeddings_map[preindex.text]
      # Only use the saved sentence vector. The dcid might be different.
      result.append(Embedding(preindex, existing_embedding.vector))
  result.sort(key=lambda x: x.preindex.text)
  logging.info(f'Computing embeddings took {time.time() - start} seconds')
  return result


def save_embeddings_memory(local_dir: str, embeddings: List[Embedding]):
  """
  Save embeddings as csv file.
  """
  df = pd.DataFrame([x.vector for x in embeddings])
  df[_COL_DCID] = [x.preindex.dcid for x in embeddings]
  df[_COL_SENTENCE] = [x.preindex.text for x in embeddings]
  local_file = os.path.join(local_dir, constants.EMBEDDINGS_FILE_NAME)
  df.to_csv(local_file, index=False)
  logging.info("Saved embeddings to %s", local_file)


def save_embeddings_lancedb(local_dir: str, embeddings: List[Embedding]):
  db = lancedb.connect(local_dir)
  records = [{
      _COL_DCID: x.preindex.dcid,
      _COL_SENTENCE: x.preindex.text,
      'vector': x.vector
  } for x in embeddings]
  db.create_table(_LANCEDB_TABLE, records)
  logging.info("Saved embeddings as lancedb file in %s", local_dir)


def save_index_config(fm: FileManager, index_config: IndexConfig):
  with open(fm.index_config_path(), 'w') as f:
    yaml.dump(asdict(index_config), f)
