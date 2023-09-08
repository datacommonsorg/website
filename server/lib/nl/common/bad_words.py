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

from dataclasses import dataclass
from dataclasses import field
from typing import Dict, List

from server.lib.config import GLOBAL_CONFIG_BUCKET
from shared.lib import gcs

BAD_WORDS_FILE = 'nl_bad_words.txt'
_DELIM = ':'


@dataclass
class Entry:
  # Set to true if this is a single word!
  is_singleton: bool

  # This entry has phrases.
  #
  # In case of "very bad dog", "very bad cow"
  # We will have: ["very bad dog", "very bad cow"]
  #
  phrases: List[str] = field(default_factory=list)

  # This is a multi-word entry, with the other words.
  # Each string is a word.
  #
  # In case of "idiot:cat:bat", only if idiot, bat and cat
  # appear in the query (regardless of ordering),
  # will we match.  We will have: ["cat", "idiot"]
  other_words: List[str] = field(default_factory=list)


@dataclass
class BadWords:
  # The key is a word.  If the value is empty, then
  # its a single word.  If it is non-empty then it is
  # part of a multi-word filter where every other word
  # must match!
  words: Dict[str, Entry]


#
# Loads a list of bad words from a text file.
#
def load_bad_words() -> BadWords:
  local_file = gcs.download_file(bucket=GLOBAL_CONFIG_BUCKET,
                                 filename=BAD_WORDS_FILE)
  return load_bad_words_file(local_file)


def load_bad_words_file(local_file: str, validate: bool = False) -> BadWords:
  bad_words = BadWords(words={})

  with open(local_file) as fp:
    for line in fp:
      line = line.strip().lower()
      # Remove extra spaces between words
      line = ' '.join(line.split())
      # Ignore comments
      if line.startswith('#') or line.startswith('//'):
        continue

      # Generally, be resilient to duplicates.  Only assert when `validate` is set.
      if _DELIM in line:
        # NOTE: in this case words should not have spaces in them!
        words = sorted([w.strip() for w in line.split(_DELIM) if w.strip()])
        if words[0] not in bad_words.words:
          bad_words.words[words[0]] = Entry(is_singleton=False)
        bad_words.words[words[0]].other_words = words[1:]

        if validate:
          assert ' ' not in line, f'Line {line} has a ":" and a phrase!'
          for w in words:
            if w in bad_words.words:
              assert not bad_words.words[
                  w].is_singleton, f'{line} is redundant because {w} already exists!'

      elif ' ' in line:
        # This is the case of a phrase.
        parts = line.split(' ', 1)
        if parts[0] not in bad_words.words:
          bad_words.words[parts[0]] = Entry(is_singleton=False)
        bad_words.words[parts[0]].phrases.append(parts[1])

        if validate:
          for w in line.split():
            if w in bad_words.words:
              assert not bad_words.words[
                  w].is_singleton, f'{line} is redundant because {w} already exists!'
      else:
        # Singleton case.
        if line not in bad_words.words:
          bad_words.words[line] = Entry(is_singleton=True)
        else:
          bad_words.words[line].is_singleton = True

        if validate:
          ow = bad_words.words[line].other_words
          assert not ow, f'{line} makes redundant {ow}'
          ph = bad_words.words[line].phrases
          assert not ph, f'{line} makes redundant {ph}'

  return bad_words


def validate_bad_words():
  local_file = gcs.download_file(bucket=GLOBAL_CONFIG_BUCKET,
                                 filename=BAD_WORDS_FILE)
  load_bad_words_file(local_file, validate=True)


#
# Returns false if the query contains any bad word.
#
def is_safe(query: str, bad_words: BadWords) -> bool:
  qwords = [w.strip() for w in query.split() if w.strip()]
  qwset = set(qwords)
  for word in qwords:
    entry = bad_words.words.get(word)
    if entry:
      if entry.is_singleton:
        # Single-word badword!
        return False

      for ph in entry.phrases:
        if ph in query:
          # The entire phrase matches!
          return False

      if entry.other_words and all([bw in qwset for bw in entry.other_words]):
        # Every other bad-word also exists in the query.
        return False

  return True
