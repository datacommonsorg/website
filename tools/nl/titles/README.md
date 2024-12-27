This directory is for storing and processing curated stat-var title spreadsheets.

State as of March 2023:

* The spreadsheet with the information to generate chart titles is [HERE](https://docs.google.com/spreadsheets/d/1lmNAnqECpcvkuOlIkdo50Ve1KAalOoyP_lUlOuLmIAU/edit#gid=599439456) and it has 2 sheets that are used:
   * __Main__: This is the sheet for stat var titles that are used in all DCs & is checked in as [`demo_svs_1.3k_names.csv`](demo_svs_1.3k_names.csv).
   * __Main_SDG__: This is the sheet for stat var titles for SDG topics and variables that are used in the main DC, but not in sdg or sdgmini DCs. These are not used in sdg or sdgmini DCs because the [UN SDG Frontend](https://unstats.un.org/UNSDWebsite/undatacommons/sdgs) requires original SDG strings. This is checked in as [`sdg_svs_names.csv`](sdg_svs_names.csv).

Steps to add the titles to prod:

1. Edit the spreadsheet document above.

2. Generate [`chart_titles_by_sv.json`](../../../server/config/nl_page/chart_titles_by_sv.json), run:

   ```
   ./run.sh
   ```

3. Update the `description` property on the SV nodes in the schema MCFs.

   TODO: Update the code used here.
