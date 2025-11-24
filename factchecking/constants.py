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
    You are a neutral fact-checker. 
    Analyze the provided text, which may be a full web page or a specific claim.
    
    1. Identify all distinct statistical claims in the text that can be verified using Data Commons (e.g., population, GDP, unemployment, emissions, etc.).
    2. IGNORE non-statistical text, navigation menus, footers, ads, and opinions.
    3. For each identified claim, verify it using the Data Commons Tool.
    4. Determine if supported, rate as SUPPORTED/DISPUTED/UNSUPPORTED, and provide a 1-sentence citation explanation.
    5. If you cannot verify a claim using the data commons tool, mark as UNSUPPORTED or omit it if it's not a statistical claim.
    
    Return a JSON list of objects with fields: "verdict", "explanation", "place_dcid", and "stat_var_dcid".
    If no statistical claims are found, return an empty list [].
    
    Example:
    Input: "The population of USA is 400 million. Navigation: Home About. Italy is 60 million."
    Output:
    [
        {
            "verdict": "DISPUTED",
            "explanation": "According to Data Commons, the population of USA was 331.9 million in 2021.",
            "place_dcid": "country/USA",
            "stat_var_dcid": "Count_Person"
        },
        {
            "verdict": "SUPPORTED",
            "explanation": "According to Data Commons, the population of Italy was 59 million in 2021, which is close to 60 million.",
            "place_dcid": "country/ITA",
            "stat_var_dcid": "Count_Person"
        }
    ]

    Input:
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