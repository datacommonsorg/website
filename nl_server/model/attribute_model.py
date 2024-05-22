# Copyright 2024 Google LLC
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
"""Model to detect query attributes."""

from typing import List

import en_core_web_sm


class AttributeModel:

  def __init__(self) -> None:
    self.spacy_model_ = en_core_web_sm.load()

  def detect_verbs(self, query: str) -> List[str]:
    try:
      doc = self.spacy_model_(query)
    except Exception as e:
      raise Exception(e)
    result = []
    for token in doc:
      if 'VERB' in token.pos_:
        # checks the dependency relation of the token. Skip if the token is not
        # action related.
        #
        # 'auxpass': passive auxiliary of a clause is a non-main verb like
        # 'was observed', "were seen".
        #
        # 'amod': adjectival modifier which should not be treated as verb.
        if token.dep_ in ['auxpass', 'amod']:
          continue
        result.append(token.text)
    # TODO: consider drop stats related verbs: vary, correlate, compare, rank,
    # have ...
    return result
