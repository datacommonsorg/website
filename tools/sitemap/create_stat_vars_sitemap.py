import json
import os
import re
import requests

SITEMAP_OUTPUT_PATH = "../../static/sitemap/stat_vars.txt"

def get_stat_vars_from_github():
    stat_vars = []
    api_url = "https://api.github.com/repos/datacommonsorg/schema/contents/stat_vars"
    response = requests.get(api_url)
    if response.status_code == 200:
        files = response.json()
        for file in files:
            if file['name'].endswith('.mcf'):
                file_url = file['download_url']
                file_content = requests.get(file_url).text
                dcids = extract_dcids(file_content)
                stat_vars.extend(dcids)
    return stat_vars

def extract_dcids(content):
  dcids = []
  for line in content.split('\n'):
    if line.startswith('Node: dcid:'):
      dcid = line.split('Node: dcid:')[1]
      dcids.append(dcid)
  return dcids

def create_sitemap(stat_vars):
  with open(SITEMAP_OUTPUT_PATH, 'w') as f:
    for sv in stat_vars:
      f.write(f'https://datacommons.org/tools/statvar#sv={sv}\n')

if __name__ == '__main__':
  stat_vars = get_stat_vars_from_github()
  create_sitemap(stat_vars)
  print(f"Sitemap created successfully at {SITEMAP_OUTPUT_PATH}")
