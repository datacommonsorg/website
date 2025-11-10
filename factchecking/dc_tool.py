from google import genai
from google.genai import types
import datacommons as dc
import json
import os

# --- 1. Setup & Auth ---
try:
    API_KEY = os.getenv('GENAI_API_KEY')
except Exception:
    # If neither works, use a hardcoded (but invalid) key as a last resort
    API_KEY = "YOUR_API_KEY" # Replace with a valid key if needed

# genai.configure(api_key=API_KEY)
client = genai.Client(api_key=API_KEY)


# --- 2. Tool Definition ---
def get_datacommons_stat(place_dcid: str, stat_var_dcid: str, date: str | None = None) -> str:
    """Retrieves a statistical value from Data Commons."""
    print(f"   ---> 🏃 RUNNING PYTHON FUNCTION: get_datacommons_stat({place_dcid}, {stat_var_dcid})")
    try:
        # Actual call to standard Data Commons library
        value = dc.get_stat_value(place_dcid, stat_var_dcid, date)
        return json.dumps({"value": value, "source": "Data Commons API"})
    except Exception as e:
        return json.dumps({"error": str(e)})

# CRITICAL: A map to find your function by its string name
function_map = {
    "get_datacommons_stat": get_datacommons_stat
}

# --- 3. Model Configuration ---
dc_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration.from_callable(client=client, callable=get_datacommons_stat)
    ]
)
print("Success! Data Commons tool initialized.")

DC_SYSTEM_PROMPT = """
You are a helpful assistant with access to the Data Commons API.
Your goal is to answer user questions that require statistical data.
- When a user asks for a statistic (e.g., "population of California"), you must use the `get_datacommons_stat` tool.
- To do this, you need to guess the correct Data Commons IDs (DCIDs) for both the `place` and the `stat_var` (statistical variable).
- Here are some common DCIDs to help you:
    - Population: `Count_Person`
    - Life Expectancy: `LifeExpectancy_Person`
    - US States: `geoId/48` (Texas), `geoId/06` (California), `geoId/12` (Florida)
- After you call the tool, you will get a result back.
- If the result contains a 'value', use that value to construct your final answer to the user.
- If the result contains an 'error' or the value is 'NaN', it means the data is not available for the combination you tried. In this case, state that you could not find the data.
- Do not make up data. Only use the information returned by the tool.
"""

# --- 4. Chat Loop ---
def ask_data_commons(query: str):
    print(f"User Query: '{query}'\n" + "-"*40)

    chat = client.chats.create(
        model="gemini-2.5-pro",
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

    response = chat.send_message(query)
    # --- SAFETY BRAKE ---
    max_turns = 3
    current_turn = 0

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