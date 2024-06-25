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
import datetime as datetime
import glob
import hashlib
import itertools
import logging
import os
import shutil
import tempfile
import time
from typing import Dict, List, Tuple

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

_COL_DCID = 'dcid'
_COL_SENTENCE = 'sentence'

_CHUNK_SIZE = 100
_NUM_RETRIES = 3
_LANCEDB_TABLE = 'datacommons'
_PREINDEX_CSV = '_preindex.csv'
_INDEX_CONFIG_YAML = 'index_config.yaml'


class FileManager(object):

  def __init__(self, input_dir: str, output_dir: str):
    # Add trailing '/' if not present
    self._input_dir = os.path.join(input_dir, '')
    self._output_dir = os.path.join(output_dir, '')
    # Create a local dir to hold local input and output files
    self._local_dir = tempfile.mkdtemp()

    # Set local input directory
    if gcs.is_gcs_path(self._input_dir):
      self._local_input_dir = os.path.join(self._local_dir, 'input')
      os.mkdir(self._local_input_dir)
      gcs.download_blob_by_path(self._input_dir, self._local_input_dir)
    else:
      self._local_input_dir = self._input_dir

    # Set local output directory
    if gcs.is_gcs_path(output_dir):
      self._local_output_dir = os.path.join(self._local_dir, 'output')
      os.mkdir(self._local_output_dir)
    else:
      self._local_output_dir = output_dir

  def __del__(self):
    shutil.rmtree(self._local_dir)

  def local_input_dir(self):
    return self._local_input_dir

  def local_output_dir(self):
    return self._local_output_dir

  def output_dir(self):
    return self._output_dir

  def preindex_csv_path(self):
    return os.path.join(self._local_input_dir, _PREINDEX_CSV)

  def index_config_path(self):
    return os.path.join(self._local_output_dir, _INDEX_CONFIG_YAML)

  def maybe_upload_to_gcs(self):
    """
    Upload the generated files to GCS if the input or output paths are GCS.
    """
    if gcs.is_gcs_path(self._input_dir):
      # This is to upload any generated files in the input directory to GCS
      gcs.upload_by_path(self._local_input_dir, self._input_dir)
    if gcs.is_gcs_path(self._output_dir):
      gcs.upload_by_path(self._local_output_dir, self._output_dir)


def _chunk_list(data, chunk_size):
  it = iter(data)
  return iter(lambda: tuple(itertools.islice(it, chunk_size)), ())


def get_model(catalog: Catalog, env: Env, model_name: str) -> EmbeddingsModel:
  logging.info("Loading model")
  model_config = catalog.models[model_name]
  if model_name in env.vertex_ai_models:
    vertex_ai_config = env.vertex_ai_models[model_name]
    model_config = config_reader.merge_vertex_ai_configs(
        model_config, vertex_ai_config)
  model = registry.create_model(model_config)
  return model


def build_and_save_preindex(fm: FileManager) -> Tuple[List[str], List[str]]:
  """
  Build preindex records (sentence -> dcid) from a directory of CSV files.
  """
  text2sv: Dict[str, set[str]] = {}
  for file_name in glob.glob(fm.local_input_dir() + "/[!_]*.csv"):
    with open(file_name) as f:
      reader = csv.DictReader(f)
      for row in reader:
        sentences = row[_COL_SENTENCE].split(';')
        for sentence in sentences:
          if sentence not in text2sv:
            text2sv[sentence] = set()
          text2sv[sentence].add(row[_COL_DCID])
  texts = []
  dcids = []
  # Write preindex as CSV
  with open(fm.preindex_csv_path(), 'w') as csvfile:
    csv_writer = csv.writer(csvfile, delimiter=',')
    csv_writer.writerow([_COL_SENTENCE, _COL_DCID])
    for sentence in sorted(text2sv.keys()):
      dcids_str = ';'.join(sorted(text2sv[sentence]))
      texts.append(sentence)
      dcids.append(dcids_str)
      csv_writer.writerow([sentence, dcids_str])
  # Write md5sum of preindex as a file
  with open(fm.preindex_csv_path()) as fin:
    with open(os.path.join(fm.local_output_dir(), 'md5sum.txt'), 'w') as fout:
      fout.write(hashlib.md5(fin.read().encode('utf-8')).hexdigest())
  return texts, dcids


def compute_embeddings(texts: List[str],
                       model: EmbeddingsModel) -> List[List[float]]:
  """
  Compute embeddings for a list of text strings.
  """
  logging.info("Compute embeddings")
  start = time.time()
  embeddings = []
  for i, chunk in enumerate(_chunk_list(texts, _CHUNK_SIZE)):
    logging.info('texts %d to %d', i * _CHUNK_SIZE, (i + 1) * _CHUNK_SIZE - 1)
    for i in range(_NUM_RETRIES):
      try:
        resp = model.encode(chunk)
        if len(resp) != len(chunk):
          raise Exception(f'Expected {len(chunk)} but got {len(resp)}')
        embeddings.extend(resp)
        break
      except Exception as e:
        logging.error('Exception %s', e)
  logging.info(f'Computing embeddings took {time.time() - start} seconds')
  return embeddings


# TODO(shifucun): Put sentence, dcid and embeddings in one object
def save_embeddings_memory(local_dir: str, sentences: List[str],
                           dcids: List[str], embeddings: List[List[float]]):
  """
  Save embeddings as csv file.
  """
  # All the input should have the same length and with elements index aligned.
  assert len(embeddings) == len(dcids) == len(sentences)
  df = pd.DataFrame(embeddings)
  df[_COL_DCID] = dcids
  df[_COL_SENTENCE] = sentences
  local_file = os.path.join(local_dir, constants.EMBEDDINGS_FILE_NAME)
  df.to_csv(local_file, index=False)
  logging.info("Saved embeddings to %s", local_file)


def save_embeddings_lancedb(local_dir: str, sentences: List[str],
                            dcids: List[str], embeddings: List[List[float]]):
  # All the input should have the same length and with elements index aligned.
  assert len(embeddings) == len(dcids) == len(sentences)
  db = lancedb.connect(local_dir)
  records = []
  for d, s, v in zip(dcids, sentences, embeddings):
    records.append({_COL_DCID: d, _COL_SENTENCE: s, 'vector': v})
  db.create_table(_LANCEDB_TABLE, records)
  logging.info("Saved embeddings as lancedb file in %s", local_dir)


def save_index_config(fm: FileManager, index_config: IndexConfig):
  with open(fm.index_config_path(), 'w') as f:
    yaml.dump(asdict(index_config), f)
