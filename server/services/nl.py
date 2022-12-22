# Copyright 2022 Google LLC
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
"""Language Model client."""

from google.cloud import storage
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import semantic_search

import os
from requests.structures import CaseInsensitiveDict
import spacy
import torch
from datasets import load_dataset
import logging

BUILDS = ['demographics300', 'uncurated3000']
BUILD = 'uncurated3000'  #@param ['demographics300', 'uncurated3000']
GCS_BUCKET = 'datcom-csv'
EMBEDDINGS = 'embeddings/'
TEMP_DIR = '/tmp/'
MODEL_NAME = 'all-MiniLM-L6-v2'


class Model:
  """Holds clients for the language model"""

  def __init__(self, ner_model):
    self.model = SentenceTransformer(MODEL_NAME)
    self.ner_model = ner_model
    self.dataset_embeddings_maps = {}
    self._download_embeddings()
    self.dcid_maps = {}
    for build in BUILDS:
      logging.info('Loading build {}'.format(build))
      ds = load_dataset('csv',
                        data_files=os.path.join(TEMP_DIR,
                                                f'embeddings_{build}.csv'))
      df = ds["train"].to_pandas()
      self.dcid_maps[build] = df['dcid'].values.tolist()
      df = df.drop('dcid', axis=1)
      self.dataset_embeddings_maps[build] = torch.from_numpy(df.to_numpy()).to(
          torch.float)

  def _download_embeddings(self):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name=GCS_BUCKET)
    blobs = bucket.list_blobs(prefix=EMBEDDINGS)  # Get list of files
    for blob in blobs:
      _, filename = os.path.split(blob.name)
      blob.download_to_filename(os.path.join(TEMP_DIR, filename))  # Download

  def detect_svs(self, query):
    query_embeddings = self.model.encode([query])
    hits = semantic_search(query_embeddings,
                           self.dataset_embeddings_maps[BUILD],
                           top_k=15)

    # Note: multiple results may map to the same DCID. As well, the same string may
    # map to multiple DCIDs with the same score.
    sv2score = {}
    score2svs = {}
    for e in hits[0]:
      for d in self.dcid_maps[BUILD][e['corpus_id']].split(','):
        s = e['score']
        # Prefer the top score.
        if d not in sv2score:
          sv2score[d] = s
          if s not in score2svs:
            score2svs[s] = [d]
          else:
            score2svs[s].append(d)

    # Sort by scores
    scores = [s for s in sorted(score2svs.keys(), reverse=True)]
    svs = [' : '.join(score2svs[s]) for s in scores]
    return {'SV': svs, 'CosineScore': scores}

  def detect_place(self, query):
    doc = self.ner_model(query)
    places_found = []
    for e in doc.ents:
      if e.label_ in ["GPE", "LOC"]:
        places_found.append(str(e))

    return places_found
