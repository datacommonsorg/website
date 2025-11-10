# --- Modern Imports ---
from google import genai
from google.genai import types
import time
import vertexai
import json
from typing import List, Dict, Any
from dc_tool import ask_data_commons

# Assumes you have authenticated in Colab:
# from google.colab import auth
# auth.authenticate_user()

# from google.colab import auth

# 1. Authenticate this Colab runtime with your Google account
# auth.authenticate_user()

# 2. Initialize Vertex AI with your specific project details
# Replace with your actual project ID
PROJECT_ID = "datcom-website-dev" 
LOCATION = "us-central1" 

vertexai.init(project=PROJECT_ID, location=LOCATION)
print(f"Vertex AI initialized for project: {PROJECT_ID}")

import json
from abc import ABC, abstractmethod
from typing import List, Dict, Any

# --- Provider SDK Imports ---
# Wrap in try/except to allow partial execution if some SDKs are missing
try:
    from vertexai.generative_models import (
        GenerativeModel, GenerationConfig, Tool
    )
    print("Vertex AI SDK imported successfully!")
    VERTEX_AVAILABLE = True
except ImportError as e:
    print(f"Import failed: {e}")
    VERTEX_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


# =========================================
# 1. Abstract Base Strategy
# =========================================
class LLMProvider(ABC):
    """
    Abstract base class defining the required behaviors for any LLM provider
    plugged into our Fact Checker.
    """
    
    @abstractmethod
    def extract_statistics(self, user_query: str) -> List[Dict[str, Any]]:
        """Generates an answer and extracts statistical claims as standard JSON."""
        pass

    @abstractmethod
    def verify_claim(self, claim: str) -> Dict[str, Any]:
        """Verifies a specific claim, ideally using external search tools."""
        pass

# =========================================
# 2. Concrete Implementations
# =========================================

# --- A. Google Vertex AI Implementation ---
class VertexAIProvider(LLMProvider):
    def __init__(self, project_id: str, location: str, model_name: str = "gemini-2.5-pro"):
        # unified client for both Vertex AI and AI Studio
        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location
        )
        self.model_name = model_name

    def extract_statistics(self, user_query: str) -> List[Dict[str, Any]]:
        # Standard JSON schema definition
        extraction_schema = {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "claim_text": {"type": "STRING"},
                    "statistic_value": {"type": "NUMBER"},
                    "statistic_unit": {"type": "STRING"},
                    "topic": {"type": "STRING"}
                },
                "required": ["claim_text", "statistic_value", "topic"]
            }
        }

        prompt = f"""
        Answer the user's query in detail. From your answer, extract ANY statistical facts included.
        Return ONLY a JSON list matching the schema.
        User Query: {user_query}
        """

        try:
            print("Hello VAI, lets generate.")
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=extraction_schema,
                    temperature=0.2,
                )
            )
            print("Response from Vertex AI: " + str(response))
            return json.loads(response.text)
        except Exception as e:
            print(f"Extraction failed: {e}")
            return []

    def verify_claim(self, claim: str) -> Dict[str, Any]:
        verification_prompt = f"""
        You are a neutral fact-checker. Verify this claim using Data Commons Tool call..
        Claim: "{claim}"
        Determine if supported, rate as SUPPORTED/DISPUTED/UNSUPPORTED, and provide a 1-sentence citatated explanation. If you cannot verify using the data commons tool, mark as UNSUPPORTED
        """
        
        # --- NEW CLEANER GROUNDING SYNTAX ---
        # if use_google_search:
        #   response = self.client.models.generate_content(
        #       model=self.model_name,
        #       contents=verification_prompt,
        #       config=types.GenerateContentConfig(
        #           tools=[types.Tool(google_search=types.GoogleSearch())],
        #           temperature=0.0
        #       )
        #   )
        print("Verifying Response: ")
        response = ask_data_commons(verification_prompt)
        print(response)

        # Check metadata to confirm search actually happened
        # The new SDK uses slightly different metadata structure
        # grounding_meta = response.candidates[0].grounding_metadata
        # used_search = grounding_meta.search_entry_point is not None if grounding_meta else False

        return {
            "original_claim": claim,
            "verification_verdict": response,
            # "verified_with_external_search": used_search,
            "provider": "Vertex AI (google-genai SDK)"
        }

# --- B. OpenAI Implementation ---
class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        if not OPENAI_AVAILABLE:
            raise ImportError("openai library is not installed.")
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name

    def _mock_web_search(self, query: str) -> str:
        # IN PRODUCTION: Replace this with actual calls to SerpApi/Tavily
        return f"[MOCK SEARCH RESULT] Data found for {query}: Verified by external source."

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

    def verify_claim(self, claim: str) -> Dict[str, Any]:
        # Simulating retrieval by "calling" our mock search
        search_results = self._mock_web_search(claim)
        
        verify_prompt = f"""
        Verify this claim based on the provided search results.
        Claim: {claim}
        Search Results: {search_results}
        Verdict (SUPPORTED/DISPUTED/UNSUPPORTED) and 1 sentence explanation.
        """
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": verify_prompt}],
            temperature=0.0
        )
        
        return {
            "original_claim": claim,
            "verification_verdict": response.choices[0].message.content,
            "verified_with_external_search": True, # Simulated True
            "provider": "OpenAI"
        }

# --- C. Anthropic Implementation ---
class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model_name: str = "claude-3-5-sonnet-20240620"):
        if not ANTHROPIC_AVAILABLE:
             raise ImportError("anthropic library is not installed.")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model_name = model_name

    def extract_statistics(self, user_query: str) -> List[Dict[str, Any]]:
        # Anthropic is great at tool use for extraction. We define a "tool" 
        # that it MUST call with the extracted data.
        extraction_tool = {
            "name": "record_statistics",
            "description": "Record statistical facts extracted from the answer.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "facts": {
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

    def verify_claim(self, claim: str) -> Dict[str, Any]:
        # Simplified verification without real search for this demo
        response = self.client.messages.create(
             model=self.model_name,
             max_tokens=512,
             messages=[
                 {"role": "user", "content": f"Verify this claim based on your internal knowledge (ignoring realtime data need for now): '{claim}'. Verdict: SUPPORTED/DISPUTED/UNSUPPORTED."}
             ]
        )
        return {
            "original_claim": claim,
            "verification_verdict": response.content[0].text,
            "verified_with_external_search": False, # No native grounding here
            "provider": "Anthropic"
        }

# =========================================
# 3. Main Context Class (Unchanged Logic)
# =========================================
class StatisticalFactChecker:
    def __init__(self, provider: LLMProvider):
        # Dependency Injection: The checker doesn't care which provider it gets
        self.provider = provider

    def run_check(self, user_query: str):
        print(f"--- Step 1: Generating & Extracting ({type(self.provider).__name__}) ---")
        facts = self.provider.extract_statistics(user_query)
        print(f"Found {len(facts)} statistical claims.")
        print(f"{facts}")

        if not facts:
            return

        print("\n--- Step 2: Verifying ---")
        for fact in facts:
            claim = fact.get('claim_text')
            print(f"Verifying: '{claim}'...")
            result = self.provider.verify_claim(claim)
            
            print(f"\n[VERDICT via {result.get('provider')}]:")
            print(f"Search Used: {result.get('verified_with_external_search')}")
            print(result['verification_verdict'])
            print("-" * 40)
            time.sleep(4)  # To avoid rate limits in real scenarios

# =========================================
# 4. Execution Example
# =========================================
# Configuration
QUERY = "What is the total population of Florida?"
# print(VERTEX_AVAILABLE)

# --- OPTION 1: VERTEX AI ---
if VERTEX_AVAILABLE:
    print("\n=== RUNNING WITH VERTEX AI ===")
    vertex_provider = VertexAIProvider(project_id="datcom-website-dev", location="us-central1")
    checker = StatisticalFactChecker(vertex_provider)
    checker.run_check(QUERY)

# --- OPTION 2: OPENAI ---
# if OPENAI_AVAILABLE:
#     print("\n=== RUNNING WITH OPENAI ===")
    # openai_provider = OpenAIProvider(api_key="your-api-key-here")
    # checker = StatisticalFactChecker(openai_provider)
    # checker.run_check(QUERY)

# --- OPTION 3: ANTHROPIC ---
# if ANTHROPIC_AVAILABLE:
#      print("\n=== RUNNING WITH ANTHROPIC ===")
    #  anthropic_provider = AnthropicProvider(api_key="your-api-key-here")
    #  checker = StatisticalFactChecker(anthropic_provider)
    #  checker.run_check(QUERY)
