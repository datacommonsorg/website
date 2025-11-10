"""
Configuration settings for running the DC agent and MCP server.
"""

import os

from shared.lib.custom_dc_util import is_custom_dc

# Read env vars needed by the agent / MCP server.
AGENT_MODEL = os.environ.get('AGENT_MODEL', 'gemini-1.5-flash')
DC_API_KEY = os.environ.get('DC_API_KEY', '')
PORT = os.environ.get('PORT', '8080')
WEBSITE_MIXER_API_ROOT = os.environ.get('WEBSITE_MIXER_API_ROOT',
                                        'http://localhost:8081')
WEBSITE_ROOT = f'http://localhost:{PORT}'


def get_mcp_env() -> dict[str, str]:
  """Returns a dict of environment variables for the MCP server based on its running mode (base or custom)."""
  if is_custom_dc():
    return {
        'DC_API_KEY': DC_API_KEY,
        'DC_TYPE': 'custom',
        'CUSTOM_DC_URL': WEBSITE_ROOT,
    }

  return {
      'DC_API_ROOT': f'{WEBSITE_MIXER_API_ROOT}/v2',
      'DC_SEARCH_ROOT': WEBSITE_ROOT,
  }
