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
from openai import OpenAI
import json
from typing import List, Dict, Any

class OpenAIProvider(LLMProvider):
    def __init__(self, model_name: str = "gpt-4o"):
        self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.model_name = model_name

    def extract_statistics(self, user_query: str) -> List[Dict[str, Any]]:
        # OpenAI works best with "json_object" mode and a strong system prompt, 
        # or "Structured Outputs" (strict=True in tools). Using standard JSON mode for simplicity here.
        
        system_prompt = """
        You are a helpful assistant. Answer the query, then extract statistical facts from your answer.
        Respond with standard JSON ONLY based on this schema:
        [ {"claim_text": str, "statistic_value": number, "statistic_unit": str, "topic": str}, ... ]
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Query: {user_query}. \nOutput MUST be a raw JSON list wrapped in a root object like {{ 'facts': [] }} if necessary for valid JSON."}
                ],
                temperature=0.2
            )
            content = response.choices[0].message.content
            # Handle OpenAI sometimes wrapping lists in a root object despite instructions
            data = json.loads(content)
            if isinstance(data, dict) and 'facts' in data:
                return data['facts']
            return data if isinstance(data, list) else []
        except Exception as e:
            print(f"OpenAI Extraction Error: {e}")
            return []
