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

import json
import logging
import os

import requests

_API_KEY = os.getenv("OPENAI_API_KEY")
_API_URL = "https://api.openai.com/v1/chat/completions"
_MODEL_NAME = "gpt-3.5-turbo"
# Using 0.5 so that all responses are not the same nor vary wildly.
# Reference: https://screenshot.googleplex.com/v2FACUjXsdZnAXN
_TEMPERATURE = 0.5


def get_summary(name: str, csv: str):
  prompt = f"Give me a one sentence NL summary based on the following info for {name}:\n\n{csv}"
  params = {
      "model": _MODEL_NAME,
      "messages": [{
          "role": "user",
          "content": prompt
      }],
      "temperature": _TEMPERATURE
  }
  headers = {
      "Content-Type": "application/json",
      "Authorization": f"Bearer {_API_KEY}"
  }
  response = requests.post(url=_API_URL, json=params, headers=headers).json()
  logging.debug("LLM response:\n%s", json.dumps(response, indent=1))

  return response.get("choices", [{}])[0].get("message", {}).get("content", "")
