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
"""Module for overall explanation."""

import logging
from typing import List

from flask import current_app
from google import genai
from pydantic import BaseModel


class OverallExplanation(BaseModel):
  #   """The overall explanation generated based on a query and relevant stat vars

  #   Attributes:
  #     explanation: A string containing the generated explanation.
  #   """
  explanation: str


_EXPLANATION_GEMINI_CALL_RETRIES = 3

_EXPLANATION_GEMINI_MODEL = "gemini-2.5-flash-lite-preview-06-17"

OVERALL_EXPLANATION_PROMPT = """
Imagine you are a dynamic, trusted, and factual UI copywriter. Use the following tone of voice guidelines as an approach to this task.
Informative: The primary goal is to present data and facts clearly and directly.
Neutral / objective: The language avoids emotional or subjective statements. The focus is on presenting the numbers without bias, opinions or judgments.
Data-driven and factual: The emphasis is on presenting statistical and factual data supported by source citations.
Concise and purposeful: Aim to explain the connection between the variable and the initial user research question. The sentences are generally short and focused on the key relationship between the variable and the research question, while maintaining neutrality and avoiding implications of direct causation.
Straightforward: The writing is clear and to the point, avoiding jargon or overly complex language.  The information is presented in a way that is understandable to an entry level data analyst or data enthusiast.

Write three concise sentences addressing the reserch question by introducing the statistical variables that are found to be relevant to the question.
The first sentence should introduce the research question and connect it to the variable topics without directly addressing the user or the `user's question`. For instance, you can use "To explore $research_question..." or a similar introduction.
The second sentence should highlight how the statistical variables are relevant to exploring the question. For instance, one may emphasize  potential relationships found in the question and variables. 
The last sentence should end the paragraph by cordially stating that it is a starting point, glimpse or something similar.
Maintain a clear, simple, elegant, friendly, and succinct tone. The sentences are intended to guide exploration, not claim a complete answer.
Crucially, write all sentences as if the analysis can be performed rather than the analysis is already performed.
Use a passive voice.

Avoid injecting the code variable name into the sentence, instead replace the name with a human readable version.
Avoid using the word 'analysis', instead jump straight into the variables and the relationships.
Avoid using the word 'we'.

The research question is the following: {initial_query}
The available statistical variables are the following: {stat_vars}

"""


def generate_overall_explanation(query: str, stat_vars: List[str]) -> str:
  #   """ Generates overall explanation based on the initial query and relevant stat vars

  #       Args:
  #       query: The initial query made by the user.
  #       stat_vars: The relevant statistical variables that were identified.

  #       Returns:
  #       A string containing the generated explanation.
  #   """
  if not stat_vars or not query:
    return ""

  gemini_api_key = current_app.config["LLM_API_KEY"]
  if not gemini_api_key:
    return ""

  gemini = genai.Client(api_key=gemini_api_key)
  for _ in range(_EXPLANATION_GEMINI_CALL_RETRIES):
    try:
      gemini_response = gemini.models.generate_content(
          model=_EXPLANATION_GEMINI_MODEL,
          contents=OVERALL_EXPLANATION_PROMPT.format(initial_query=query,
                                                     stat_vars=stat_vars),
          config={
              "response_mime_type": "application/json",
              "response_schema": OverallExplanation
          })

      generated_explanation = gemini_response.parsed.explanation
      return generated_explanation
    except Exception as e:
      logging.error(
          f'[explore_overall_explanation]: Initial Query: {query} | Statistical Variables: {stat_vars} | Exception Caught: {e}',
          exc_info=True)
      continue

  return ""
