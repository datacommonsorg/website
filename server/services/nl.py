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

from lib.nl_detection import NLClassifier, ClassificationType
from lib.nl_detection import ClusteringClassificationAttributes
from lib.nl_detection import ContainedInClassificationAttributes, ContainedInPlaceType
from lib.nl_detection import CorrelationClassificationAttributes
from lib.nl_detection import RankingClassificationAttributes, RankingType
from lib.nl_detection import PeriodType, TemporalClassificationAttributes
from lib.nl_training import NLQueryClassificationData, NLQueryClassificationModel
from lib.nl_training import NLQueryClusteringDetectionModel
from lib.nl_page_config import PLACE_TYPE_TO_PLURALS
from typing import Dict, List, Union
import os
import numpy as np
import pandas as pd
import torch
from datasets import load_dataset
import logging
from collections import OrderedDict
import re

BUILDS = [
    'demographics300',  #'uncurated3000',
    'demographics300-withpalmalternatives',
    'curatedJan2022',
    'us_filtered',
]
GCS_BUCKET = 'datcom-csv'
EMBEDDINGS = 'embeddings/'
TEMP_DIR = '/tmp/'
MODEL_NAME = 'all-MiniLM-L6-v2'

STOP_WORDS = {
    'ourselves', 'hers', 'between', 'yourself', 'but', 'again', 'there',
    'about', 'once', 'during', 'out', 'very', 'having', 'with', 'they', 'own',
    'an', 'be', 'some', 'for', 'do', 'its', 'yours', 'such', 'into', 'of',
    'most', 'itself', 'other', 'off', 'is', 's', 'am', 'or', 'who', 'as',
    'from', 'him', 'each', 'the', 'themselves', 'until', 'below', 'are', 'we',
    'these', 'your', 'his', 'through', 'don', 'nor', 'me', 'were', 'her',
    'more', 'himself', 'this', 'down', 'should', 'our', 'their', 'while',
    'above', 'both', 'up', 'to', 'ours', 'had', 'she', 'all', 'no', 'when',
    'at', 'any', 'before', 'them', 'same', 'and', 'been', 'have', 'in', 'will',
    'on', 'does', 'yourselves', 'then', 'that', 'because', 'what', 'over',
    'why', 'so', 'can', 'did', 'not', 'now', 'under', 'he', 'you', 'herself',
    'has', 'just', 'where', 'too', 'only', 'myself', 'which', 'those', 'i',
    'after', 'few', 'whom', 't', 'being', 'if', 'theirs', 'my', 'against', 'a',
    'by', 'doing', 'it', 'how', 'further', 'was', 'here', 'than', 'tell',
}

# TODO: remove this special casing when a better NER model is identified which
# can always detect these.
SPECIAL_PLACES = {'cambridge', 'palo alto', 'mountain view'}

# Note: These heuristics should be revisited if we change
# query preprocessing (e.g. stopwords, stemming)
QUERY_CLASSIFICATION_HEURISTICS = {
    "Ranking": {
        "High": [
            "most",
            "top",
            "best",  # leaving here for backwards-compatibility
            "highest",
            "high",
            "smallest",
            "strongest",
            "richest",
            "sickest",
            "illest",
            "descending",
            "top to bottom",
            "highest to lowest",
        ],
        "Low": [
            "least",
            "bottom",
            "worst",  # leaving here for backwards-compatibility
            "lowest",
            "low",
            "largest",
            "weakest",
            "youngest",
            "poorest",
            "ascending",
            "bottom to top",
            "lowest to highest",
        ],
        "Best": ["best",],
        "Worst": ["worst",],
    },
    "Correlation": [
        "correlate",
        "correlated",
        "correlation",
        "relationship to",
        "relationship with",
        "relationship between",
        "related to",
        "related with",
        "related between",
        "vs",
        "versus",
    ],
}

def _add_to_set_from_list(set_strings, list_string):
  for v_str in list_string:
    if type(v_str) == str:
      # Only add words which are strings.
      set_strings.add(v_str.lower())

# Use QUERY_CLASSIFICATION_HEURISTICS to add all words to this dict.
STOP_WORDS_QUERY_CLASSIFICATION = set()
for (_, v) in QUERY_CLASSIFICATION_HEURISTICS.items():
  if isinstance(v, list):
    # If 'v' is a list, add all the words.
    _add_to_set_from_list(STOP_WORDS_QUERY_CLASSIFICATION, v)
  elif isinstance(v, dict):
    # If 'v' is a dict, get the values from the dict and add those.
    [_add_to_set_from_list(STOP_WORDS_QUERY_CLASSIFICATION, val_list) for (_, val_list) in v.items()]

# Also add from the place types and plurals.
_add_to_set_from_list(STOP_WORDS_QUERY_CLASSIFICATION, PLACE_TYPE_TO_PLURALS.keys())
_add_to_set_from_list(STOP_WORDS_QUERY_CLASSIFICATION, PLACE_TYPE_TO_PLURALS.values())


def _remove_stop_words(input):
  res = input.lower().split()
  output = ''
  for w in res:
    if (w not in STOP_WORDS) and (w not in STOP_WORDS_QUERY_CLASSIFICATION):
      output += w + " "
  if not output:
    return ''
  else:
    return output[:-1]


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


def _prefix_length(s1, s2):
  if not s1 or not s2:
    return 0
  short_str = min([s1, s2], key=len)
  for i, char in enumerate(short_str):
    for other in [s1, s2]:
      if other[i] != char:
        return i + 1
  return len(short_str)


class Model:
  """Holds clients for the language model"""

  def __init__(self, ner_model,
               query_classification_data: Dict[str, NLQueryClassificationData],
               classification_types_supported: List[str]):
    self.model = SentenceTransformer(MODEL_NAME)
    self.ner_model = ner_model
    self.dataset_embeddings_maps = {}
    # For clustering, need the DataFrame objects.
    self.dataset_embeddings_maps_to_df = {}
    self._download_embeddings()
    self.dcid_maps = {}
    self.sentence_maps = {}
    for build in BUILDS:
      logging.info('Loading build {}'.format(build))
      ds = load_dataset('csv',
                        data_files=os.path.join(TEMP_DIR,
                                                f'embeddings_{build}.csv'))
      df = ds["train"].to_pandas()
      self.dcid_maps[build] = df['dcid'].values.tolist()
      df = df.drop('dcid', axis=1)
      # Also get the sentence mappings.
      self.sentence_maps[build] = []
      if 'sentence' in df:
        self.sentence_maps[build] = df['sentence'].values.tolist()
        df = df.drop('sentence', axis=1)

      self.dataset_embeddings_maps[build] = torch.from_numpy(df.to_numpy()).to(
          torch.float)
      self.dataset_embeddings_maps_to_df[build] = df

    # Classification models and training.
    self.classification_models: Dict[str, NLQueryClassificationModel] = {}
    self._classification_data_to_models(query_classification_data,
                                        classification_types_supported)

    # Set the Correlations Detection Model.
    self._clustering_detection = NLQueryClusteringDetectionModel()

  def _download_embeddings(self):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name=GCS_BUCKET)
    blobs = bucket.list_blobs(prefix=EMBEDDINGS)  # Get list of files
    for blob in blobs:
      try:
        _, filename = os.path.split(blob.name)
        blob.download_to_filename(os.path.join(TEMP_DIR, filename))  # Download
      except Exception as e:
        logging.info(e)

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

  # TODO (juliawu): Add unit-testing
  def heuristic_ranking_classification(self,
                                       query) -> Union[NLClassifier, None]:
    """Determine if query is a ranking type.

    Uses heuristics instead of ML-based classification.

    Args:
      query - the user's input as a string

    Returns:
      NLClassifier with RankingClassificationAttributes
    """
    subtype_map = {
        "High": RankingType.HIGH,
        "Low": RankingType.LOW,
        "Best": RankingType.BEST,
        "Worst": RankingType.WORST,
    }

    # make query lowercase for string matching
    query = query.lower()

    ranking_types = []
    all_trigger_words = []

    for subtype in QUERY_CLASSIFICATION_HEURISTICS["Ranking"].keys():
      type_trigger_words = []

      for keyword in QUERY_CLASSIFICATION_HEURISTICS["Ranking"][subtype]:
        regex = r"(^|\W)" + keyword + r"($|\W)"
        type_trigger_words += [w.group() for w in re.finditer(regex, query)]

      if len(type_trigger_words) > 0:
        ranking_types.append(subtype_map[subtype])
      all_trigger_words += type_trigger_words

    # If no matches, this query is not a ranking query
    if len(all_trigger_words) == 0:
      return None

    attributes = RankingClassificationAttributes(
        ranking_type=ranking_types, ranking_trigger_words=all_trigger_words)
    return NLClassifier(type=ClassificationType.RANKING, attributes=attributes)

  def _ranking_classification(self, prediction) -> Union[NLClassifier, None]:
    ranking_type = RankingType.NONE
    if prediction == "Rankings-High":
      ranking_type = RankingType.HIGH
    elif prediction == "Rankings-Low":
      RankingType.LOW

    if ranking_type == RankingType.NONE:
      return None

    # TODO: need to detect trigger words.
    attributes = RankingClassificationAttributes(ranking_type=ranking_type,
                                                 ranking_trigger_words=[])
    return NLClassifier(type=ClassificationType.RANKING, attributes=attributes)

  def _temporal_classification(self, prediction) -> Union[NLClassifier, None]:
    if prediction != "Temporal":
      return None

    # TODO: need to detect the date and type.
    attributes = TemporalClassificationAttributes(date_str="",
                                                  date_type=PeriodType.NONE)
    return NLClassifier(type=ClassificationType.TEMPORAL, attributes=attributes)

  def _containedin_classification(self, prediction,
                                  query: str) -> Union[NLClassifier, None]:
    if prediction != "Contained In":
      return None

    contained_in_place_type = ContainedInPlaceType.PLACE
    place_type_to_enum = OrderedDict({
        "county": ContainedInPlaceType.COUNTY,
        "state": ContainedInPlaceType.STATE,
        "country": ContainedInPlaceType.COUNTRY,
        "city": ContainedInPlaceType.CITY,
        "district": ContainedInPlaceType.DISTRICT,
        "province": ContainedInPlaceType.PROVINCE,
        "town": ContainedInPlaceType.TOWN,
        "zip": ContainedInPlaceType.ZIP
    })
    query = query.lower()
    for place_type, place_enum in place_type_to_enum.items():
      if place_type in query:
        contained_in_place_type = place_enum
        break

      if place_type in PLACE_TYPE_TO_PLURALS and \
        PLACE_TYPE_TO_PLURALS[place_type] in query:
        contained_in_place_type = place_enum
        break

    # If place_type is just PLACE, that means no actual type was detected.
    if contained_in_place_type == ContainedInPlaceType.PLACE:
      return None

    # TODO: need to detect the type of place for this contained in.
    attributes = ContainedInClassificationAttributes(
        contained_in_place_type=contained_in_place_type)
    return NLClassifier(type=ClassificationType.CONTAINED_IN,
                        attributes=attributes)

  def _clustering_classification(
      self, clusters: List[Dict[str, float]]) -> Union[NLClassifier, None]:
    if not clusters:
      return None

    # TODO: need to fill in the details.
    attributes = ClusteringClassificationAttributes(
        sv_dcid_1="",
        sv_dcid_2="",
        is_using_clusters=False,
        correlation_trigger_words="",
        cluster_1_svs=[],
        cluster_2_svs=[])
    return NLClassifier(type=ClassificationType.CONTAINED_IN,
                        attributes=attributes)

  # TODO (juliawu): add unit testing
  def heuristic_correlation_classification(
      self, query: str) -> Union[NLClassifier, None]:
    """Determine if query is asking for a correlation.
    
    Uses heuristics instead of ML-model for classification.

    Args:
      query: user's input, given as a string
    
    Returns:
      NLClassifier with CorrelationClassificationAttributes
    """
    query = query.lower()
    matches = []
    for keyword in QUERY_CLASSIFICATION_HEURISTICS["Correlation"]:
      regex = r"(?:^|\W)" + keyword + r"(?:$|\W)"
      matches += [w.group() for w in re.finditer(regex, query)]
    if len(matches) == 0:
      return None
    attributes = CorrelationClassificationAttributes(
        correlation_trigger_words=matches)
    return NLClassifier(type=ClassificationType.CORRELATION,
                        attributes=attributes)

  def query_clustering_detection(
      self,
      embeddings_build,
      query,
      svs_list,
      svs_scores,
      sv_embedding_indices,
      cosine_similarity_cutoff=0.4,
      sv_matching_score_cutoff=0.35,
      prefix_length_cutoff=8) -> Union[NLClassifier, None]:
    """Correlation detection based on clustering. Assumes all input lists are ordered and same length."""
    # Figure out the score cutoff so that clustering only considers high scoring SV matches.
    cutoff_index = 0
    for i in range(len(svs_scores)):
      if svs_scores[i] > sv_matching_score_cutoff:
        cutoff_index = i

    if cutoff_index == 0:
      logging.info(
          f"Not clustering. No SV matching score was > {sv_matching_score_cutoff}"
      )
      return None

    embedding_vectors = []
    for i in range(0, cutoff_index):
      vec_index = sv_embedding_indices[i]
      vec = self.dataset_embeddings_maps_to_df[embeddings_build].iloc[
          vec_index].values

      embedding_vectors.append(np.array(vec))

    # Cluster the embedding vectors.
    self._clustering_detection.clustering_model.fit(embedding_vectors)
    labels = self._clustering_detection.clustering_model.labels_
    logging.info("Clustering in to two clusters done.")

    cluster_zero_indices = [ind for ind, x in enumerate(labels) if x == 0]
    cluster_one_indices = [ind for ind, x in enumerate(labels) if x == 1]

    # Pick the highest scoring SVs in the two clusters.
    def _index_with_max_score(cluster_indices):
      max_s = -1.0
      max_index = -1
      for ci in cluster_indices:
        if svs_scores[ci] > max_s:
          max_s = svs_scores[ci]
          max_index = ci
      return max_index

    cluster_zero_best_sv_index = _index_with_max_score(cluster_zero_indices)
    cluster_one_best_sv_index = _index_with_max_score(cluster_one_indices)

    # Cosine Score between the two.
    def cos_sim(a, b):
      return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    # If this score is high, it means that the two highest scored (matched) SVs
    # are similar and we cannot be sure that this is a correlation query based
    # on how different the two clusters are.
    sim_score = cos_sim(embedding_vectors[cluster_zero_best_sv_index],
                        embedding_vectors[cluster_one_best_sv_index])

    if sim_score < cosine_similarity_cutoff:
      logging.info(
          f"Best SVs in the two clusters were far apart. Cosine Score = {sim_score}"
      )
      sv_dcid_1 = svs_list[cluster_zero_best_sv_index]
      sv_dcid_2 = svs_list[cluster_one_best_sv_index]

      # Check in case the two SVs have long prefix matching.
      if _prefix_length(sv_dcid_1, sv_dcid_2) >= prefix_length_cutoff:
        logging.info(
            f"Best SVs ({sv_dcid_1, sv_dcid_2}) have prefix match > {prefix_length_cutoff}. Not a Correlation Query."
        )
        return None

      logging.info(
          f"Treating as a Correlation Query. Cosine Score and Prefix Match Length are both LOW."
      )
      attributes = ClusteringClassificationAttributes(
          sv_dcid_1=sv_dcid_1,
          sv_dcid_2=sv_dcid_2,
          is_using_clusters=True,
          # TODO: also look at trigger words.
          correlation_trigger_words="",
          cluster_1_svs=[svs_list[i] for i in cluster_zero_indices],
          cluster_2_svs=[svs_list[i] for i in cluster_one_indices],
      )
      return NLClassifier(type=ClassificationType.CLUSTERING,
                          attributes=attributes)
    else:
      logging.info(
          f"Not Correlation Query. Best SVs in the two clusters were too similar. Cosine Score > {sim_score}"
      )
    return None

  def query_classification(self, type_string: str,
                           query: str) -> Union[NLClassifier, None]:
    """Check if query can be classified according to 'type_string' model.

    Args:
      type_string: (str) This is the sentence classification type, e.g.
        "ranking", "temporal", "contained_in". Full list is in lib.nl_training.py
      query: (str) The query string supplied.

    Returns:
      The NLClassifier object or None.
    """
    if not f'{type_string}' in self.classification_models:
      logging.info(f'{type_string} Classifier not built.')
      return None
    query_encoded = self.model.encode(query)
    # TODO: when the correlation classifier is ready, remove this following conditional.
    if type_string in ["ranking", "temporal", "contained_in"]:
      classification_model: NLQueryClassificationModel = self.classification_models[
          type_string]
      logging.info(
          f'Getting predictions from model: {classification_model.classification_type.name}'
      )
      logging.info(
          f'Getting predictions from model: {classification_model.classification_type.categories}'
      )
      prediction = pick_option(
          classification_model.classification_model, query_encoded,
          classification_model.classification_type.categories)

      if type_string == "ranking":
        return self._ranking_classification(prediction)
      elif type_string == "temporal":
        return self._temporal_classification(prediction)
      elif type_string == "contained_in":
        return self._containedin_classification(prediction, query)

    if type_string == "clustering":
      # TODO: implement.
      return self._clustering_classification([])
    return None

  def detect_svs(self, query, embeddings_build):
    # Remove stop words.
    logging.info(f"SV Detection: Query provided to SV Detection: {query}")
    query = _remove_stop_words(query)
    logging.info(f"SV Detection: Query used after removing stop words: {query}")
    query_embeddings = self.model.encode([query])
    if embeddings_build not in self.dataset_embeddings_maps:
      raise ValueError(f'Embeddings Build: {embeddings_build} was not found.')
    hits = semantic_search(query_embeddings,
                           self.dataset_embeddings_maps[embeddings_build],
                           top_k=20)

    # Note: multiple results may map to the same DCID. As well, the same string may
    # map to multiple DCIDs with the same score.
    sv2score = {}
    # Also track the sv to index so that embeddings can later be retrieved.
    sv2index = {}
    # Also add the full list of SVs and sentences that matched (for debugging).
    all_svs_sentences: Dict[str, List[str]] = {}
    for e in hits[0]:
      for d in self.dcid_maps[embeddings_build][e['corpus_id']].split(','):
        s = e['score']
        ind = e['corpus_id']
        sentence = ""
        try:
          sentence = self.sentence_maps[embeddings_build][
              e['corpus_id']] + f" ({s})"
        except Exception as exp:
          logging.info(exp)
        # Prefer the top score.
        if d not in sv2score:
          sv2score[d] = s
          sv2index[d] = ind

        # Add to the debug map anyway.
        existing_sentences = []
        if d in all_svs_sentences:
          existing_sentences = all_svs_sentences[d]

        if sentence not in existing_sentences:
          existing_sentences.append(sentence)
        all_svs_sentences[d] = existing_sentences

    # Sort by scores
    sv2score_sorted = sorted(sv2score.items(),
                             key=lambda item: item[1],
                             reverse=True)
    svs_sorted = [k for (k, _) in sv2score_sorted]
    scores_sorted = [v for (_, v) in sv2score_sorted]

    sv_index_sorted = [sv2index[k] for (k, _) in sv2score_sorted]

    return {
        'SV': svs_sorted,
        'CosineScore': scores_sorted,
        'EmbeddingIndex': sv_index_sorted,
        'SV_to_Sentences': all_svs_sentences,
    }

  def _detect_place_helper(self, query):
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

  def detect_place(self, query):
    query_without_stop_words = _remove_stop_words(query)
    query_with_period = query + "."
    query_title_case = query.title()

    # TODO: work on finding a better fix for important places which are
    # not getting detected.
    # First check in special places. If they are found, return those.
    for special_place in SPECIAL_PLACES:
      if special_place in query_without_stop_words:
        logging.info(f"Found one of the Special Places: {special_place}")
        # Appending a ", USA" to help finding this place via Maps.
        return [special_place + ", USA"]

    places_found = []
    # Now try all versions of the query.
    for q in [
        query, query_without_stop_words, query_with_period, query_title_case
    ]:
      places_found = self._detect_place_helper(q)
      if places_found:
        break

    return places_found
