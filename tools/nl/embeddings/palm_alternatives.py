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
#
# Retrieve Natural Language Alternatives to StatVar Descriptions using the PaLM API.

from dataclasses import dataclass
import datetime as datetime
import logging
import os

from absl import app
from absl import flags
import gspread
import pandas as pd
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import semantic_search
import time
import torch

from typing import List

import palm_api_helper as palm_helper

FLAGS = flags.FLAGS

flags.DEFINE_string('model_name', 'all-MiniLM-L6-v2', 'Model name')

flags.DEFINE_string('local_sheets_csv_filename', 'dc_nl_svs_curated',
                    'Local Sheets CSV Filename')
flags.DEFINE_string(
    'sheets_url',
    'https://docs.google.com/spreadsheets/d/1-QPDWqD131LcDTZ4y_nnqllh66W010HDdows1phyneU',
    'Google Sheets Url for the latest SVs')
flags.DEFINE_string('sheets_worksheet_name', 'Demo_SVs',
                    'Worksheet name in the Google Sheets file')

flags.DEFINE_string('palm_alternatives_filename', 'palm_alternatives',
                    'PaLM alternative descriptions csv filename')

MAX_API_RETRIES = 5
API_TIMEOUT_SECONDS = 5
TEMPERATURE = 0.5
PALM_API_KEY = os.environ.get('PALM_API_KEY', '')
PALM_API_URL = f"https://generativelanguage.googleapis.com/v1beta1/models/chat-bison-001:generateMessage?key={PALM_API_KEY}"

SHEETS_DCID_COL = 'Id'
SHEETS_DESCRIPTION_COL = 'Description'
CSV_PALM_ALTERNATIVES_COL = 'PaLM_Generated_Alternatives'

MAX_ALTERNATIVES_LIMIT = 5


@dataclass
class Context:
    # gspread client
    gs: any
    # Model
    model: any


def _get_sheets_data(ctx, sheets_url, worksheet_name) -> pd.DataFrame:
    print(
        f"Downloading the latest sheets data from: Worksheet={worksheet_name}, Url={sheets_url}"
    )
    sheet = ctx.gs.open_by_url(sheets_url).worksheet(worksheet_name)
    df = pd.DataFrame(sheet.get_all_records())
    return df


# Get most similar svs
def _get_similar_sv_indices(query_embedding_tensor,
                            dataset_embeddings_tensor,
                            top_k=10) -> List[int]:
    hits = semantic_search(query_embedding_tensor,
                           dataset_embeddings_tensor,
                           top_k=top_k)

    # Note: multiple results may map to the same DCID. As well, the same string may
    # map to multiple DCIDs with the same score.
    svindex2score = {}
    for e in hits[0]:
        d = e['corpus_id']
        if d not in svindex2score:
            svindex2score[d] = e['score']

    svindex_sorted = [
        k for (k, _) in sorted(
            svindex2score.items(), key=lambda item: item[1], reverse=True)
    ]
    return svindex_sorted


def _sv_match_alternative(ctx,
                          sv_description,
                          dataset_embeddings_tensor,
                          top_k=10) -> List[int]:
    description_embed = ctx.model.encode(sv_description,
                                         show_progress_bar=False)
    similar_inds = _get_similar_sv_indices(description_embed,
                                           dataset_embeddings_tensor, top_k)
    return similar_inds


def update_local_sheets_file(ctx, sheets_url: str, worksheet_name: str,
                             local_sheets_filepath: str) -> None:
    """Download latest from Google sheets file and write to the local csv file."""
    df = _get_sheets_data(ctx, sheets_url, worksheet_name)
    df = df.fillna("")
    print(f"Downloaded {len(df)} lines.")

    print("Updating input CSV file")
    df.to_csv(local_sheets_filepath, index=False)


def load_svs(local_sheets_filepath: str) -> pd.DataFrame:
    return pd.read_csv(local_sheets_filepath)


def build_embeddings(ctx, texts):
    print("Building embddings.")
    embeddings = ctx.model.encode(texts, show_progress_bar=True)
    embeddings = pd.DataFrame(embeddings)
    return torch.from_numpy(embeddings.to_numpy()).to(torch.float)


def add_palm_alternatives(ctx, df_svs: pd.DataFrame) -> None:
    """Generate alternative descriptions using the PaLM API and add as a column to df_svs.
  
  Args:
    df_svs: DataFrame with the latest SVs, descriptions and other human curated alternatives.
    palm_alternatives_filepath: the filepath to write the PaLM alternatives to.
  """
    texts = df_svs[SHEETS_DESCRIPTION_COL].to_list()
    dcids = df_svs[SHEETS_DCID_COL].to_list()

    embeddings = build_embeddings(ctx, texts)

    # Start processing.
    palm_alternatives = []
    total_rows = len(df_svs)
    for rid, row in df_svs.iterrows():
        if rid % 10 == 0:
            print(f"Processed: {rid}. Index = {rid}/{total_rows}")
            time.sleep(API_TIMEOUT_SECONDS)
    
        sv_dcid = row[SHEETS_DCID_COL]
        sv_description = row[SHEETS_DESCRIPTION_COL]

        # Do not generate alternatives for topics.
        if 'dc/topic' in sv_dcid:
            continue
        print(
            f"***Processing sv_dcid:{sv_dcid}, sv_description:{sv_description}")

        # Get Alternative.
        valid_alts = []
        for _ in range(MAX_API_RETRIES):
            alts = palm_helper.palm_api_call(PALM_API_URL, sv_description,
                                             TEMPERATURE, API_TIMEOUT_SECONDS)

            for a in alts:
                # Check if we can find any valid alternates.
                matched_inds = _sv_match_alternative(ctx,
                                                     sv_description,
                                                     embeddings,
                                                     top_k=3)

                top_sv_id = dcids[matched_inds[0]]
                if top_sv_id == sv_dcid:
                    valid_alts.append(a)
                else:
                    # Some print logs in case of no matches.
                    print(f"  -- Not valid alternative: {a}")
                    print(
                        f"  -- Top Alternative was: {top_sv_id}. Expected SV: {sv_dcid}"
                    )

            if len(valid_alts) >= MAX_ALTERNATIVES_LIMIT:
                break

        palm_alts_string = ""
        # Combine the valid alternatives in a string delimited by a semi colon.
        palm_alts_string = ";".join(valid_alts)
        print(f"  Alternates validated:")
        print(palm_alts_string + "\n")

        palm_alternatives.append(palm_alts_string)

    assert len(palm_alternatives) == total_rows
    df_svs[CSV_PALM_ALTERNATIVES_COL] = palm_alternatives


def main(_):
    assert FLAGS.model_name and FLAGS.local_sheets_csv_filename and FLAGS.sheets_url and FLAGS.sheets_worksheet_name

    local_sheets_filepath = os.path.join(
        'sheets', FLAGS.local_sheets_csv_filename + ".csv")
    assert os.path.exists(local_sheets_filepath)

    local_palm_alternatives_filepath = os.path.join(
        'csv', FLAGS.palm_alternatives_filename + ".csv")
    assert os.path.exists(local_palm_alternatives_filepath)

    assert PALM_API_KEY

    gs = gspread.oauth()
    model = SentenceTransformer(FLAGS.model_name)

    ctx = Context(gs=gs, model=model)

    # First update the local csv file corresponding to the latest SVs data in Google Sheets.
    update_local_sheets_file(ctx, FLAGS.sheets_url, FLAGS.sheets_worksheet_name,
                             local_sheets_filepath)

    # Now process the local sheets file and get the SV data.
    df_svs = load_svs(local_sheets_filepath)

    # Process the dataframe to get alternative descriptions.
    start = time.time()
    add_palm_alternatives(ctx, df_svs)
    end = time.time()

    # Write the PaLM alternatives to file.
    cols = [SHEETS_DCID_COL, CSV_PALM_ALTERNATIVES_COL]
    df_svs[cols].to_csv(local_palm_alternatives_filepath, index=False)

    print(f"Generating PaLM alternatives for {len(df_svs)} SVs took {end - start} seconds.")


if __name__ == "__main__":
    app.run(main)
