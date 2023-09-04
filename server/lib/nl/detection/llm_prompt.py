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
import os

from server.lib.util import get_repo_root


@dataclass
class Prompts:
  # Prompt for full query detection
  detection: str
  # Prompt for safety check.
  safety: str


# Returns LLM prompt texts
def get_prompts() -> Prompts:
  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "palm_prompt.txt")
  with open(filepath, 'r') as f:
    detection = f.read()

  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "palm_prompt_safety.txt")
  with open(filepath, 'r') as f:
    safety = f.read()

  return Prompts(detection=detection, safety=safety)
