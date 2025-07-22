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

# This script imports a Material Design icon by name in snake_case. (e.g. chevron_left).
# The name of the icon is provided as a parameter.
# With the -r or --react flag, only the React component will be created.
# With the -f or --flask flag, the version for use in the Jinja templates will be created
# With no flag given, both will be created.
#
# This script also supports creating "filled" icons, where the fill axis = 1
# For a visual, see https://developers.google.com/fonts/docs/material_symbols#fill_axis
# With the --include_filled flag, the FILL axis = 1 version of the icon will also be created
# With the --filled_only flag, only the FILL axis = 1 version of the icon will be created
# With no flag given, no filled icon will be created.

import argparse
from datetime import datetime
import os
import sys
import xml.etree.ElementTree as ET

import requests

REACT_COMPONENT_TEMPLATE = """
export const {{ icon component name }} = (
    props: React.SVGProps<SVGSVGElement>
  ): ReactElement => (
    {{ svg }}
  );
"""


def parse_arguments():
  parser = argparse.ArgumentParser(
      description=
      'Download and generate Material Design icons for use in Jinja templates and as React components.'
  )
  parser.add_argument(
      'icon_name',
      type=str,
      help='Name of the icon in snake_case (e.g., chevron_left)')
  parser.add_argument('-r',
                      '--react',
                      action='store_true',
                      help='Generate only the React component version')
  parser.add_argument(
      '-f',
      '--flask',
      action='store_true',
      help='Generate only the SVG version for use in Jinja templates')
  parser.add_argument(
      '--include_filled',
      action='store_true',
      help='Also generate a filled version of the icon',
  )
  parser.add_argument(
      '--filled_only',
      action='store_true',
      help='Only generate the filled version of the icon',
  )
  return parser.parse_args()


def convert_snake_to_camel(icon_name):
  components = icon_name.split('_')
  return ''.join(x.capitalize() for x in components)


def convert_snake_to_title(icon_name):
  components = icon_name.split('_')
  return ' '.join(x.capitalize() for x in components)


def download_svg(icon_name: str, filled: bool = False) -> str:
  """
    Downloads the requested SVG from the Material Design icon repository.
    """
  base_url = 'https://raw.githubusercontent.com/google/material-design-icons/refs/heads/master/symbols/web'
  svg_url = f'{base_url}/{icon_name}/materialsymbolsoutlined/{icon_name}_24px.svg'
  if filled:
    svg_url = f'{base_url}/{icon_name}/materialsymbolsoutlined/{icon_name}_fill1_24px.svg'

  print(f'Downloading SVG from: {svg_url}')
  response = requests.get(svg_url)
  if response.status_code == 200:
    print('SVG download complete.')
    return response.text
  else:
    print(f'Error: Failed to download SVG. Status Code: {response.status_code}')
    return None


def process_svg(svg_content: str) -> str:
  """
    Processes the SVG content to prepare to allow it to be styled through CSS similar to how a font is
    """

  ET.register_namespace('', "http://www.w3.org/2000/svg")

  try:
    root = ET.fromstring(svg_content)
  except ET.ParseError as e:
    print(f'Error parsing SVG: {e}')
    return None

  if 'width' in root.attrib:
    del root.attrib['width']

  root.set('height', '1em')

  root.set('fill', 'currentColor')

  for elem in root.iter():
    if 'fill' in elem.attrib:
      elem.set('fill', 'currentColor')

  processed_svg = ET.tostring(root, encoding='unicode')
  return processed_svg


def save_svg(svg_content: str, output_path: str) -> None:
  """Write SVG content to a file

  Args:
      svg_content: SVG content to write
      output_path: file path to write SVG to
  """
  if not svg_content:
    return
  os.makedirs(os.path.dirname(output_path), exist_ok=True)
  with open(output_path, 'w', encoding='utf-8') as f:
    f.write(svg_content)
  print(f'Saved SVG to {output_path}')


def get_processed_svg(icon_name: str, filled: bool = False) -> str:
  """Get SVG content for a icon that can be styled through CSS

  Args:
      icon_name: name of the icon
      filled: whether to get the filled version of the icon

  Returns:
      SVG content that has attributes added so it can be styled through CSS
      similar to how a font is
  """
  svg_content = download_svg(icon_name, filled)
  if not svg_content:
    sys.exit(1)

  processed_svg = process_svg(svg_content)
  if not processed_svg:
    sys.exit(1)
  return processed_svg


def generate_react_component(icon_name: str, svg_content: str) -> str:
  """Generates a React functional component for the icon
  
  Args:
    icon_name: name of the icon in snake_case
    svg_content: SVG content for the react component to display

  Returns:
    A react functional component that can be inserted into a template.
    If no svg_content is provided, returns empty string.
  """
  if not svg_content:
    return ""

  component_name = convert_snake_to_camel(icon_name)

  svg_tag_start = svg_content.find('<svg')
  svg_tag_end = svg_content.find('>', svg_tag_start)

  # We need to add {...props} so the props of the SVG can be overridden by the component.
  svg_with_props = (svg_content[:svg_tag_end] + ' {...props}' +
                    svg_content[svg_tag_end:])

  component = REACT_COMPONENT_TEMPLATE.replace('{{ icon component name }}',
                                               component_name)
  component = component.replace('{{ svg }}', svg_with_props)
  return component


def write_react_component_to_file(icon_name: str,
                                  react_dir: str,
                                  template_path: str,
                                  react_component: str = "",
                                  filled_react_component: str = "") -> None:
  """Write react component(s) to a .tsx file based on a template file

  Args:
      icon_name: name of the icon in snake_case
      react_dir: directory to write the .tsx file to
      template_path: path to a template file to base the new file on
      react_component: react functional component for the base icon
      filled_react_component: react functional component for the filled icon
  """
  try:
    with open(template_path, 'r', encoding='utf-8') as template_file:
      template = template_file.read()
  except FileNotFoundError:
    print(f'Error: Template file not found at {template_path}.')
    return

  component_file_name = f'{icon_name}.tsx'
  component_path = os.path.join(react_dir, component_file_name)
  with open(component_path, 'w', encoding='utf-8') as f:
    icon_title = convert_snake_to_title(icon_name)
    current_year = datetime.now().year
    component_file_content = template.replace('{{ year }}', str(current_year))
    component_file_content = component_file_content.replace(
        '{{ icon name }}', icon_title)
    component_file_content = component_file_content.replace(
        '{{ react component }}', react_component)
    component_file_content = component_file_content.replace(
        '{{ filled react component }}', filled_react_component)
    f.write(component_file_content)
  print(f'Generated React component at {component_path}')


def main():
  # Parse flags
  args = parse_arguments()
  icon_name = args.icon_name.lower()
  filled_icon_name = f"{icon_name}_filled"
  generate_react_svg = args.react or not (args.react or args.flask)
  generate_flask_svg = args.flask or not (args.react or args.flask)
  generate_filled_icon = args.include_filled or args.filled_only
  generate_base_icon = not args.filled_only

  # Get directory paths
  script_dir = os.path.dirname(os.path.abspath(__file__))
  template_path = os.path.join(script_dir, 'component_template.txt')
  root_dir = os.path.abspath(os.path.join(script_dir, '..', '..', '..'))
  html_icons_dir = os.path.join(root_dir, 'server', 'templates', 'resources',
                                'icons')
  react_icons_dir = os.path.join(root_dir, 'static', 'js', 'components',
                                 'elements', 'icons')

  # Download and process SVGs from Material Design icon repository
  processed_svg = get_processed_svg(icon_name) if generate_base_icon else None
  filled_processed_svg = get_processed_svg(
      icon_name, filled=True) if generate_filled_icon else None

  if generate_flask_svg:
    # Save SVGs to file
    html_svg_path = os.path.join(html_icons_dir, f'{icon_name}.svg')
    save_svg(processed_svg, html_svg_path)
    html_svg_path = os.path.join(html_icons_dir, f'{icon_name}_filled.svg')
    save_svg(filled_processed_svg, html_svg_path)

  if generate_react_svg:
    # Write react component to .tsx file
    react_component = generate_react_component(icon_name, processed_svg)
    filled_component = generate_react_component(filled_icon_name,
                                                filled_processed_svg)
    write_react_component_to_file(icon_name, react_icons_dir, template_path,
                                  react_component, filled_component)


if __name__ == '__main__':
  main()
