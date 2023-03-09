Directory for storing and processing curated titles.

1. The spreadsheet with a column for SV DCID and concise titles
   ([example](https://docs.google.com/spreadsheets/d/1lmNAnqECpcvkuOlIkdo50Ve1KAalOoyP_lUlOuLmIAU/edit#gid=817471184))
   is checked in here.

2. To generate [`chart_titles_by_sv.json`](../../../server/config/nl_page/chart_titles_by_sv.json), run:

    # python3 gen_chart_titles_by_sv.json

3. Update the `description` property on the SV nodes in the schema MCFs.

   TODO: Update the code here.


