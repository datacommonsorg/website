import requests

SITEMAP_OUTPUT_PATH = "../../static/sitemap/stat_vars.txt"

def get_stat_vars_from_github():
    stat_vars = []
    api_url = "https://api.github.com/repos/datacommonsorg/schema/contents/stat_vars"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        files = response.json()
        for file in files:
            if file['name'].endswith('.mcf'):
                file_url = file['download_url']
                try:
                    file_content_response = requests.get(file_url)
                    file_content_response.raise_for_status()
                    file_content = file_content_response.text
                    dcids = extract_dcids(file_content)
                    stat_vars.extend(dcids)
                except requests.exceptions.RequestException as e:
                    print(f"Warning: Failed to download {file['name']}: {e}")
    except requests.exceptions.RequestException as e:
        print(f"Error: Failed to get stat vars from GitHub: {e}")
    return stat_vars

def extract_dcids(content):
  dcids = []
  for line in content.splitlines():
    if line.startswith('Node: dcid:'):
      _, _, dcid = line.partition('Node: dcid:')
      dcid = dcid.strip()
      if dcid:
        dcids.append(dcid)
  return dcids

def create_sitemap(stat_vars):
  with open(SITEMAP_OUTPUT_PATH, 'w') as f:
    for sv in stat_vars:
      f.write(f'https://datacommons.org/tools/statvar#sv={sv}\n')

if __name__ == '__main__':
  stat_vars = get_stat_vars_from_github()
  if stat_vars:
    create_sitemap(stat_vars)
    print(f"Sitemap created successfully at {SITEMAP_OUTPUT_PATH}")
  else:
    print("Warning: No stat vars found or an error occurred. Sitemap not created.")
