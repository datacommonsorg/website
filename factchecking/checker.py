import sys
import os
# --- Modern Imports ---
from google import genai
from google.genai import types
import time
import vertexai
import json
from typing import List, Dict, Any
from llm_provider import LLMProvider
from vertex_ai_llm_provider import VertexAIProvider
from open_ai_llm_provider import OpenAIProvider
from anthropic_llm_provider import AnthropicProvider
from utils import verify_claim

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
from typing import List, Dict, Any

QUERY = "What is the Nominal GDP of italy?"

# --- OPTION 1: VERTEX AI ---

# --- OPTION 3: ANTHROPIC ---
# print("\n=== RUNNING WITH ANTHROPIC ===")
# anthropic_provider = AnthropicProvider()
# checker = StatisticalFactChecker(anthropic_provider)
# checker.run_check(QUERY)
