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
import itertools
from typing import Dict, List

from server.lib import config as libconfig
from shared.lib import gcs

cfg = libconfig.get_config()
BAD_WORDS_PATH = gcs.make_path(libconfig.GLOBAL_CONFIG_BUCKET,
                               cfg.BAD_WORDS_FILE)
_DELIM = ':'


@dataclass
class Entry:
  # Set to true if the key of the Entry is a single word.
  is_singleton: bool

  # This entry has phrases beginning with the key of Entry.
  # NOTE: These are full phrases including the word in the key,
  # for convenience of matching.
  #
  # In case of "very bad dog", "very bad cow"
  # We will have: ["very bad dog", "very bad cow"]
  #
  phrases: List[str] = field(default_factory=list)

  # This is a multi-word entry, where we must match every
  # word (in any order) in the query.  When sorted, the first
  # word is the key of Entry, and the remaining words are here.
  # NOTE: The first word only appears in the key, not here.
  # NOTE: entries provided as
  #   "{wordA, wordB, wordC}: {wordX, wordY}""
  #   will be parsed and added to multi-word entries of the form:
  #
  #   "wordA:wordX", "wordA:wordY",
  #   "wordB:wordX", "wordB:wordY",
  #   "wordC:wordX", "wordC:wordY",
  #
  # In case of lines "idiot:cat:bat", "mat:bat" only if
  # all idiot, bat and cat appear in the query, or bat and mat
  # both appear in the query will we match (regardless of ordering),
  # In that case, the key of the Entry will be "bat", and
  # in other_words, we'll have:
  #   [ ["cat", "idiot"], ["mat"] ]
  other_words: List[List[str]] = field(default_factory=list)


@dataclass
class BannedWords:
  # The key is a word.  It is either a singleton word,
  # or the first word in a phrase, or the first sorted
  # word in a multi-word (aka colon-delimited) entry.
  entries: Dict[str, Entry]


EMPTY_BANNED_WORDS = BannedWords(entries={})


#
# Loads a list of bad words from a text file.
#
def load_bad_words() -> BannedWords:
  local_file = gcs.maybe_download(BAD_WORDS_PATH)
  return load_bad_words_file(local_file)


def load_bad_words_file(local_file: str, validate: bool = False) -> BannedWords:
  bad_words = BannedWords(entries={})

  with open(local_file) as fp:
    for line in fp:
      line = line.strip().lower()
      # Remove extra spaces between words
      line = ' '.join(line.split())
      # Ignore comments
      if line.startswith('#') or line.startswith('//'):
        continue

      # Generally, be resilient to duplicates.  Only assert when `validate` is set.
      elif _DELIM in line:
        # Get parts separated by ":"
        delimited_parts = [w.strip() for w in line.split(_DELIM) if w.strip()]
        # Each part is split into components by ","
        lists = [[x.strip()
                  for x in p.split(',')
                  if x.strip()]
                 for p in delimited_parts]

        # Take a cross product across all lists (one element from each list) and
        # use the first word as the key (which will typically belong to the
        # element from the first set.)
        for index_list in list(itertools.product(*lists)):
          words = sorted(list(index_list))
          if words[0] not in bad_words.entries:
            bad_words.entries[words[0]] = Entry(is_singleton=False)
          bad_words.entries[words[0]].other_words.append(words[1:])

        _validate('multi', line, bad_words, validate)

      elif ' ' in line:
        # This is the case of a phrase.
        parts = line.split(' ', 1)
        if parts[0] not in bad_words.entries:
          bad_words.entries[parts[0]] = Entry(is_singleton=False)
        bad_words.entries[parts[0]].phrases.append(line)

        _validate('phrase', line, bad_words, validate)
      else:
        # Singleton case.
        if line not in bad_words.entries:
          bad_words.entries[line] = Entry(is_singleton=True)
        else:
          bad_words.entries[line].is_singleton = True

        _validate('singleton', line, bad_words, validate)

  return bad_words


def validate_bad_words():
  local_file = gcs.maybe_download(BAD_WORDS_PATH)
  load_bad_words_file(local_file, validate=True)


def _validate(mode: str, line: str, bad_words: BannedWords, validate: bool):
  if not validate:
    return
  if mode == 'multi':
    assert ' ' not in line, f'Line {line} has a ":" and a phrase!'
    words = sorted([w.strip() for w in line.split(_DELIM) if w.strip()])
    for w in words:
      if w in bad_words.entries:
        assert not bad_words.entries[
            w].is_singleton, f'{line} is redundant because {w} already exists!'
  elif mode == 'phrase':
    for w in line.split():
      if w in bad_words.entries:
        assert not bad_words.entries[
            w].is_singleton, f'{line} is redundant because {w} already exists!'
  else:
    ow = bad_words.entries[line].other_words
    assert not ow, f'{line} makes redundant {ow}'
    ph = bad_words.entries[line].phrases
    assert not ph, f'{line} makes redundant {ph}'


#
# Returns false if the query contains any bad word.
#
def is_safe(query: str, bad_words: BannedWords) -> bool:
  # If bad words is empty, return True.
  if not bad_words.entries:
    return True

  qwords = [w.strip().lower() for w in query.split() if w.strip()]
  qwset = set(qwords)
  for word in qwords:
    entry = bad_words.entries.get(word)
    if entry:
      if entry.is_singleton:
        # Single-word badword!
        return False

      for ph in entry.phrases:
        if ph in query:
          # The entire phrase matches!
          return False

      for ow_list in entry.other_words:
        if all([ow in qwset for ow in ow_list]):
          # Every other bad-word also exists in the query.
          return False

  return True
