import json
import os
import re

from absl import app
from absl import flags
from google.cloud import storage
import pandas as pd
import spacy

_INPUT_FOLDER = 'input_files/'
_OUTPUT_FOLDER = 'output_files/'
_POS_GOOD = set(['NOUN', 'PROPN', 'NUM', 'X', 'PUNCT'])
_LETTER_NUMBER_REGEX = r'\w+\d+'
_MAX_SPACY_CHARS = 1000000

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'input_gcs_bucket',
    '',
    'GCS bucket to download input files from. Will not download from gcs if this is not set.',
    short_name='g')


# Downloads files from a gcs bucket to input folder
def get_files_from_gcs(gcs_bucket):
  sc = storage.Client()
  bucket = sc.get_bucket(gcs_bucket)
  blobs = bucket.list_blobs()
  for b in blobs:
    b.download_to_filename(f'{_INPUT_FOLDER}{b.name}')


# Returns a map of entity name to entity type where the entity name is flagged.
# An entity name will be flagged if all its tokens are flagged and there is no
# "-" or ":" within the name.
def _generate_flagged_names(flagged_tokens, name2tokens, name2types):
  flagged_names = {}
  for n, tokens in name2tokens.items():
    if "-" in n or ":" in n:
      continue
    if any([flagged_tokens.get(t, '') == '' for t in tokens]):
      continue
    flagged_names[n] = name2types.get(n, '')
  return flagged_names


# Gets a map of name of entity to type of entity
def _get_name_to_type(file_df):
  name_to_type = {}
  for _, row in file_df.iterrows():
    row_name = str(row['name'])
    name_to_type[row_name] = row['type']
  return name_to_type


# Takes a list of names and chunks it into lists of names where the total number
# of characters in each chunk (when each name is separated by a space) is less
# than the max characters spacy can take
def _get_chunked_names(names):
  chunked_names = []
  curr_chunk_names = []
  curr_char_length = 0
  for name in names:
    if len(name) + curr_char_length + 1 > _MAX_SPACY_CHARS:
      chunked_names.append(curr_chunk_names)
      curr_char_length = 0
    curr_char_length += len(name) + 1
    curr_chunk_names.append(name)
  chunked_names.append(curr_chunk_names)
  return chunked_names


# Gets the flagged tokens and flagged names for a chunk of names
# flagged_tokens is a map of token to its part of sentence for tokens that are
# flagged as possibly being a common word
# flagged_names is a map of name to its entity type for names where all its
# tokens are flagged
def _get_results_for_names(nlp, names, name_to_type):
  if not names:
    return {}, {}

  # Get the part of sentence of each name from spacy
  name_str = ' '.join(names)
  doc = nlp(name_str)

  # map of name to its list of tokens that make up the name
  name_to_tokens = {}
  # index in names list of the current name we are processing
  curr_name_idx = 0
  # the part of the current name that has yet to be processed
  running_curr_name = names[curr_name_idx]
  # map of token to its part of sentence for each flagged token
  flagged_tokens = {}

  # Process each token returned by spacy
  for token in doc:
    # If running_curr_name is empty, we've finished getting the tokens for
    # this name, so move on to the next name
    if not running_curr_name and curr_name_idx < len(names) - 1:
      curr_name_idx += 1
      running_curr_name = names[curr_name_idx]

    # If running_curr_name starts with the token text, that means this token
    # applies to this name. Add the token to name_to_tokens and update
    # running_curr_name. We need a running_curr_name because spacy will tokenize
    # a single name into multiple tokens and we need to match the name back to
    # its tokens.
    # e.g., if we have the names "brilliant blue" and "me" and we pass the nlp
    # "brilliant blue me", we will get back the results for the tokens
    # "brilliant", "blue", and "me". The first running_curr_name will be
    # "brilliant blue" & after processing the first token, running_curr_name
    # will be "blue", and then it will be "" to signify we've processed all the
    # tokens for "brilliant blue", and can move on to the next name.
    if running_curr_name.startswith(token.text):
      curr_name = names[curr_name_idx]
      if not curr_name in name_to_tokens:
        name_to_tokens[curr_name] = []
      name_to_tokens[curr_name].append(token.text)
      running_curr_name = running_curr_name[len(token.text):].strip()

    # Add token to flagged tokens if it is not in _POS_GOOD (_POS_GOOD are part
    # of sentence tags that are likely to not be a common word) and it is not a
    # combination of letters and numbers.
    if token.pos_ not in _POS_GOOD and re.match(_LETTER_NUMBER_REGEX,
                                                token.text) is None:
      flagged_tokens[token.text] = token.pos_

  # Get flagged names
  flagged_names = _generate_flagged_names(flagged_tokens, name_to_tokens,
                                          name_to_type)

  return flagged_tokens, flagged_names


def generate_result_for_file(filename):
  filepath = f'{_INPUT_FOLDER}{filename}.csv'
  print(f'processing: {filepath}')

  # Get all the names to process and their types
  file_df = pd.read_csv(filepath)
  name_to_type = _get_name_to_type(file_df)
  names = list(name_to_type.keys())
  chunked_names = _get_chunked_names(names)

  # Process each chunk of names
  nlp = spacy.load('en_core_web_sm')
  flagged_tokens = {}
  flagged_names = {}
  for _, name_chunk in enumerate(chunked_names):
    chunk_flagged_tokens, chunk_flagged_names = _get_results_for_names(
        nlp, name_chunk, name_to_type)
    flagged_names.update(chunk_flagged_names)
    flagged_tokens.update(chunk_flagged_tokens)

  # Output the results
  with open(f'{_OUTPUT_FOLDER}{filename}_flagged_tokens.json', 'w') as out:
    out.write(json.dumps(flagged_tokens))
  with open(f'{_OUTPUT_FOLDER}{filename}_flagged_names.json', 'w') as out:
    out.write(json.dumps(flagged_names))
  print(f'done processing: {filepath}')


def main(_):
  if FLAGS.input_gcs_bucket:
    get_files_from_gcs(FLAGS.input_gcs_bucket)
  for file in os.listdir(_INPUT_FOLDER):
    filename = os.path.splitext(file)[0]
    generate_result_for_file(filename)


if __name__ == '__main__':
  app.run(main)
