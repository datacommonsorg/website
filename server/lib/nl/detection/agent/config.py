# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
Configuration settings for running the DC agent and MCP server.
"""

import os

from shared.lib.custom_dc_util import is_custom_dc

# TODO(keyurs): Update to release version once the new package is released.
MCP_SERVER_VERSION = "1.1.2rc1"

# Read env vars needed by the agent / MCP server.
AGENT_MODEL = os.environ.get("AGENT_MODEL", "gemini-2.5-flash")
DC_API_KEY = os.environ.get("DC_API_KEY", "")
PORT = os.environ.get("PORT", "8080")
WEBSITE_MIXER_API_ROOT = os.environ.get("WEBSITE_MIXER_API_ROOT",
                                        "http://localhost:8081")
WEBSITE_ROOT = f"http://localhost:{PORT}"


def get_mcp_env() -> dict[str, str]:
  """Returns a dict of environment variables for the MCP server based on its running mode (base or custom)."""
  if is_custom_dc():
    return {
        "DC_API_KEY": DC_API_KEY,
        "DC_TYPE": "custom",
        "CUSTOM_DC_URL": WEBSITE_ROOT,
    }

  return {
      "DC_API_ROOT": f"{WEBSITE_MIXER_API_ROOT}/v2",
      "DC_SEARCH_ROOT": WEBSITE_ROOT,
  }
