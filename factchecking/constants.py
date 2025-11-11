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

VERIFICATION_PROMPT = """
    You are a neutral fact-checker. Verify this claim using Data Commons Tool call..
    Determine if supported, rate as SUPPORTED/DISPUTED/UNSUPPORTED, and provide a 1-sentence citatated explanation. If you cannot verify using the data commons tool, mark as UNSUPPORTED
    Return a JSON object with fields: "verdict" and "explanation".
    Claim:
    """

EXTRACTION_SCHEMA = {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "claim_text": {"type": "string"},
                                "statistic_value": {"type": "number"},
                                "statistic_unit": {"type": "string"},
                                "topic": {"type": "string"}
                            },
                            "required": ["claim_text", "statistic_value", "topic"]
                        }
                    }