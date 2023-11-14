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
# limitations under the Licens
"""Translate queries in csv files using the Google Translate API

Translates a single column (up to 1024 entries long) in CSV files.
Assumes a csv format where the ISO 639-1 language codes are used
as column headers in the first row. Will MODIFY input csv to add a
column with the translations.

Requires:
  * A Google Cloud project with the Translate API enabled
  * You are authenticated via Google Cloud CLI, by running
      $ gcloud auth application-default login

Example usage:
    $ python3 translate_csvs.py path/to/dir/with/csvs \
        --new_column_name="Chinese translation" \
        --output_language="zh-CN" \
        --source_column_index=2 \
        --gcloud_project_id="my-gcloud-project"
"""

import glob
import os

from absl import app
from absl import flags
from google.cloud import translate
import pandas as pd

CSV_FILE_EXTENSION = ".csv"
DEFAULT_NEW_COLUMN_NAME = "translation"
DEFAULT_OUTPUT_LANUGAGE_CODE = "en"
DEFAULT_PROJECT_ID = "datcom-204919"
DEFAULT_PARENT = f"projects/{DEFAULT_PROJECT_ID}"

FLAGS = flags.FLAGS
flags.DEFINE_string("new_column_name",
                    DEFAULT_NEW_COLUMN_NAME,
                    help="header of new column with outputted translations")
flags.DEFINE_integer("source_column_index",
                     None,
                     help="index of column to translate (zero-indexed)")
flags.DEFINE_string("source_column_name",
                    None,
                    help="header of column to translate")
flags.DEFINE_string("output_language",
                    DEFAULT_OUTPUT_LANUGAGE_CODE,
                    help="ISO 639-1 code of the language to translate to")
flags.DEFINE_string("input_language",
                    None,
                    help="ISO 639-1 code of the language to translate from")
flags.DEFINE_string(
    "gcloud_project_id",
    DEFAULT_PROJECT_ID,
    help="Project ID of Google Cloud project with Translate API enabled")


class Translator:

  def __init__(self, project_id: str = DEFAULT_PROJECT_ID):
    """Initializer
        
    Args:
        project_id: ID of the google cloud project with Translate
                    API enabled.
    """
    self.client = translate.TranslationServiceClient()
    self.parent = f"projects/{project_id}"
    # get list of supported languages
    languages_response = self.client.get_supported_languages(
        parent=self.parent, display_language_code="en")
    self.supported_languages = [
        lang.language_code for lang in languages_response.languages
    ]

  def translate_single_query(self,
                             text: str,
                             input_lang: str = None,
                             output_lang: str = "en") -> str:
    """Translate a single query using the Google Translate API.

    Sourced from: https://codelabs.developers.google.com/codelabs/cloud-translation-python3#4

    Args:
        text: query to translate
        input_lang: source language, as ISO 639-1 language code
                    if not provided, will use translation API's detect
                    language feature
        output_lang: target language, as ISO 639-1 language code
                     defaults to English

    Returns:
        translated text
    """
    response = self.client.translate_text(parent=self.parent,
                                          contents=[text],
                                          source_language_code=input_lang,
                                          target_language_code=output_lang)
    return response.translations[0].translated_text

  def translate_multiple_queries(
      self,
      texts: list[str],
      input_lang: str = None,
      output_lang: str = "en",
  ) -> list[str]:
    """Translate multiple queries using the Google Translate API.

    Sourced from: https://codelabs.developers.google.com/codelabs/cloud-translation-python3#4

    Args:
        texts: queries to translate. Maximum length is 1024.
        input_lang: source language, as ISO 639-1 language code
                    if not provided, will use translation API's detect
                    language feature
        output_lang: target language, as ISO 639-1 language code
                        defaults to English

    Returns:
        translated text
    """
    response = self.client.translate_text(parent=self.parent,
                                          contents=texts,
                                          source_language_code=input_lang,
                                          target_language_code=output_lang)
    translations = [resp.translated_text for resp in response.translations]
    return translations


def process_csv(
    csv_filepath: str,
    translator: Translator,
    new_column_name: str = "translation",
    source_column_index: int = None,
    source_column_name: str = None,
    input_lang: str = None,
    output_lang: str = "en",
) -> None:
  """Translate a column in a csv of queries using the Google Translate API.

  Assumes a csv format where the ISO 639-1 language codes are used
  as column headers in the first row. Will MODIFY input csv to add a
  column with the translations.

  Args:
      csv_filepath: path to csv file
      translator: Translator object to use for translation.
      new_column_name: header for the column to add
      source_column_index: index of column to translate. 0-indexed.
                              Defaults to the 0-th column.
      source_column_name: header of the column to translate. If provided,
                          source_column_index will be ignored.
      input_lang: source language, as ISO 639-1 language code.
                  if not provided, will default to using the translate API's
                  auto language detection.
      output_lang: target language, as ISO 639-1 language code
  """
  with open(csv_filepath, "r+") as f:
    df = pd.read_csv(f, header=0, skip_blank_lines=True)
    headers = df.columns

    # Get column to translate
    col_name = headers[0]
    if source_column_name in headers:
      col_name = source_column_name
    elif source_column_index and source_column_index < len(headers):
      col_name = headers[source_column_index]

    # Extract input language code from csv headers is input_lang is not provided
    # Will use column header as input language if the header is a valid
    # ISO 639-1 language code
    input_lang_code = input_lang
    if not input_lang and col_name in translator.supported_languages:
      input_lang_code = col_name

    # Call translate function
    text_to_translate = df[col_name].values.tolist()
    translations = translator.translate_multiple_queries(
        texts=text_to_translate,
        input_lang=input_lang_code,
        output_lang=output_lang)

    # Write new column
    df[new_column_name] = translations
    df.to_csv(csv_filepath, index=False)


def main(argv):

  # get all csv filepaths to process
  csv_filepaths = []
  for input_path in argv[1:]:
    if input_path.endswith(CSV_FILE_EXTENSION):
      csv_filepaths.append(input_path)
    else:
      csv_filepaths += glob.glob(os.path.join(input_path,
                                              f"*{CSV_FILE_EXTENSION}"),
                                 recursive=True)

  # process all csvs
  translator = Translator(project_id=FLAGS.gcloud_project_id)
  for csv in csv_filepaths:
    process_csv(csv_filepath=csv,
                translator=translator,
                new_column_name=FLAGS.new_column_name,
                source_column_index=FLAGS.source_column_index,
                source_column_name=FLAGS.source_column_name,
                output_lang=FLAGS.output_language)


if __name__ == "__main__":
  app.run(main)
