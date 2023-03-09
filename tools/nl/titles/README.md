This directory is for storing and processing curated stat-var title spreadsheets.

State as of March 2023:

* The spreadsheet with 1.2K SVs is [HERE](https://docs.google.com/spreadsheets/d/1lmNAnqECpcvkuOlIkdo50Ve1KAalOoyP_lUlOuLmIAU/edit#gid=817471184),
   and checked in as [`demo_svs_1.3k_names.csv`](demo_svs_1.3k_names.csv).

Steps to add the titles to prod:

1. To generate [`chart_titles_by_sv.json`](../../../server/config/nl_page/chart_titles_by_sv.json), run:

   ```
   python3 gen_chart_titles_by_sv.json
   ```

2. Update the `description` property on the SV nodes in the schema MCFs.

   TODO: Update the code used here.
