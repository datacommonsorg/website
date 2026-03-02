# Copyright 2024 Google LLC
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
"""Build the schema embeddings input CSV from core_schema.mcf."""

import csv
import os
import re

from absl import app
from absl import flags

FLAGS = flags.FLAGS

flags.DEFINE_string('schema_path', 'core_schema.mcf',
                    'Path to the core_schema.mcf file.')
flags.DEFINE_string('output_path', 'input/schema/schema_nodes.csv',
                    'Path to the output CSV file.')


def parse_mcf(file_path):
  """Parses an MCF file and yields nodes."""
  # Read nodes for one file at a time
  files = file_path.split(',')
  for file in files:
    with open(file.strip(), 'r') as f:
      content = f.read()

    # Split by empty lines to get blocks, but handle multiple newlines
    blocks = re.split(r'\n\s*\n', content)

    for i, block in enumerate(blocks):
      node = {}
      lines = block.strip().split('\n')
      for line in lines:
        if not line:
          continue
        # Handle multi-line descriptions if necessary, but for now assume single line or simple structure
        # A simple regex to capture key: value
        match = re.match(r'^([^:]+):\s*(.*)$', line)
        if match:
          key = match.group(1).strip()
          value = match.group(2).strip()
          # Remove quotes if present
          if value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
          
          # Handle multiple values for same key (e.g. typeOf)
          if key in node:
              if isinstance(node[key], list):
                  node[key].append(value)
              else:
                  node[key] = [node[key], value]
          else:
              node[key] = value
        # else:
          # print(f"DEBUG: No match for line: '{line}'")
      
      if 'Node' in node:
        yield node


def main(_):
  schema_path = FLAGS.schema_path
  output_path = FLAGS.output_path

  print(f"Reading schema from: {schema_path}")
  print(f"Writing CSV to: {output_path}")

  # Ensure output directory exists
  os.makedirs(os.path.dirname(output_path), exist_ok=True)

  with open(output_path, 'w', newline='') as csvfile:
    fieldnames = ['dcid', 'sentence']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()

    count = 0
    for node in parse_mcf(schema_path):
      dcid = node.get('Node')
      if not dcid:
          continue
      
      # Remove 'dcid:' prefix if present
      if dcid.startswith('dcid:'):
        dcid = dcid[5:]

      type_of = node.get('typeOf')
      if not type_of:
        continue
      
      # Normalize type_of to list
      if isinstance(type_of, str):
          type_of = [type_of]
      
      # Check if it's a Class, Property, or Enum
      is_schema_node = False
      for t in type_of:
          if t in ['dcid:Class', 'dcid:Property', 'Class', 'Property']:
              is_schema_node = True
              break
          if 'Enum' in t: # Heuristic
              is_schema_node = True
      
      # Also check subClassOf for Enumeration
      sub_class_of = node.get('subClassOf')
      if isinstance(sub_class_of, str):
          sub_class_of = [sub_class_of]
      if sub_class_of:
          for s in sub_class_of:
              if s in ['dcid:Enumeration', 'Enumeration']:
                  is_schema_node = True
                  break
      
      if not is_schema_node:
          continue

      description = node.get('description')
      name = node.get('name')
      
      sentences = []
      if name:
          sentences.append(name)
      if description:
          # Description might be a list if multiple lines were treated as such, or just a string
          if isinstance(description, list):
              sentences.extend(description)
          else:
              sentences.append(description)
      
      if not sentences:
          continue
          
      # Join with semi-colon
      sentence_str = '; '.join(sentences)
      # Convert camelCase to space-separated words
      sentence_str = re.sub(r'([a-z0-9])([A-Z]+)', r'\1 \2', sentence_str)
      
      writer.writerow({'dcid': dcid, 'sentence': sentence_str})
      count += 1

  print(f"Processed {count} nodes.")

if __name__ == '__main__':
  app.run(main)
