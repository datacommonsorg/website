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

from typing import List, Optional

from flask import current_app
from google import genai
from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

from server.lib.nl.explore.gemini_prompts import PAGE_OVERVIEW_PROMPT
from server.lib.utils.gemini_utils import call_structured_output_gemini


class StatVarChartLink(BaseModel):
  """A structure to map the generated overview links to Stat Var charts.
  Attributes:
    stat_var_title: The title of the chart in which the stat var is displayed.
    natural_language: The natural language version of stat_var_title used in the page overview.
  """
  stat_var_title: str
  natural_language: str

  model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PageOverview(BaseModel):
  """The page overview generated based on a query and relevant stat vars

  Attributes:
    overview: A string containing the generated overview.
    stat_var_links: A list of StatVarChartLinks that contain the chart title and how it was used in the overview.
  """
  overview: str
  stat_var_links: list[StatVarChartLink]


_OVERVIEW_GEMINI_CALL_RETRIES = 3

_OVERVIEW_GEMINI_MODEL = "gemini-2.5-flash-lite"


def generate_page_overview(
    query: str,
    stat_var_titles: List[str]) -> tuple[Optional[str], Optional[str]]:
  """ Generates page overview based on the initial query and relevant stat vars

      Args:
      query: The initial query made by the user.
      stat_var_titles: The title of charts for statistical variables that are relevant to the query.

      Returns:
      A tuple containing two items:
        - A string for the generated overview with the stat vars mentioned being marked by angle brackets.
        - A list of StatVarChartLinks that contain how the stat var was used in the overview and the stat var chart title.
  """
  if not stat_var_titles or not query:
    return None, None

  gemini_api_key = current_app.config.get("LLM_API_KEY")
  if not gemini_api_key:
    return None, None

  formatted_page_overview_prompt = PAGE_OVERVIEW_PROMPT.format(
      initial_query=query, stat_var_titles=stat_var_titles)

  page_overview = call_structured_output_gemini(
      api_key=gemini_api_key,
      formatted_prompt=formatted_page_overview_prompt,
      schema=PageOverview,
      gemini_model=_OVERVIEW_GEMINI_MODEL,
      retries=_OVERVIEW_GEMINI_CALL_RETRIES)
  if not page_overview:
    return None, None

  return page_overview.overview, page_overview.stat_var_links
