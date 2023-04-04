import csv
import json

import gspread
import pandas as pd

SHEET_URL = 'https://docs.google.com/spreadsheets/d/1lmNAnqECpcvkuOlIkdo50Ve1KAalOoyP_lUlOuLmIAU'
SHEET_NAME = 'Main'
CSVFILE = 'demo_svs_1.3k_names.csv'
JSONFILE = '../../../server/config/nl_page/chart_titles_by_sv.json'
SV_COL = 'StatVar'
TITLE_COL = 'ConciseChartTitle'

sheet = gspread.oauth().open_by_url(SHEET_URL).worksheet(SHEET_NAME)
df = pd.DataFrame(sheet.get_all_records())
df = df.fillna("")

print("Updating input CSV file")
df.to_csv(CSVFILE, index=False)

out_json = {}
with open(CSVFILE) as fp:
  reader = csv.DictReader(fp)
  for row in reader:
    # Skip StatVar groups
    if row[SV_COL].startswith('dc/g/'):
      continue
    out_json[row[SV_COL]] = row[TITLE_COL]

with open(JSONFILE, 'w') as fp:
  json.dump(out_json, fp, indent=2, sort_keys=True)
