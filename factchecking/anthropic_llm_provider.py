# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
from llm_provider import LLMProvider
import anthropic
import json
from typing import List, Dict, Any
from constants import EXTRACTION_SCHEMA

MODEL_NAME = "claude-sonnet-4-20250514"
ANTHROPIC_API_KEY_ENV_VAR = "ANTHROPIC_API_KEY"

class AnthropicProvider(LLMProvider):
    def __init__(self):
        self.client =  anthropic.Anthropic(api_key=os.environ.get(ANTHROPIC_API_KEY_ENV_VAR))
        self.model_name = MODEL_NAME

    def extract_statistics(self, user_query: str) -> List[Dict[str, Any]]:
        # Anthropic is great at tool use for extraction. We define a "tool" 
        # that it MUST call with the extracted data.
        extraction_tool = {
            "name": "record_statistics",
            "description": "Record statistical facts extracted from the answer.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "facts": EXTRACTION_SCHEMA
                },
                "required": ["facts"]
            }
        }

        response = self.client.messages.create(
            model=self.model_name,
            max_tokens=1024,
            tools=[extraction_tool],
            tool_choice={"type": "tool", "name": "record_statistics"}, # Force tool use
            messages=[
                {"role": "user", "content": f"Answer this then extract stats: {user_query}"}
            ]
        )

        # Parse tool use from Anthropic response
        for content in response.content:
            if content.type == 'tool_use' and content.name == 'record_statistics':
                return content.input.get('facts', [])
        return []
