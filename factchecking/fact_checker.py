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
from typing import Dict, Any, Tuple, List


class FactChecker:
    def __init__(self, provider: LLMProvider, datcom_agent=None):
        self.provider = provider
        self.datcom_agent = datcom_agent

    def generate_claims(self, user_queries: List[str], dry_run: bool = False) -> Dict[str, Any]:
        print(f"--- Step 1: Generating Claims ({type(self.provider).__name__}) ---")
        facts = []
        for user_query in user_queries:
            print(f"\nGenerating claims for query: {user_query}")
            facts.extend(self.provider.extract_statistics(user_query))
            time.sleep(4)  # To avoid rate limits in real scenarios

        print(f"Found {len(facts)} statistical claims.\n")
        if not dry_run:
            with open('claims/' + self.provider.__class__.__name__ + '_claims.json', 'w', encoding='utf-8') as f:
                json.dump(facts, f, indent=4)
        return facts
    
    def ingest_claims(self, filepath: str) -> Dict[str, Any]:
        with open(filepath, 'r', encoding='utf-8') as f:
            facts = json.load(f)
        return facts

    async def verify_claims(self, facts: Dict[str, Any], dry_run: bool = False) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if not facts:
            print("No statistical claims found to verify.")
            return {}, {}

        print("\n--- Step 2: Verifying all Claims ---")
        claim_index = 0
        verdict_counts = {
            "SUPPORTED": 0,
            "DISPUTED": 0,
            "UNSUPPORTED": 0,
            "OTHER": 0,
        }
        verification_outputs = []
        for fact in facts:
            print(f"\"\nVerifying Claim #{claim_index + 1}: {fact}")
            claim_index += 1
            try:
                result = await verify_claim(fact, self.datcom_agent)

                verification = result.get("verification_verdict", {})
                print(verification)

                verdict = verification.get("verdict", "OTHER").upper()
                if verdict in verdict_counts:
                    verdict_counts[verdict] += 1
                else:
                    verdict_counts["OTHER"] += 1

                claim_verification_output = {
                    "claim": fact,
                    "verification": verification
                }
                verification_outputs.append(claim_verification_output)
            except Exception as e:
                print(f"Error verifying claim: {e}")
                verdict_counts["OTHER"] += 1
                break

            print("-" * 40)
            time.sleep(10)  # To avoid rate limits in real scenarios
        
        print("\n--- Final Tally ---")
        print(json.dumps(verdict_counts, indent=4))

        if not dry_run:
            with open('verifications/' + self.provider.__class__.__name__ + '_verifications_mcp_server.json', 'w', encoding='utf-8') as f:
                json.dump(verification_outputs, f, indent=4)
            with open('verifications/' + self.provider.__class__.__name__ + '_summary.json', 'w', encoding='utf-8') as f:
                json.dump(verdict_counts, f, indent=4)

        return verification_outputs, verdict_counts


    async def generate_and_verify_claims(self, user_queries: List[str], dry_run: bool = False):
        facts = self.generate_claims(user_queries, dry_run=dry_run)
        await self.verify_claims(facts, dry_run=dry_run)

    async def ingest_and_verify_claims(self, dry_run: bool = False):
        facts = self.ingest_claims('claims/' + self.provider.__class__.__name__ + '_claims.json')
        await self.verify_claims(facts, dry_run=dry_run)


        