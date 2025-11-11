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

from llm_provider import LLMProvider
import time
from utils import verify_claim
import json
from typing import Dict, Any


class FactChecker:
    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def generate_claims(self, user_query: str):
        print(f"--- Step 1: Generating Claims ({type(self.provider).__name__}) ---")
        facts = self.provider.extract_statistics(user_query)
        print(f"Found {len(facts)} statistical claims.\n{facts}")
        with open('claims/' + self.provider.__class__.__name__ + '_claims.json', 'w', encoding='utf-8') as f:
            json.dump(facts, f, indent=4)
        return facts
    
    def ingest_claims(self, filepath: str) -> Dict[str, Any]:
        with open(filepath, 'r', encoding='utf-8') as f:
            facts = json.load(f)
        return facts

    def verify_claims(self, facts: Dict[str, Any]) -> Dict[str, Any]:
        if not facts:
            print("No statistical claims found to verify.")
            return {}

        print("\n--- Step 2: Verifying all Claims ---")
        claim_index = 0
        verdict_counts = {
            "SUPPORTED": 0,
            "DISPUTED": 0,
            "UNSUPPORTED": 0,
            "OTHER": 0,
        }
        for fact in facts:
            print(f"\"\nVerifying Claim #{claim_index + 1}: {fact}")
            claim_index += 1
            result = verify_claim(fact)

            verification = result.get("verification_verdict", {})
            print(verification)

            verdict = verification.get("verdict", "OTHER").upper()
            if verdict in verdict_counts:
                verdict_counts[verdict] += 1
            else:
                verdict_counts["OTHER"] += 1

            print("-" * 40)
            time.sleep(4)  # To avoid rate limits in real scenarios
        
        print("\n--- Final Tally ---")
        print(json.dumps(verdict_counts, indent=4))

        return verdict_counts


    def generate_and_verify_claims(self, user_query: str):
        facts = self.generate_claims(user_query)
        self.verify_claims(facts)

    def ingest_and_verify_claims(self):
        facts = self.ingest_claims('claims/' + self.provider.__class__.__name__ + '_claims.json')
        self.verify_claims(facts)


        