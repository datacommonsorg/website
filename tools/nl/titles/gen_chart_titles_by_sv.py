import csv
import json

import gspread
import pandas as pd

SHEET_URL = 'https://docs.google.com/spreadsheets/d/1lmNAnqECpcvkuOlIkdo50Ve1KAalOoyP_lUlOuLmIAU'
SHEET_LIST = [{
    'name': 'Main',
    'csv': 'demo_svs_1.3k_names.csv',
    'json': '../../../server/config/nl_page/chart_titles_by_sv.json',
    'blocklist': []
}, {
    'name': 'Main_SDG',
    'csv': 'sdg_svs_names.csv',
    'json': '../../../server/config/nl_page/chart_titles_by_sv_sdg.json',
    'blocklist': ['sdg', 'sdgmini']
}]
SV_COL = 'StatVar'
TITLE_COL = 'ConciseChartTitle'

for sheet_info in SHEET_LIST:
  sheet = gspread.oauth().open_by_url(SHEET_URL).worksheet(sheet_info['name'])
  df = pd.DataFrame(sheet.get_all_records())
  df = df.fillna("")

  print("Updating input CSV file: " + sheet_info['csv'])
  df.to_csv(sheet_info['csv'], index=False)

  out_json = {}
  with open(sheet_info['csv']) as fp:
    reader = csv.DictReader(fp)
    for row in reader:
      # Skip StatVar groups
      if row[SV_COL].startswith('dc/g/'):
        continue
      out_json[row[SV_COL]] = {
          'title': row[TITLE_COL],
          'blocklist': sheet_info['blocklist']
      }

  with open(sheet_info['json'], 'w') as fp:
    json.dump(out_json, fp, indent=2, sort_keys=True)
