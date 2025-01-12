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

# This script scrapes the data sources from the old data source pages
# and converts them into JSON ready for display within the data source
# pages on the primary website.
#
# A note that this script may be temporary, as the data sources could
# eventually be compiled into JSON from source and copied into this
# repository.

import os
import requests
from bs4 import BeautifulSoup, Tag
from markdownify import markdownify as md
import json
from urllib.parse import urlparse
import re

from dataclasses import dataclass, asdict
from typing import List, Optional

BASE_URL = "https://docs.datacommons.org/datasets/"
ENDPOINTS = [
    "Demographics.html",
    "Economy.html",
    "Crime.html",
    "Energy.html",
    "Environment.html",
    "Agriculture.html",
    "Education.html",
    "Housing.html",
    "Health.html"
]
OUTPUT_DIR = "../../static/js/apps/data"
OUTPUT_FILENAME = "data_sources.json"

@dataclass
class DataSource:
    label: str
    url: str
    description: Optional[str] = None

@dataclass
class DataSourceGroup:
    label: str
    url: str
    description: Optional[str] = None
    dataSources: List[DataSource] = None

@dataclass
class DataSourceTopic:
    title: str
    slug: str
    dataSourceGroups: List[DataSourceGroup] = None

def slugify(title: str) -> str:
    """Convert a data source category title into a url-friendly slug (for the tabs)."""
    return re.sub(r'[^a-zA-Z0-9\-]', '-', title.lower()).strip('-')

def parse_page(url: str) -> Optional[DataSourceTopic]:
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')

    path = urlparse(url).path
    topic_title = path.split('/')[-1].replace('.html', '')
    topic_slug = slugify(topic_title)

    data_source_topic = DataSourceTopic(
        title=topic_title,
        slug=topic_slug,
        dataSourceGroups=[]
    )

    # The content of the data sources pages begins with the first h3
    first_h3 = soup.find('h3')
    if not first_h3:
        print(f"No data sources found in {url}")
        return data_source_topic

    current_group = None
    for tag in first_h3.find_all_next():
        if isinstance(tag, Tag):
            if tag.name == 'h3':
                # each h3 represents a data source group, the highest level category
                # it will contain an overall href, a description, and potentially
                # children.
                a_tag = tag.find('a')
                if a_tag and 'href' in a_tag.attrs:
                    group_label = a_tag.get_text(strip=True)
                    group_url = a_tag['href']
                else:
                    group_label = tag.get_text(strip=True)
                    group_url = ""

                # with a new h3, we begin a new data source group
                current_group = DataSourceGroup(
                    label=group_label,
                    url=group_url,
                    description=None,
                    dataSources=[]
                )
                data_source_topic.dataSourceGroups.append(current_group)

                # the content of a data source group lies between the beginning
                # of it and either the next group (h3) or the first children (h4).
                content_elements = []
                for sibling in tag.next_siblings:
                    if isinstance(sibling, Tag):
                        if sibling.name in ['h3', 'h4']:
                            break
                        content_elements.append(str(sibling))
                if content_elements:
                    description_html = ''.join(content_elements)
                    description_md = md(description_html).strip()
                    if description_md:
                        current_group.description = description_md

            elif tag.name == 'h4' and current_group:
                # with a new h4, we begin a new data source
                a_tag = tag.find('a')
                if a_tag and 'href' in a_tag.attrs:
                    ds_label = a_tag.get_text(strip=True)
                    ds_url = a_tag['href']
                else:
                    ds_label = tag.get_text(strip=True)
                    ds_url = ""

                data_source = DataSource(
                    label=ds_label,
                    url=ds_url,
                    description=None
                )

                # As with the data source group, the content of the data source
                # lies between it and either the next data source (h4) or the
                # next data source group (h3).
                content_elements = []
                for sibling in tag.next_siblings:
                    if isinstance(sibling, Tag):
                        if sibling.name in ['h3', 'h4']:
                            break
                        content_elements.append(str(sibling))
                if content_elements:
                    ds_description_html = ''.join(content_elements)
                    ds_description_md = md(ds_description_html).strip()
                    if ds_description_md:
                        data_source.description = ds_description_md

                current_group.dataSources.append(data_source)

    return data_source_topic

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    data_topics = []
    for endpoint in ENDPOINTS:
        full_url = BASE_URL + endpoint
        print(f"Parsing {full_url}...")
        topic = parse_page(full_url)
        if topic:
            data_topics.append(asdict(topic))

    output_path = os.path.join(OUTPUT_DIR, OUTPUT_FILENAME)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data_topics, f, ensure_ascii=False, indent=2)
    print(f"Data source data has been written to {output_path}")

if __name__ == "__main__":
    main()
