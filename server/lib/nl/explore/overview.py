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
"""Module for page overview."""

import logging
from typing import List, Optional

from flask import current_app
from google import genai
from pydantic import BaseModel

from server.lib.nl.explore.gemini_prompts import PAGE_OVERVIEW_PROMPT


class StatVarLink(BaseModel):
  """A structure to map the generated overview links to Stat Var charts.
  Attributes:
    stat_var_title: The title of the chart in which the stat var is displayed.
    natural_language: The natural language version of stat_var_title used in the page overview.
  """
  stat_var_title: str
  natural_language: str


class PageOverview(BaseModel):
  """The page overview generated based on a query and relevant stat vars

  Attributes:
    overview: A string containing the generated overview.
    stat_var_links: A list of StatVarLinks that contain the chart title and how it was used in the overview.
  """
  overview: str
  stat_var_links: list[StatVarLink]


_OVERVIEW_GEMINI_CALL_RETRIES = 3

_OVERVIEW_GEMINI_MODEL = "gemini-2.5-flash-lite"


def generate_page_overview(
    query: str, stat_vars: List[str]) -> tuple[Optional[str], Optional[str]]:
  """ Generates page overview based on the initial query and relevant stat vars

      Args:
      query: The initial query made by the user.
      stat_vars: The relevant statistical variables that were identified.

      Returns:
      A string containing the generated overview.
  """
  if not stat_vars or not query:
    return None, None

  gemini_api_key = current_app.config.get("LLM_API_KEY")
  if not gemini_api_key:
    return None, None

  gemini = genai.Client(api_key=gemini_api_key)
  for _ in range(_OVERVIEW_GEMINI_CALL_RETRIES):
    try:
      gemini_response = gemini.models.generate_content(
          model=_OVERVIEW_GEMINI_MODEL,
          contents=PAGE_OVERVIEW_PROMPT.format(initial_query=query,
                                               stat_vars=stat_vars),
          config={
              "response_mime_type": "application/json",
              "response_schema": PageOverview
          })

      generated_overview = gemini_response.parsed.overview
      stat_var_links = gemini_response.parsed.stat_var_links
      return generated_overview, stat_var_links
    except Exception as e:
      logging.error(
          f'[explore_page_overview]: Initial Query: {query} | Statistical Variables: {stat_vars} | Exception Caught: {e}',
          exc_info=True)
      continue

  return None, None
