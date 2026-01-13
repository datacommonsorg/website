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
"""Module for Gemini calls."""
import logging
from typing import Optional, Union

from google import genai
from pydantic import BaseModel


def call_gemini(
    api_key: str,
    formatted_prompt: str,
    schema: Optional[BaseModel] = None,
    gemini_model: str = "gemini-2.5-flash") -> Optional[Union[BaseModel, str]]:
  """A helper for all Gemini generations through the Python Gen AI client.
    Args:
        api_key: A string representing the API key required for authentication with the Gemini service.
        formatted_prompt: A string containing the structured prompt or input to be sent to the Gemini model for generation.
        schema: A Pydantic BaseModel class that defines the expected model's JSON response.
        gemini_model: A string specifying the name of the Gemini model to utilize.
        retries: An integer indicating the maximum number of retries for the API call in the event of a failure

    Returns:
    The output of the call after all necessary retries.
    """
  if not api_key or not formatted_prompt:
    return None

  generate_content_config = {
      "response_mime_type": "application/json",
      "response_schema": schema
  } if schema else {}
  gemini = genai.Client(api_key=api_key)
  gemini_response = gemini.models.generate_content(
      model=gemini_model,
      contents=formatted_prompt,
      config=generate_content_config)
  if schema and gemini_response and gemini_response.parsed:
    if not gemini_response.parsed:
      return None
    return gemini_response.parsed
  elif gemini_response and gemini_response.text:
    return gemini_response.text

  return None
