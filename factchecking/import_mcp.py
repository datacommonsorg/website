# @title #### **Step 2.** Import required libraries and initialize secrets. {"display-mode":"form"}
# @markdown 👉 Run this cell

# pip3 uninstall -q -y google-genai google-adk
# pip3 install -q google-genai==1.36.0 google-adk==1.14.1

import logging
import os
import warnings
# from google.colab import userdata


logger = logging.getLogger()
logger.setLevel(logging.ERROR)

warnings.filterwarnings(
    "ignore", category=UserWarning, module="google.adk.tools.mcp_tool"
)

DC_API_KEY = None
GENAI_API_KEY = None

# Get and validate DC_API_KEY
try:
    DC_API_KEY = userdata.get("DC_API_KEY")
except userdata.SecretNotFoundError:
    raise ValueError(
        "`DC_API_KEY` not found in Colab secrets. "
        "Please follow the instructions in 'Step 1' to add the secret."
    ) from None
os.environ["DC_API_KEY"] = DC_API_KEY

# Get and validate the Google/Gemini API key
try:
    GENAI_API_KEY = userdata.get("GENAI_API_KEY")
except userdata.SecretNotFoundError:
    try:
        GENAI_API_KEY = userdata.get("GENAI_API_KEY")
    except userdata.SecretNotFoundError:
        raise ValueError(
            "Could not find `GENAI_API_KEY` or `GEMINI_API_KEY` in Colab secrets. "
            "Please follow the instructions in 'Step 1' to set one of these secrets."
        ) from None

os.environ["GENAI_API_KEY"] = GENAI_API_KEY

print("✅ API keys successfully loaded and set.")