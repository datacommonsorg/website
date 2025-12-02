import os
import json
import re
import itertools
import math
import uuid
import functools
import datacommons as dc
from datacommons_client.client import DataCommonsClient
from google import genai
from google.genai import types
from google.cloud import discoveryengine_v1 as discoveryengine
from google.adk.agents import LlmAgent
from typing import Any
from . import vertex_ai
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from .constants import VERIFICATION_PROMPT

# --- 1. Setup ---
# Ensure you have 'GOOGLE_APPLICATION_CREDENTIALS' set in your env for Vertex AI
# and 'GENAI_API_KEY' for the Gemini API.

# client = genai.Client(api_key=os.getenv('GENAI_API_KEY'))
try:
    api_key = os.getenv('GENAI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("Warning: No API key found in GENAI_API_KEY or GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
except Exception as e:
    print(f"Warning: Could not initialize genai.Client: {e}")
    client = None


# --- 2. Tool Definitions ---
# The SDK uses docstrings and type hints to generate the schema.
# Make sure these are descriptive!

# Global Data Commons Client
_DC_CLIENT = None

def get_dc_client():
    global _DC_CLIENT
    if _DC_CLIENT is None:
        dc_client_args = {
            "api_key": os.getenv("DATACOMMONS_API_KEY"),
        }
        _DC_CLIENT = DataCommonsClient(**dc_client_args)
    return _DC_CLIENT

@functools.lru_cache(maxsize=128)
def ground_place_query(place_query: str) -> dict:
    """
    Finds the most relevant place DCID for a given query string.
    
    Args:
        place_query: A string to search for the place (e.g., "United States").
    """
    print(f"   ---> 🏃 GROUNDING PLACE QUERY: {place_query}")
    try:
        pager = vertex_ai.search(
            project_id='datcom-website-dev',
            location='global',
            engine_id='place-search-app_1762536747176',
            serving_config_id='default_config',
            query=place_query,
            page_size=10,
            page_token=None,
            relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.MEDIUM
        )
        
        results = list(itertools.islice(pager, 10))
        if not results:
            return {"error": "No place found."}

        return [
            {
                'dcid': r.document.struct_data['dcid'], 
                'name': r.document.struct_data['name'], 
                'containedInPlaces': list(r.document.struct_data['containedInPlace'])
            } 
            for r in results
        ]
    except Exception as e:
        return {"error": str(e)}

@functools.lru_cache(maxsize=128)
def ground_statvar_query(stat_var_query: str) -> dict:
    """
    Finds the most relevant statistical variable DCID for a given query string.
    """
    print(f"   ---> 🏃 GROUNDING STATVAR QUERY: {stat_var_query}")
    try:
        pager = vertex_ai.search(
            project_id='datcom-nl',
            location='global',
            engine_id='full-statvar-search-prod-p_1757437817854',
            serving_config_id='default_config',
            query=stat_var_query,
            page_size=10,
            page_token=None,
            relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.MEDIUM
        )
        
        results = list(itertools.islice(pager, 10))
        if not results:
            return {"error": "No statistical variable found."}

        stat_vars = [
            {r.document.struct_data['dcid']: r.document.struct_data['name']} 
            for r in results
        ]
        return stat_vars
    except Exception as e:
        return {"error": str(e)}

def get_ranking_stat(place_dcid: str, stat_var_dcid: str, date: str | None = None) -> dict:
    """
    Retrieves the ranking of a place for a given statistical variable from Data Commons.
    
    Args:
        place_dcid: The Data Commons ID of the place (e.g., "geoId/12").
        stat_var_dcid: The statistical variable DCID (e.g., "Count_Person").
        date: The specific date (e.g., "2023"). If None, gets the latest.
    """
    print(f"   ---> 🏃 FETCHING RANKING: {stat_var_dcid} for {place_dcid} ({date or 'Latest'})")
    return {}

@functools.lru_cache(maxsize=128)
def get_datacommons_stat(place_dcid: str, stat_var_dcid: str, date: str | None = None) -> dict:
    """
    Retrieves a statistical value from Data Commons for a single place and date.
    
    Args:
        place_dcid: The Data Commons ID of the place (e.g., "geoId/12").
        stat_var_dcid: The statistical variable DCID (e.g., "Count_Person").
        date: The specific date (e.g., "2023"). If None, gets the latest.
    """
    print(f"   ---> 🏃 FETCHING: {stat_var_dcid} for {place_dcid} ({date or 'Latest'})")
    try:
        dc2 = get_dc_client()
        data = dc2.observation.fetch(
            variable_dcids=[stat_var_dcid],
            entity_dcids=[place_dcid],
            date='LATEST',
            select=["entity", "variable", "date", "value"],
            filter_facet_ids=[],
        )
        print(f"       Raw data: {data}")

        
        # Handle simple return types (int/float)
        if isinstance(data, (int, float)):
            if math.isnan(data):
                data = None
            return {"value": data, "date": date or "latest", "source": "Data Commons API"}
        
        # Handle dictionary return types (series data)
        if not data or 'series' not in data or not data['series']:
            return {"error": "No data found for this statistical variable."}
        
        series = data.get('series', [])
        
        if date:
            value = next((p['value'] for p in series if date in p['date']), None)
            if value is None:
                 return {"error": f"No data found for the year {date}."}
            obs_date = date
        else:
            latest_point = max(series, key=lambda x: x['date'])
            value = latest_point['value']
            obs_date = latest_point['date']

        if value is not None and isinstance(value, float) and math.isnan(value):
            value = None

        print(f"       Retrieved value: {value} for date: {obs_date}")
        return {"value": value, "date": obs_date, "source": "Data Commons API"}
    except Exception as e:
        print(f"       Error????: {e}")
        return {"error": str(e)}

# --- 3. Dynamic Configuration ---

# Create the tool list directly from functions
tools_list = [ground_place_query, ground_statvar_query, get_datacommons_stat, get_ranking_stat]

# Create a map for execution (replacing your manual map)
# This creates: {'ground_place_query': <func ground_place_query>, ...}
function_map = {func.__name__: func for func in tools_list}

DC_SYSTEM_PROMPT = """
You are a Data Commons assistant.
1. call `ground_statvar_query` and `ground_place_query` in parallel to find DCIDs.
2. Use `get_datacommons_stat` to get actual data using the DCIDs found.
3. Use `get_ranking_stat` if you need rankings and pass in the parent place's DCID.
4. If data is missing, say so. Do not invent numbers.

You may find multiple statistical variables which match the desired intent, they could point to data from different sources or have slightly different definitions. In such cases, you can try to fetch data for multiple statvars and use your judgement to pick the most appropriate one based on the returned data and sources.
For example, you could ground_statvar_query, pick one and get_datacommons_stat. But then try get_datacommons_stat for another grounded statvar and compare the results and sources. You can do this multiple times in a row if needed.
"""

# --- 4. Chat Loop ---
GEMINI_FLASH_MODEL = "gemini-2.5-flash"
GEMINI_PRO_MODEL = "gemini-2.5-pro"
USER_ID="gmechali"
APP_NAME="datacommons-mcp-gmechali"
session_service = InMemorySessionService()

# --- 6. Define Agent Interaction Logic ---
async def call_agent_and_print(
    runner_instance: Runner,
    agent_instance: LlmAgent,
    session_id: str,
    query_json: str
):
    """Sends a query to the specified agent/runner and prints results."""
    print(f"\n>>> Calling Agent: '{agent_instance.name}' | Query: {query_json}")

    user_content = types.Content(role='user', parts=[types.Part(text=query_json)])

    final_response_content = "No final response received."
    async for event in runner_instance.run_async(user_id=USER_ID, session_id=session_id, new_message=user_content):
        # print(f"Event: {event.type}, Author: {event.author}") # Uncomment for detailed logging
        if event.is_final_response() and event.content and event.content.parts:
            # For output_schema, the content is the JSON string itself
            final_response_content = event.content.parts[0].text

    print(f"<<< Agent '{agent_instance.name}' Response: {final_response_content}")

    current_session = await session_service.get_session(app_name=APP_NAME,
                                                  user_id=USER_ID,
                                                  session_id=session_id)
    stored_output = current_session.state.get(agent_instance.output_key)

    # Pretty print if the stored output looks like JSON (likely from output_schema)
    print(f"--- Session State ['{agent_instance.output_key}']: ", end="")
    try:
        # Attempt to parse and pretty print if it's JSON
        parsed_output = json.loads(stored_output)
        print(json.dumps(parsed_output, indent=2))
        return parsed_output
    except (json.JSONDecodeError, TypeError):
         # Otherwise, print as string
        print(stored_output)
    print("-" * 30)
    return final_response_content

def extract_json_from_text(text: str) -> str | None:
    """Extracts the first valid JSON object or list from text."""
    text = text.strip()
    
    # Simple heuristic: find first [ or {
    start_idx = -1
    for i, char in enumerate(text):
        if char in ['{', '[']:
            start_idx = i
            break
            
    if start_idx == -1:
        return None
        
    # Stack-based extraction
    stack = []
    for i in range(start_idx, len(text)):
        char = text[i]
        if char in ['{', '[']:
            stack.append(char)
        elif char in ['}', ']']:
            if not stack:
                continue # Should not happen if we started at a valid open
            
            last_open = stack[-1]
            if (char == '}' and last_open == '{') or (char == ']' and last_open == '['):
                stack.pop()
                if not stack:
                    # Found the matching close for the outermost
                    return text[start_idx : i+1]
            else:
                # Mismatched brackets - this path is likely invalid JSON or we started wrong
                pass
                
    return None

async def ask_data_commons(claim: str, datcom_agent: Any) -> dict:
    
    # call_agent_async is defined in init_mcp.py
    Input = VERIFICATION_PROMPT + str(claim)
    session_id = str(uuid.uuid4())
    # session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
    runner = Runner(agent=datcom_agent, app_name=APP_NAME, session_service=session_service)


    # final_response_text = await call_agent_async(Input, runner=runner, user_id=USER_ID, session_id=SESSION_ID)
    final_response_text = await call_agent_and_print(runner, datcom_agent, session_id, Input)

    if final_response_text:
        # Remove markdown
        final_response_text = final_response_text.replace("```json", "").replace("```", "")
        
        json_str = extract_json_from_text(final_response_text)
        
        if json_str:
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                return {
                    "verdict": "INVALID_JSON",
                    "explanation": f"JSON Decode Error: {e}. String: {json_str}"
                }
        else:
            # Fallback to regex if the stack extractor failed (unlikely but safe)
            match = re.search(r"(\[.*\]|\{.*\})", final_response_text, re.DOTALL)
            if match:
                json_str = match.group(0)
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    return {
                        "verdict": "INVALID_JSON",
                        "explanation": f"JSON Decode Error (Regex): {e}. String: {json_str}"
                    }
            
            return {
                "verdict": "INVALID_JSON",
                "explanation": f"No JSON object found in LLM response: {final_response_text}"
            }
            return {
                "verdict": "INVALID_JSON",
                "explanation": f"No JSON object found in LLM response: {final_response_text}"
            }
    return {"verdict": "NO_RESPONSE", "explanation": "No response generated."}

async def extract_claims_from_text(text: str, datcom_agent: Any) -> list[str]:
    from .constants import EXTRACTION_PROMPT
    
    Input = EXTRACTION_PROMPT + str(text)
    session_id = str(uuid.uuid4())
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
    runner = Runner(agent=datcom_agent, app_name=APP_NAME, session_service=session_service)

    final_response_text = await call_agent_and_print(runner, datcom_agent, session_id, Input)

    if final_response_text:
        # Remove markdown
        final_response_text = final_response_text.replace("```json", "").replace("```", "")
        
        json_str = extract_json_from_text(final_response_text)
        
        if json_str:
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        # Fallback regex
        match = re.search(r"(\[.*\])", final_response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

    return []