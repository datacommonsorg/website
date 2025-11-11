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

from typing import Dict, Any
import json
from dc_tool import ask_data_commons

def verify_claim(claim: Dict[str, Any]) -> Dict[str, Any]:
    response = ask_data_commons(claim)

    return {
        "original_claim": claim,
        "verification_verdict": response,
        "provider": "Vertex AI (google-genai SDK)"
    }