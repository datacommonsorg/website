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

from google import genai
from google.genai import types
import json
from typing import List, Dict, Any
from llm_provider import LLMProvider
from constants import EXTRACTION_SCHEMA

GEMINI_PRO_MODEL = "gemini-2.5-pro"
GEMINI_FLASH_MODEL = "gemini-2.5-flash"

# --- A. Google Vertex AI Implementation ---
class VertexAIProvider(LLMProvider):
    def __init__(self, project_id: str, location: str, model_name: str = GEMINI_PRO_MODEL):
        # unified client for both Vertex AI and AI Studio
        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location
        )
        self.model_name = model_name

    def extract_statistics(self, user_query: str) -> List[Dict[str, Any]]:
        prompt = f"""
        Answer the user's query in detail. From your answer, extract ANY statistical facts included.
        Return ONLY a JSON list matching the schema.
        User Query: {user_query}
        """

        try:
            print("Generating extraction response from Vertex AI on model..." + self.model_name)
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=EXTRACTION_SCHEMA,
                    temperature=0.2,
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Extraction failed: {e}")
            return []
