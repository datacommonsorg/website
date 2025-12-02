import json
import os
import sys
from typing import Dict, List, Set

# Constants
CONFIG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))), 'server/config/feature_flag_configs')


def load_configs() -> Dict[str, Dict[str, bool]]:
  """Loads all feature flag configurations from the config directory."""
  configs = {}
  if not os.path.exists(CONFIG_DIR):
    print(f"Error: Config directory not found at {CONFIG_DIR}")
    sys.exit(1)

  for filename in sorted(os.listdir(CONFIG_DIR)):
    if filename.endswith('.json'):
      env_name = filename[:-5]  # Remove .json extension
      file_path = os.path.join(CONFIG_DIR, filename)
      try:
        with open(file_path, 'r') as f:
          flags_list = json.load(f)
          # Convert list of dicts to dict of name: enabled
          flags_dict = {flag['name']: flag['enabled'] for flag in flags_list}
          configs[env_name] = flags_dict
      except json.JSONDecodeError as e:
        print(f"Error parsing {filename}: {e}")
      except Exception as e:
        print(f"Error reading {filename}: {e}")
  return configs


def print_audit_table(configs: Dict[str, Dict[str, bool]]):
  """Prints a matrix of feature flags across environments."""
  if not configs:
    print("No configurations found.")
    return

  # Get all unique flag names
  all_flags: Set[str] = set()
  for env_flags in configs.values():
    all_flags.update(env_flags.keys())

  sorted_flags = sorted(list(all_flags))
  sorted_envs = sorted(list(configs.keys()))

  # Determine column widths
  flag_col_width = max(len(flag) for flag in sorted_flags) + 2
  flag_col_width = max(flag_col_width, 20)
  env_col_width = 12

  # Print Header
  header = f"{'Feature Flag':<{flag_col_width}}"
  for env in sorted_envs:
    header += f"{env:<{env_col_width}}"
  print("-" * len(header))
  print(header)
  print("-" * len(header))

  # Print Rows
  for flag in sorted_flags:
    row = f"{flag:<{flag_col_width}}"
    for env in sorted_envs:
      status = configs[env].get(flag)
      if status is True:
        symbol = "✅"
      elif status is False:
        symbol = "❌"
      else:
        symbol = "MISSING"  # Should not happen if configs are consistent, but good to handle

      # Padding for emoji alignment can be tricky, using simple spacing
      row += f"{symbol:<{env_col_width}}"
    print(row)


def main():
  print(f"Scanning feature flags in: {CONFIG_DIR}\n")
  configs = load_configs()
  print_audit_table(configs)


if __name__ == "__main__":
  main()
