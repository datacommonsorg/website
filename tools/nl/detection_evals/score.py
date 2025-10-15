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

from datetime import datetime
import logging
import re
import statistics
from typing import List, Set

from dateutil.relativedelta import relativedelta
from eval_models import DetectedPlace
from eval_models import NlApiScrape
from eval_models import NlGolden
from eval_models import VariableResponse
import numpy as np
import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from utils import df_to_pydantic_models

_DATE_OF_SCRAPE_FORMAT = '%Y-%m-%d'
_DATE_PLACEHOLDER = '$TODAY'


def _calculate_date_scores(golden_dates: pd.Series, scrape_dates: pd.Series,
                           date_of_scrape: pd.Series) -> pd.Series:
  """
  Calculates date scores. TODO: elaborate
  """

  def score_dates(golden_dates, scraped_dates, date_of_scrape):

    def replace_placeholder(date_str):
      if date_str == _DATE_PLACEHOLDER:
        return date_of_scrape

      placeholder_pattern = r"^\$TODAY([+-])(\d+)([YM])$"
      placeholders = re.fullmatch(placeholder_pattern, date_str)

      if not placeholders:
        logging.error(f'Unable to parse date placeholder {date_str}')
        return date_str

      sign, adjustment, unit = placeholders.groups()
      adjustment = int(adjustment)

      date_obj = datetime.strptime(date_of_scrape, _DATE_OF_SCRAPE_FORMAT)

      if unit == 'Y' and sign == '+':
        return (date_obj + relativedelta(years=adjustment)).strftime('%Y')
      elif unit == 'Y' and sign == '-':
        return (date_obj - relativedelta(years=adjustment)).strftime('%Y')
      elif unit == 'M' and sign == '+':
        return (date_obj + relativedelta(months=adjustment)).strftime('%Y-%m')
      elif unit == 'M' and sign == '-':
        return (date_obj - relativedelta(months=adjustment)).strftime('%Y-%m')
      else:
        logging.error(f'Unable to parse date placeholder {date_str}')
        return date_str

    # If there wasn't a date in the query and the scrape did not hallucinate one,
    # return "empty" so that this does not positively or negatively impact total
    # scoring.
    if not golden_dates and not scraped_dates:
      return np.nan

    # If either golden or scraped is present without the other, then automatic 0.
    # (Either we detected dates when goldens say there's none to detect or we
    # failed to detect dates when goldens say they are present in the query.)
    if bool(golden_dates) ^ bool(scraped_dates):
      return 0.0

    # Populate any $TODAY based placeholders in the goldens with values
    for golden in golden_dates:
      if _DATE_PLACEHOLDER in golden.base_date:
        golden.base_date = replace_placeholder(golden.base_date)

      if _DATE_PLACEHOLDER in golden.end_date:
        golden.end_date = replace_placeholder(golden.end_date)

    individual_date_scores = []
    for scrape in scraped_dates:
      best_score = 0
      for golden in golden_dates:

        base_date_score = 1.0 if scrape.base_date == golden.base_date else 0.0
        end_date_score = 1.0 if scrape.end_date == golden.end_date else 0.0
        score = statistics.mean([base_date_score, end_date_score])

        if score > best_score:
          best_score = score

      individual_date_scores.append(best_score)

    individual_date_scores.extend([0.0] *
                                  abs(len(golden_dates) - len(scraped_dates)))

    return statistics.mean(individual_date_scores)

  return [
      score_dates(g, s, d)
      for g, s, d in zip(golden_dates, scrape_dates, date_of_scrape)
  ]


def _per_sample_fbeta_score(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    beta: float = 1.0
) -> tuple[np.ndarray[float], np.ndarray[float], np.ndarray[float]]:
  """
  Calculates the F-beta score for each sample in a multilabel setting using
  fast, vectorized NumPy operations.

  Args:
      y_true (np.ndarray): A (n_samples, n_classes) binary matrix of true labels.
      y_pred (np.ndarray): A (n_samples, n_classes) binary matrix of predicted labels.
      beta (float): The beta value for the F-beta score.

  Returns:
    A (n_samples,) array of F-beta scores for each sample.
  """
  y_true = y_true.astype(bool)
  y_pred = y_pred.astype(bool)

  tp = (y_true & y_pred).sum(axis=1)
  fp = (y_pred & ~y_true).sum(axis=1)
  fn = (y_true & ~y_pred).sum(axis=1)

  beta_sq = beta**2

  precision = np.divide(tp,
                        tp + fp,
                        out=np.zeros_like(tp, dtype=float),
                        where=(tp + fp) > 0)
  recall = np.divide(tp,
                     tp + fn,
                     out=np.zeros_like(tp, dtype=float),
                     where=(tp + fn) > 0)

  fbeta = np.divide((1 + beta_sq) * precision * recall,
                    (beta_sq * precision) + recall,
                    out=np.zeros_like(tp, dtype=float),
                    where=((beta_sq * precision) + recall) > 0)

  fbeta[(tp + fp + fn) == 0] = 1.0

  return np.round(fbeta, decimals=3), np.round(precision,
                                               decimals=3), np.round(recall,
                                                                     decimals=3)


def _calculate_fbeta_score(
    y_true_sets: pd.Series,
    y_pred_sets: pd.Series,
    beta: float = 1.0
) -> tuple[np.ndarray[float], np.ndarray[float], np.ndarray[float]]:
  mlb = MultiLabelBinarizer()
  all_labels = y_true_sets.tolist() + y_pred_sets.tolist()

  mlb.fit(all_labels)

  y_true_matrix = mlb.transform(y_true_sets)
  y_pred_matrix = mlb.transform(y_pred_sets)

  return _per_sample_fbeta_score(y_true_matrix, y_pred_matrix, beta=beta)


# @title ### score_place


def _calculate_place_scores(golden_places_col: pd.Series,
                            scrape_places_col: pd.Series) -> pd.Series:

  def get_place_dcid_set(places: List[DetectedPlace]) -> Set[str]:
    return {place.dcid for place in places}

  def get_sub_type_set(places: List[DetectedPlace]) -> Set[str]:
    labels = set()
    for place in places:
      if place.sub_place_type:
        labels.add(place.sub_place_type)
    return labels

  def get_place_labels_set(places: List[DetectedPlace]) -> Set[str]:
    labels = set()
    for place in places:
      sub_place_type = place.sub_place_type if place.sub_place_type else ''
      labels.add(f"{place.dcid}:{sub_place_type}")
    return labels

  # phase 1 - place_dcid scoring; this is to give "partial credit" for when a
  # parent place is properly detected even when the child place is not
  y_true_place_dcids = golden_places_col.apply(get_place_dcid_set)
  y_pred_place_dcids = scrape_places_col.apply(get_place_dcid_set)

  place_dcids_scores, _, _ = _calculate_fbeta_score(y_true_place_dcids,
                                                    y_pred_place_dcids,
                                                    beta=0.8)

  # phase 2 - child place type accuracy
  y_true_sub_place_types = golden_places_col.apply(get_sub_type_set)
  y_pred_sub_place_types = scrape_places_col.apply(get_sub_type_set)

  sub_place_type_scores, _, _ = _calculate_fbeta_score(y_true_sub_place_types,
                                                       y_pred_sub_place_types)

  # phase 3 - full place_dcid +/- child type pairs
  y_true_full_place = golden_places_col.apply(get_place_labels_set)
  y_pred_full_place = scrape_places_col.apply(get_place_labels_set)

  full_place_scores, _, _ = _calculate_fbeta_score(y_true_full_place,
                                                   y_pred_full_place,
                                                   beta=0.5)

  places_weight = 0.4
  child_types_weight = 0.2
  full_weight = 0.4

  combined_score = pd.Series((places_weight * place_dcids_scores) +
                             (child_types_weight * sub_place_type_scores) +
                             (full_weight * full_place_scores))

  # For cases where there are no places in the goldens, we shouldn't produce a score
  # instead, populate with NaN.
  do_not_score = (golden_places_col.str.len()
                  == 0) & (scrape_places_col.str.len() == 0)
  combined_score.loc[do_not_score] = np.nan

  return combined_score


# @title ### score_variables


def _calculate_variable_scores(golden_vars_col: pd.Series,
                               scrape_vars_col: pd.Series) -> pd.Series:
  """

  """

  def get_var_dcid_set(vars: List[VariableResponse]) -> Set[str]:
    return {dcid for var in vars for dcid in var.dcids}

  # phase 1 - variable dcid scoring

  y_true_var_dcids = golden_vars_col.apply(get_var_dcid_set)
  y_pred_var_dcids = scrape_vars_col.apply(get_var_dcid_set)

  # Use high beta score to favor recall over precision - care more about finding
  # right statvars than excluding non-required ones.
  var_dcid_fbeta, precision, recall = _calculate_fbeta_score(y_true_var_dcids,
                                                             y_pred_var_dcids,
                                                             beta=2)

  combined_score = pd.Series(var_dcid_fbeta)
  precision = pd.Series(precision)
  recall = pd.Series(recall)

  # TODO: once all goldens have variables, uncomment the following line and delete the next
  # do_not_score = (golden_vars_col.str.len() == 0) & (scrape_vars_col.str.len() == 0)
  do_not_score = (golden_vars_col.str.len() == 0)
  combined_score.loc[do_not_score] = np.nan
  precision.loc[do_not_score] = np.nan
  recall.loc[do_not_score] = np.nan

  return combined_score, precision, recall


def _calculate_total_scores(date_scores: pd.Series, place_scores: pd.Series,
                            variable_scores: pd.Series) -> pd.Series:

  # 1. Define the weights for each component
  weights = {'date': 0.2, 'place': 0.4, 'variable': 0.4}

  # 2. Create a DataFrame from the input Series for easier operations
  tmp_df = pd.DataFrame({
      'date': date_scores,
      'place': place_scores,
      'variable': variable_scores
  })

  # 3. Calculate the Numerator (the weighted sum of scores)
  # We replace NaNs with 0 before multiplying by the weight. This ensures that
  # missing components contribute nothing to the sum, which is correct.
  numerator = (tmp_df['date'].fillna(0) * weights['date']) + \
              (tmp_df['place'].fillna(0) * weights['place']) + \
              (tmp_df['variable'].fillna(0) * weights['variable'])

  # 4. Calculate the Dynamic Denominator (the sum of weights for non-NaN scores)
  # First, create a boolean DataFrame (True where scores exist)
  not_na_df = tmp_df.notna()

  # Multiply the boolean DataFrame by the weights. True becomes 1, False becomes 0.
  # This gives us the weight of each component IF it had a score, otherwise 0.
  applicable_weights_df = not_na_df * pd.Series(weights)

  # Sum these weights horizontally (axis=1) to get the total weight for each row
  denominator = applicable_weights_df.sum(axis=1)

  # 5. Calculate the Final Score
  # We use np.divide for safe division, which correctly produces NaN
  # if the denominator is 0 (i.e., all scores for a row were NaN).
  final_scores = np.divide(numerator,
                           denominator,
                           out=np.full_like(denominator, np.nan),
                           where=denominator != 0)

  return pd.Series(final_scores)


def compute_scores(goldens_df: pd.DataFrame,
                   scrapes_df: pd.DataFrame) -> pd.DataFrame:
  goldens_df = goldens_df.rename(
      columns=lambda c: f"{c}_golden" if c != 'id' else c)
  scrapes_df = scrapes_df.rename(
      columns=lambda c: f"{c}_scraped" if c != 'id' else c)
  merged_df = pd.merge(goldens_df, scrapes_df, on='id')

  # Drop rows if query is not the same for golden and scraped response
  mismatched_query_mask = merged_df['query_golden'] != merged_df[
      'query_scraped']
  if mismatched_query_mask.any():
    mismatched_ids = merged_df.loc[mismatched_query_mask, 'id'].tolist()
    logging.error(
        f'id collision: same id, different query for {mismatched_ids}; dropping from eval'
    )
    merged_df = merged_df[~mismatched_query_mask]

  score_df = pd.DataFrame()
  score_df['id'] = merged_df['id']
  score_df['query'] = merged_df['query_golden']
  score_df['golden_type'] = merged_df['golden_type_golden']

  # Calculate all scores using vectorized operations; this is more efficient than iterating rows.
  score_df['date_score'] = _calculate_date_scores(
      merged_df['dates_golden'], merged_df['dates_scraped'],
      merged_df['scrape_date_scraped'])
  score_df['place_score'] = _calculate_place_scores(merged_df['places_golden'],
                                                    merged_df['places_scraped'])
  score_df['variable_score'], score_df['variable_precision'], score_df[
      'variable_recall'] = _calculate_variable_scores(
          merged_df['variables_golden'], merged_df['variables_scraped'])

  score_df['total_score'] = _calculate_total_scores(score_df['date_score'],
                                                    score_df['place_score'],
                                                    score_df['variable_score'])

  golden_cols = ['id'] + [
      col for col in merged_df.columns if col.endswith('_golden')
  ]
  merged_goldens_df = merged_df[golden_cols].rename(
      columns=lambda c: c.removesuffix('_golden'))
  score_df['golden_response'] = df_to_pydantic_models(merged_goldens_df,
                                                      NlGolden)

  scraped_cols = ['id'] + [
      col for col in merged_df.columns if col.endswith('_scraped')
  ]
  merged_srapes_df = merged_df[scraped_cols].rename(
      columns=lambda c: c.removesuffix('_scraped'))
  score_df['scraped_response'] = df_to_pydantic_models(merged_srapes_df,
                                                       NlApiScrape)

  return score_df
