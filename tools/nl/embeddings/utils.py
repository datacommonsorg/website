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
import datetime as datetime
import glob
import itertools
import logging
import os
from typing import Dict, List, Tuple
import shutil

import lancedb
import pandas as pd

from nl_server import config_reader
from nl_server import registry
from nl_server.config import Catalog
from nl_server.config import Env
from nl_server.embeddings import EmbeddingsModel
from shared.lib import gcs
import tempfile

EMBEDDINGS_FILE_NAME = 'embeddings.csv'

_COL_DCID = 'dcid'
_COL_SENTENCE = 'sentence'

_CHUNK_SIZE = 100
_NUM_RETRIES = 3
_LANCEDB_TABLE = 'datacommons'
_PREINDEX_CSV = '_preindex.csv'


class FileManager(object):

  def __init__(self, input_dir: str, output_dir: str):
    self._input_dir = input_dir
    self._output_dir = output_dir
    # Create a local dir to hold local input and output files
    self._local_dir = tempfile.mkdtemp()
    os.mkdir(os.path.join(self._local_dir, 'input'))
    os.mkdir(os.path.join(self._local_dir, 'output'))
    # Local input directory
    if gcs.is_gcs_path(input_dir):
      self._local_input_dir = os.path.join(self._local_dir, 'input')
      gcs.download_blob_by_path(input_dir, self._local_input_dir)
    else:
      self._local_input_dir = input_dir
    # Local output directory
    if gcs.is_gcs_path(output_dir):
      self._local_output_dir = os.path.join(self._local_dir, 'output')
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

  def preindex_csv(self):
    return os.path.join(self._local_input_dir, _PREINDEX_CSV)

  def maybe_upload_to_gcs(self):
    if gcs.is_gcs_path(self._input_dir):
      gcs.upload_by_path(self._local_input_dir, self._input_dir)
    if gcs.is_gcs_path(self._output_dir):
      gcs.upload_by_path(self._local_output_dir, self._output_dir)


def _chunk_list(data, chunk_size):
  it = iter(data)
  return iter(lambda: tuple(itertools.islice(it, chunk_size)), ())


def make_local_dir(source_folder: str, model_name: str) -> str:
  now = datetime.datetime.now()
  date_string = now.strftime('%Y_%m_%d_%H_%M_%S')
  local_folder_name = f'{source_folder}_{model_name}_{date_string}'
  local_dir_path = os.path.join('/tmp', local_folder_name)
  os.makedirs(local_dir_path, exist_ok=True)
  return local_dir_path


def get_model(catalog: Catalog, env: Env, model_name: str) -> EmbeddingsModel:
  logging.info("Loading model")
  model_config = catalog.models[model_name]
  if model_name in env.vertex_ai_models:
    vertex_ai_config = env.vertex_ai_models[model_name]
    model_config = config_reader.merge_vertex_ai_configs(
        model_config, vertex_ai_config)
  model = registry.create_model(model_config)
  return model


def build_preindex(fm: FileManager,
                   save: bool = False) -> Tuple[List[str], List[str]]:
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
  with open(fm.preindex_csv(), 'w+') as csvfile:
    if save:
      csv_writer = csv.writer(csvfile, delimiter=',')
      csv_writer.writerow([_COL_SENTENCE, _COL_DCID])
    for sentence in sorted(text2sv.keys()):
      dcids_str = ';'.join(sorted(text2sv[sentence]))
      texts.append(sentence)
      dcids.append(dcids_str)
      if save:
        csv_writer.writerow([sentence, dcids_str])
  return texts, dcids


def compute_embeddings(texts: List[str],
                       model: EmbeddingsModel) -> List[List[float]]:
  """
  Compute embeddings for a list of text strings.
  """
  logging.info("Compute embeddings")
  embeddings = []
  for i, chuck in enumerate(_chunk_list(texts, _CHUNK_SIZE)):
    logging.info('texts %d to %d', i * _CHUNK_SIZE, (i + 1) * _CHUNK_SIZE - 1)
    for i in range(_NUM_RETRIES):
      try:
        resp = model.encode(chuck)
        if len(resp) != len(chuck):
          raise Exception(f'Expected {len(chuck)} but got {len(resp)}')
        embeddings.extend(resp)
        break
      except Exception as e:
        logging.error('Exception %s', e)
  return embeddings


def save_embeddings_memory(local_dir: str, sentences: List[str],
                           dcids: List[str], embeddings: List[List[float]]):
  """
  Save embeddings as csv file.
  """
  df = pd.DataFrame(embeddings)
  df[_COL_DCID] = dcids
  df[_COL_SENTENCE] = sentences
  local_file = os.path.join(local_dir, EMBEDDINGS_FILE_NAME)
  df.to_csv(local_file, index=False)
  logging.info("Saved embeddings to %s", local_file)


def save_embeddings_lancedb(local_dir: str, sentences: List[str],
                            dcids: List[str], embeddings: List[List[float]]):
  db = lancedb.connect(local_dir)
  records = []
  for d, s, v in zip(dcids, sentences, embeddings):
    records.append({_COL_DCID: d, _COL_SENTENCE: s, 'vector': v})
  db.create_table(_LANCEDB_TABLE, records)
  logging.info("Saved embeddings as lancedb file in %s", local_dir)


def upload_to_gcs(local_dir: str, gcs_root: str):
  folder_name = os.path.basename(local_dir)
  gcs_path = os.path.join(gcs_root, folder_name)
  gcs.upload_by_path(local_dir, gcs_path)
