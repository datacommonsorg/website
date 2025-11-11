import itertools
from google import genai
from google.genai import types
import datacommons as dc
import json
import os
import vertex_ai
from google.cloud import discoveryengine_v1 as discoveryengine

import itertools

# --- 1. Setup & Auth ---
try:
    API_KEY = os.getenv('GENAI_API_KEY')
except Exception:
    # If neither works, use a hardcoded (but invalid) key as a last resort
    API_KEY = "YOUR_API_KEY" # Replace with a valid key if needed

# genai.configure(api_key=API_KEY)
client = genai.Client(api_key=API_KEY)


# --- 2. Tool Definition ---
def ground_place_query(place_query: str) -> str:
    """
    Finds the most relevant place DCID for a given query string.
    
    Args:
        place_query: A string to search for the place (e.g., "United States").

    Returns:
        A list of JSON objects containing the DCID, name and list of containedInPlaces of the most relevant places, or an error.
    """
    try:
        pager = vertex_ai.search(project_id='datcom-website-dev',
                                            location='global',
                                            engine_id='place-search-app_1762536747176',
                                            serving_config_id='default_config',
                                            query=place_query,
                                            page_size=1,
                                            page_token=None,
                                            relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.LOW)
        
        results = list(itertools.islice(pager, 20))

        if not results:
            return json.dumps({"error": "No place found."})

        # Extract all DCIDs from the results
        dcids = [{'dcid': result.document.struct_data['dcid'], 'name': result.document.struct_data['name'], 'containedInPlaces': list(result.document.struct_data['containedInPlace'])} for result in results]
        return json.dumps(dcids)

    except Exception as e:
        return json.dumps({"error": str(e)})

def ground_statvar_query(stat_var_query: str) -> str:
    """
    Finds the most relevant statistical variable DCID for a given query string.
    
    Args:
        stat_var_query: A string to search for the statistical variable (e.g., "Population").

    Returns:
        A list of JSON objects containing the DCID and name of the most relevant statistical variables, or an error.
    """
    try:
        pager = vertex_ai.search(project_id='datcom-nl',
                                            location='global',
                                            engine_id='full-statvar-search-prod-p_1757437817854',
                                            serving_config_id='default_config',
                                            query=stat_var_query,
                                            page_size=1,
                                            page_token=None,
                                            relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.LOW)
        
        results = list(itertools.islice(pager, 20))

        if not results:
            return json.dumps({"error": "No statistical variable found."})

        # Extract all DCIDs from the results
        dcids = [{result.document.struct_data['dcid']: result.document.struct_data['name']} for result in results]
        return json.dumps(dcids)

    except Exception as e:
        return json.dumps({"error": str(e)})

def get_datacommons_stat(place_dcid: str, stat_var_dcid: str, date: str | None = None) -> str:
    """
    Retrieves a statistical value from Data Commons for a single place and date.
    
    Args:
        place_dcid: The Data Commons ID of the place (e.g., "geoId/12" for Florida).
        stat_var_dcid: A string to search for the statistical variable (e.g., "Count_Person").
        date: The specific date for the statistic (e.g., "2023"). If not provided, gets the latest.

    Returns:
        A JSON string containing the value, source, and date of the statistic, or an error.
    """
    print(f"   ---> 🏃 RUNNING PYTHON FUNCTION: get_datacommons_stat({place_dcid}, {stat_var_dcid}, date={date})")
    try:
        # Get the data point
        data = dc.get_stat_value(place_dcid, stat_var_dcid, date=date)
        print(f"Retrieved data: {data}")
        
        if isinstance(data, (int, float)):
            value = data
            obs_date = date if date else "latest" # Assuming 'date' is the observation date if provided, else 'latest'
            return json.dumps({"value": value, "date": obs_date, "source": "Data Commons API"})
        
        if not data or 'series' not in data or not data['series']:
            return json.dumps({"error": "No data found for this statistical variable."})
        
        series = data.get('series', [])
            
        # Find the right data point for the given date
        if date:
            # Find the value for the specific year requested
            value = next((p['value'] for p in series if date in p['date']), None)
            if value is None:
                 return json.dumps({"error": f"No data found for the year {date}."})
            obs_date = date
        else:
            # If no date, get the latest value
            latest_point = max(series, key=lambda x: x['date'])
            value = latest_point['value']
            obs_date = latest_point['date']

        return json.dumps({"value": value, "date": obs_date, "source": "Data Commons API"})
    except Exception as e:
        return json.dumps({"error": str(e)})

# CRITICAL: A map to find your function by its string name
function_map = {
    "ground_statvar_query": ground_statvar_query,
    "get_datacommons_stat": get_datacommons_stat,
    "ground_place_query": ground_place_query,
}

# --- 3. Model Configuration ---
dc_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration.from_callable(client=client, callable=get_datacommons_stat),
        types.FunctionDeclaration.from_callable(client=client, callable=ground_statvar_query),
        types.FunctionDeclaration.from_callable(client=client, callable=ground_place_query),
    ]
)
print("Success! Data Commons tool initialized.")

DC_SYSTEM_PROMPT = """
You are a helpful assistant with access to the Data Commons API.
Your goal is to answer user questions that require statistical data.

You have two tools available:

1. `ground_place_query(place_query)`:
   - Use this to find the most relevant place DCID for a given query string.
   - Returns a list of JSON objects with DCID, name, and containedInPlaces.

2. `ground_statvar_query(stat_var_query)`:
   - Use this to find the most relevant statistical variable DCID for a given query string.
   - Returns a list of JSON objects with DCID and name.
   - Example: For the query "Life expectancy", this tool will return [{LifeExpectancy_Person: "The life expectancy at birth "}].

3. `get_datacommons_stat(place_dcid, stat_var_dcid, date)`:
   - Use this for finding a SINGLE statistical value for a specific place.
   - Example: "What was the population of Florida in 2022?"
   - The tool will return a JSON object with `value`, `date`, and `source`. Use these to construct your answer.
   - Remember you must extract the stat var DCID from the ground_statvar_query response to use as stat_var_dcid first.
   - And you must extract the place DCID from the ground_place_query response to use as place_dcid first.


General Instructions:
- First, choose the right tool for the job based on the user's query.
- You need to provide a query for the statistical variable, not a DCID. For example, use "Population" instead of "Count_Person".
- If a tool returns an 'error' or the value is 'NaN', the data is not available. State that you could not find the data.
- Do not make up data. Only use the information returned by the tools.
- Once you've already found a place_dcid or stat_var_dcid, you can reuse it without calling the grounding tools again.
"""

# --- 4. Chat Loop ---
def ask_data_commons(query: str):
    print(f"User Query: '{query}'\n" + "-"*40)

    chat = client.chats.create(
        # model="gemini-2.5-pro",
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=DC_SYSTEM_PROMPT,
            tools=[dc_tool],
            temperature=0.0,
            tool_config=types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(
                    mode=types.FunctionCallingConfigMode.ANY
                )
            )
        )
    )

    try:
        response = chat.send_message(query)
        # --- SAFETY BRAKE ---
        max_turns = 100
        current_turn = 0

        print(f"🤖 Initial Response: {response.candidates}\n")

        while response.candidates and response.candidates[0].content.parts and response.candidates[0].content.parts[0].function_call:
            current_turn += 1
            if current_turn > max_turns:
                 print(f"⚠️ WARNING: Hit max tool turns ({max_turns}). Stopping loop.")
                 break

            call = response.candidates[0].content.parts[0].function_call
            print(f"🤖 Turn {current_turn}: Model requested '{call.name}' with {call.args}")

            func = function_map.get(call.name)
            if func:
                tool_result = func(**call.args)
                print(f"   <--- Result: {tool_result}")
                
                # Send result back to continue the conversation
                response = chat.send_message(
                    types.Part.from_function_response(
                        name=call.name,
                        response={"result": tool_result}
                    )
                )
            else:
                break
        
        print(f"\n✅ FINAL ANSWER:\n{response.text}\n")
        return response.text
    except Exception as e:
        print(f"An error occurred: {e}")
        return "Error: Could not get a response from the model."
