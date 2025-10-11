import requests
import logging

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

SITEMAP_OUTPUT_PATH = "../../static/sitemap/stat_vars.txt"


def get_stat_vars_from_github():
    logging.info("Fetching stat vars from GitHub...")
    stat_vars = []
    api_url = "https://api.github.com/repos/datacommonsorg/schema/contents/stat_vars"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        files = response.json()
        logging.info(f"Found {len(files)} files in the repo.")
        for file in files:
            if file['name'].endswith('.mcf'):
                logging.info(f"Processing file: {file['name']}")
                file_url = file['download_url']
                try:
                    file_content_response = requests.get(file_url)
                    file_content_response.raise_for_status()
                    file_content = file_content_response.text
                    dcids = extract_dcids(file_content)
                    logging.info(
                        f"Found {len(dcids)} stat vars in {file['name']}.")
                    stat_vars.extend(dcids)
                except requests.exceptions.RequestException as e:
                    logging.warning(f"Failed to download {file['name']}: {e}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to get stat vars from GitHub: {e}")
    logging.info(f"Total stat vars found: {len(stat_vars)}")
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
    logging.info(f"Creating sitemap at {SITEMAP_OUTPUT_PATH}...")
    with open(SITEMAP_OUTPUT_PATH, 'w') as f:
        for sv in stat_vars:
            f.write(f'https://datacommons.org/browser/{sv}\n')
            f.write(f'https://datacommons.org/tools/statvar#sv={sv}\n')


if __name__ == '__main__':
    logging.info("Starting sitemap creation process.")
    stat_vars = get_stat_vars_from_github()
    if stat_vars:
        create_sitemap(stat_vars)
        print(f"Sitemap created successfully at {SITEMAP_OUTPUT_PATH}")
    else:
        print(
            "Warning: No stat vars found or an error occurred. Sitemap not created."
        )
