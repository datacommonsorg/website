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
#
# Helper functions to query the PaLM API for Alternate Sentence Generation.
import requests
import json
import time

from typing import List

API_HEADER = {'content-type': 'application/json'}


def _get_alternates(url, req_data, req_headers):
  r = requests.post(url, data=req_data, headers=req_headers)
  return r.json()


def _split_response_alternates(resp, timeout) -> List[str]:
  candidates = resp.get("candidates", [])
  if not candidates:
    print(f"Response had no candidates. Full response: {resp}")
    time.sleep(timeout)
    return []

  # Post process the response to remove various unneeded artifacts.
  content = candidates[0]["content"]
  if ":" in content:
    content = content.split(":")[1]

  alts = content.split(";")
  if not alts:
    print(f"Unexpected response format. Response: \n{content}")
    return []

  for i in range(len(alts)):
    alts[i] = alts[i].strip().replace(".", "").replace("*",
                                                       "").replace("\\",
                                                                   "").strip()

    if "\n" in alts[i]:
      alts[i] = alts[i].split("\n")[0].strip()

  return alts


def palm_api_call(palm_api_url: str, text: str, temperature: float,
                  timeout: int) -> List[str]:
  prompt_base = (
      "Suggest three alternate ways of saying the following sentence. Combine all alternate phrasings in a single sentence, delimited by a semi colon. Also, end with a semi colon."
      "\n"
      "Sentence:")
  prompt_req = prompt_base + text

  req_data = {
      "prompt": {
          "context":
              "Given a sentence, only provide alternate ways of phrasing the sentence.",
          "messages": {
              "content": prompt_req,
          },
          "examples": {
              "input": {
                  "content": "Sentence: Number of People With All Teeth Loss",
              },
              "output": {
                  "content":
                      "Total count of individuals who have lost all of their teeth; The number of people who are fully edentulous; Individuals who are without any teeth; Total population with complete loss of teeth; The count of individuals who have no natural teeth left;"
              },
          },
      },
      "temperature": temperature,
      "candidateCount": 1,
  }

  # set the headers.
  req_data = json.dumps(req_data)
  resp = _get_alternates(palm_api_url, req_data, API_HEADER)
  alts = _split_response_alternates(resp, timeout)
  return alts
