# Data Commons Data Sources Generation Tool

## Purpose

This script is designed to scrape the existing data sources pages (external to)
the primary site, and convert those data sources to json in a format that 
is usable by the data sources page in the primary Data Commons site.

## Notes

This script may be temporary. The external data sources pages are populated
from an ultimate source not connected to this repository. The process will
likely be updated in the future so that the local json used here will also be
populated from the same source that generates the markdown/html used in the external
site.

### Script Usage

To generate the latest json from the external data source pages, run the following
command from inside the `tools/data_sources` directory:

```bash
./run.sh
````

This will scrape the external pages, parse them and convert the contents to the
following file:

`/static/js/apps/data/data_sources.json`

This file will then be ready for the data sources page to use.