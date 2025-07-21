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


def download_svg(icon_name, filled: bool = False ):
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


def process_svg(svg_content):
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


def save_svg(svg_content, output_path):
  os.makedirs(os.path.dirname(output_path), exist_ok=True)
  with open(output_path, 'w', encoding='utf-8') as f:
    f.write(svg_content)
  print(f'Saved SVG to {output_path}')


def generate_react_component(icon_name, svg_content):
  """
    Generates a React .tsx component for the icon based on the template found in "component_template.txt"
    """
  if not svg_content:
    return ""
  
  component_name = convert_snake_to_camel(icon_name)

  svg_tag_start = svg_content.find('<svg')
  svg_tag_end = svg_content.find('>', svg_tag_start)

  # We need to add {...props} so the props of the SVG can be overridden by the component.
  svg_with_props = (svg_content[:svg_tag_end] + ' {...props}' +
                    svg_content[svg_tag_end:])

  component = REACT_COMPONENT_TEMPLATE.replace('{{ icon component name }}', component_name)
  component = component.replace('{{ svg }}', svg_with_props)
  return component

def write_react_component_to_file(icon_name, react_dir, template_path, react_component, filled_react_component):
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
    component_file_content = component_file_content.replace('{{ icon name }}', icon_title)
    component_file_content = component_file_content.replace('{{ react component }}', react_component)
    component_file_content = component_file_content.replace('{{ filled react component }}', filled_react_component)
    f.write(component_file_content)
  print(f'Generated React component at {component_path}')


def main():
  args = parse_arguments()
  icon_name = args.icon_name.lower()
  filled_icon_name = f"{icon_name}_filled"
  generate_react_svg = args.react or not (args.react or args.flask)
  generate_flask_svg = args.flask or not (args.react or args.flask)
  generate_filled_icon = args.include_filled or args.filled_only
  generate_base_icon = not args.filled_only

  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.abspath(os.path.join(script_dir, '..', '..', '..'))

  html_icons_dir = os.path.join(root_dir, 'server', 'templates', 'resources',
                                'icons')
  react_icons_dir = os.path.join(root_dir, 'static', 'js', 'components',
                                 'elements', 'icons')

  template_path = os.path.join(script_dir, 'component_template.txt')

  processed_svg = ""
  if generate_base_icon:
    svg_content = download_svg(icon_name, filled=False)
    if not svg_content:
      sys.exit(1)

    processed_svg = process_svg(svg_content)
    if not processed_svg:
      sys.exit(1)
  
  filled_processed_svg = ""
  if generate_filled_icon:
    filled_svg_content = download_svg(icon_name, filled=True)
    if not filled_svg_content:
      sys.exit(1)
    
    filled_processed_svg = process_svg(filled_svg_content)
    if not filled_processed_svg:
      sys.exit(1)


  if generate_flask_svg:
    if processed_svg:
      html_svg_path = os.path.join(html_icons_dir, f'{icon_name}.svg')
      save_svg(processed_svg, html_svg_path)
    if filled_svg_content:
      html_svg_path = os.path.join(html_icons_dir, f'{icon_name}_filled.svg')
      save_svg(filled_processed_svg, html_svg_path)

  if generate_react_svg:
    react_component = generate_react_component(icon_name, processed_svg)
    filled_component = generate_react_component(filled_icon_name, filled_processed_svg)
    write_react_component_to_file(icon_name, react_icons_dir,
                             template_path, react_component, filled_component)


if __name__ == '__main__':
  main()
