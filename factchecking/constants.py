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
       - IF MULTIPLE PLACES ARE MENTIONED (e.g., "US and China"), EXTRACT SEPARATE CLAIMS FOR EACH PLACE.
    2. IGNORE non-statistical text, navigation menus, footers, ads, and opinions.
    3. For each identified claim, verify it using the Data Commons Tool.
    4. Determine if supported, rate as SUPPORTED/DISPUTED/UNSUPPORTED, and provide a 1-sentence citation explanation.
    5. If you cannot verify a claim using the data commons tool, mark as UNSUPPORTED or omit it if it's not a statistical claim.

    IMPORTANT VERIFICATION RULES:
    - APPROXIMATIONS: If the claimed value is reasonably close to the Data Commons value (e.g., within 10%), rate it as SUPPORTED.
    - DATES: If the claim date differs slightly from the available Data Commons date (e.g., 2023 vs 2024) but the values are consistent, rate it as SUPPORTED.
    - CONTEXT: Consider rounding and unit conversions (e.g., 33k vs 33,121).
    
    Return a JSON list of objects with fields: 
    - "claim_text": The specific statistical claim extracted from the text.
    - "verdict": SUPPORTED, DISPUTED, or UNSUPPORTED.
    - "explanation": A 1-sentence explanation citing the Data Commons value.
    - "place_dcid": The DCID of the place.
    - "place_name": The name of the place (e.g., "United States").
    - "stat_var_dcid": The DCID of the statistical variable.
    - "stat_var_name": The name of the statistical variable (e.g., "Population").
    - "date": The date of the Data Commons value used for verification (e.g., "2021").
    - "source": The source of the data (e.g., "World Bank").
    - "chart_config": An object describing the best visualization for this claim.
        - "type": "LINE", "BAR", "MAP", or "RANKING".
        - "places": List of place DCIDs (for BAR comparison).
        - "variables": List of stat var DCIDs (for BAR comparison).
        - "parent_place_dcid": Parent place DCID (for MAP/RANKING, e.g., "country/USA").
        - "child_place_type": Child place type (for MAP/RANKING, e.g., "State").

    CHART SELECTION RULES:
    - **LINE**: Default for single place/variable trends over time.
    - **BAR**: For comparing multiple places (e.g., "US vs China") or multiple variables.
    - **MAP**: For geographic distribution (e.g., "Unemployment in US States"). Requires `parent_place_dcid` and `child_place_type`.
    - **RANKING**: For top/bottom lists (e.g., "Richest countries"). Requires `parent_place_dcid` and `child_place_type`.

    If no statistical claims are found, return an empty list [].
    
    Example:
    Input: "The population of USA is 400 million. Navigation: Home About. Italy is 60 million."
    Output:
    [
        {
            "claim_text": "The population of USA is 400 million",
            "verdict": "DISPUTED",
            "explanation": "According to Data Commons, the population of USA was 331.9 million in 2021.",
            "place_dcid": "country/USA",
            "place_name": "United States",
            "stat_var_dcid": "Count_Person",
            "stat_var_name": "Population",
            "date": "2021",
            "source": "US Census Bureau",
            "chart_config": {
                "type": "LINE",
                "places": ["country/USA"],
                "variables": ["Count_Person"]
            }
        },
        {
            "claim_text": "Italy is 60 million",
            "verdict": "SUPPORTED",
            "explanation": "According to Data Commons, the population of Italy was 59 million in 2021, which is close to 60 million.",
            "place_dcid": "country/ITA",
            "place_name": "Italy",
            "stat_var_dcid": "Count_Person",
            "stat_var_name": "Population",
            "date": "2021",
            "source": "World Bank",
            "chart_config": {
                "type": "LINE",
                "places": ["country/ITA"],
                "variables": ["Count_Person"]
            }
        }
    ]
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