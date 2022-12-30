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

from lib.nl_training import NLQueryClassificationData, NLQueryClassificationModel
from typing import Dict, List
import os
import pandas as pd
import torch
from datasets import load_dataset
import logging

BUILDS = [
    'demographics300', 'uncurated3000', 'demographics300-withpalmalternatives',
    'combined_all'
]
GCS_BUCKET = 'datcom-csv'
EMBEDDINGS = 'embeddings/'
TEMP_DIR = '/tmp/'
MODEL_NAME = 'all-MiniLM-L6-v2'


def pick_best(probs):
  """Whether to pick the most probable label or not."""
  sorted_probs = sorted(probs, reverse=True)

  # If the top two labels only differ by about 10%, we cannot be sure.
  if (sorted_probs[0] - sorted_probs[1]) > 0.1 * sorted_probs[0]:
    return True
  return False


def pick_option(class_model, q, categories):
  """Return the assigned label or Inconclusive."""
  probs = class_model.predict_proba([q])[0]
  if pick_best(probs):
    return categories[class_model.predict([q])[0]]
  else:
    return "Inconclusive."


class Model:
  """Holds clients for the language model"""

  def __init__(self, ner_model,
               query_classification_data: Dict[str, NLQueryClassificationData],
               classification_types_supported: List[str]):
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

    # Classification models and training.
    self.classification_models: Dict[str, NLQueryClassificationModel] = {}
    self._classification_data_to_models(query_classification_data,
                                        classification_types_supported)

  def _download_embeddings(self):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name=GCS_BUCKET)
    blobs = bucket.list_blobs(prefix=EMBEDDINGS)  # Get list of files
    for blob in blobs:
      _, filename = os.path.split(blob.name)
      blob.download_to_filename(os.path.join(TEMP_DIR, filename))  # Download

  def _train_classifier(self, categories, input_sentences):
    """Encode each sentence to get "features" and associated "labels"."""
    sentences = []
    labels = []
    for cat in categories:
      for s in input_sentences[cat]:
        sentences.append(s)
        labels.append(str(cat))

    embeddings = self.model.encode(sentences, show_progress_bar=True)
    embeddings = pd.DataFrame(embeddings)
    features = embeddings.values

    return (features, labels)

  def _classification_data_to_models(
      self, query_classification_data: Dict[str, NLQueryClassificationData],
      supported_types: List[str]):
    """Train the classification models and retain info for predictions."""
    for key in query_classification_data:
      if key not in supported_types:
        continue
      data = query_classification_data[key]
      classification_model = NLQueryClassificationModel(
          classification_type=data.classification_type)
      try:
        (features,
         labels) = self._train_classifier(data.classification_type.categories,
                                          data.training_sentences)
        classification_model.classification_model.fit(features, labels)
        self.classification_models.update({key: classification_model})
        logging.info(f'Classification Model {key} trained.')
        logging.info(self.classification_models[key].classification_type.name)
        logging.info(
            self.classification_models[key].classification_type.categories)
      except Exception as e:
        logging.info(
            f'Classification Model {key} could not be trained. Error: {e}')

  def query_classification(self, type_string: str, query: str) -> str:
    """Check if query can be classified according to 'type_string' model.
    
    Args:
      type_string: (str) This is the sentence classification type, e.g. 
        "ranking", "temporal", "contained_in". Full list is in lib.nl_training.py
      query: (str) The query string supplied.
    
    Returns:
      The classification string, e.g. "Rankings-High", "No Ranking" etc. Fill set
      of options is in lib.nl_training.py
    """
    if not f'{type_string}' in self.classification_models:
      return f'{type_string} Classifier not built.'
    query_encoded = self.model.encode(query)
    classification_model: NLQueryClassificationModel = self.classification_models[
        type_string]
    logging.info(
        f'Getting predictions from model: {classification_model.classification_type.name}'
    )
    logging.info(
        f'Getting predictions from model: {classification_model.classification_type.categories}'
    )
    return pick_option(classification_model.classification_model, query_encoded,
                       classification_model.classification_type.categories)

  def detect_svs(self, query, embeddings_build):
    query_embeddings = self.model.encode([query])
    if embeddings_build not in self.dataset_embeddings_maps:
      return ValueError(f'Embeddings Build: {embeddings_build} was not found.')
    hits = semantic_search(query_embeddings,
                           self.dataset_embeddings_maps[embeddings_build],
                           top_k=10)

    # Note: multiple results may map to the same DCID. As well, the same string may
    # map to multiple DCIDs with the same score.
    sv2score = {}
    for e in hits[0]:
      for d in self.dcid_maps[embeddings_build][e['corpus_id']].split(','):
        s = e['score']
        # Prefer the top score.
        if d not in sv2score:
          sv2score[d] = s

    # Sort by scores
    sv2score_sorted = sorted(sv2score.items(),
                             key=lambda item: item[1],
                             reverse=True)
    svs_sorted = [k for (k, _) in sv2score_sorted]
    scores_sorted = [v for (_, v) in sv2score_sorted]

    return {'SV': svs_sorted, 'CosineScore': scores_sorted}

  def detect_place(self, query):
    doc = self.ner_model(query)
    places_found_loc_gpe = []
    places_found_fac = []
    for e in doc.ents:
      # Preference is given to LOC and GPE types over FAC.
      # List of entity types recognized by the spaCy library
      # is here: https://towardsdatascience.com/explorations-in-named-entity-recognition-and-was-eleanor-roosevelt-right-671271117218
      # We only use the location/place types.
      if e.label_ in ["GPE", "LOC"]:
        places_found_loc_gpe.append(str(e))
      if e.label_ in ["FAC"]:
        places_found_fac.append(str(e))

    if places_found_loc_gpe:
      return places_found_loc_gpe
    return places_found_fac
