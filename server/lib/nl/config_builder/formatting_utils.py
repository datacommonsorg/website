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
import re

_SPECIAL_REPLACEMENTS = {
    " A ": " a ",
    " At ": " at ",
    " By ": " by ",
    " Of ": " of ",
    " For ": " for ",
    " In ": " in ",
    " As ": " as ",
    " Or ": " or ",
    " On ": " on ",
    " Is ": " is ",
    " And ": " and ",
    " To ": " to ",
    " The ": " the ",
    "Covid": "COVID",
}

# Counts the number of capital letters.
def _count_caps(word: str) -> int:
  return sum(1 for c in word if c.isupper())


# Keep some special words as small case.
def _replace_special(input_string_title_case: str) -> str:
  input = input_string_title_case
  for sr, sr_replace in _SPECIAL_REPLACEMENTS.items():
    input = input.replace(sr, sr_replace)

  # Replace " - " with "-" only if surrounded by a number
  # on both sides.
  matches = re.findall(r'\d+ - \d+', input)
  for m in matches:
    input = input.replace(m, m.replace(" ", ""))

  return input


def make_title_case(input_string: str) -> str:
  # Only title case those parts which aren't already capitalized.
  # This is necessary for words like "GDP" do not become "Gdp".
  # Note that we don't want to title-case words like "7th" etc.
  output_str = ' '.join([
      w.title() if (w.islower() and not w[0].isdigit()) else w
      for w in input_string.split()
  ])
  return _replace_special(output_str)


def make_sentence_case(input_string: str) -> str:
  # Returns a custom sentence_case version of the string.
  # Specifically:
  # 1. Capitalize all first words in a sentence.
  # 2. Do not change the case for words with more than one
  #     capital letter, e.g. "RCP".
  # 3. Do not change the case for words which inlcude numerics,
  #     e.g. "SSP245".
  # 4. Do not split apart numeric numbers and decimals.
  # 5. Lower-case every other word which does not need the above
  #     criteria.
  # 6. Also add a period at the end.
  # Example:
  #     input text: "Relative Max Temperature. Once In Year With 5% Chance: RCP4.5, SP585"
  #     output text: "Relative max temperature. Once in year with 5% chance: RCP4.5, SP585."
  if not input_string:
    return ""

  output_str = ""
  sentences = input_string.split(".")
  for s_index in range(len(sentences)):
    s = sentences[s_index]
    words = s.split()

    if not words:
      continue

    # Only add a space if this is the second sentence onward.
    # and the starting word is not numeric.
    # If the starting word is numeric, then this means the split
    # above by "." had split a decimal number. Shoudl not add a
    # space in that case. 
    # If the start word belongs to the first sentence, no need to
    # add a space as there must have been no "." preceeding it.
    if s_index > 0 and s[0] == " " and not words[0].isnumeric():
      output_str += " "

    # Only capitalize the first word and make everything else
    # lower case, except those words which have multiple caps.
    for i in range(len(words)):
      w = words[i]

      if ((_count_caps(w) > 1) or (not w.isalpha() and w[-1].isalnum())):
        # If there are more than 1 capital letters and
        # if the word isn't all alpha (but the last char is alpha numeric),
        # then do not change anything.
        # Example, "RCP" should not be changed.
        # Example, "SSP245" should not be changed.
        # Example, "W/m" or "w/m" should not be changed.
        # Example, "Some Word:" should be changed to "Some word:".
        w = w
      elif i == 0:
        w = w.title()
      else:
        w = w.lower()

      if i > 0:
        # If the word is not the first one in the sentence,
        # add a space.
        w = f" {w}"

      output_str += w

    output_str += "."

  return output_str

