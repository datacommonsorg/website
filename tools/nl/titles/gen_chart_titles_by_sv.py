import csv
import json

INFILE = 'demo_svs_1.3k_names.csv'
OUTFILE = '../../../server/config/nl_page/chart_titles_by_sv.json'

SV_COL = 'StatVar'
TITLE_COL = 'ConciseChartTitle'

out_json = {}
with open(INFILE) as fp:
  reader = csv.DictReader(fp)
  for row in reader:
    # Skip StatVar groups
    if row[SV_COL].startswith('dc/g/'):
      continue
    out_json[row[SV_COL]] = row[TITLE_COL]

with open(OUTFILE, 'w') as fp:
  json.dump(out_json, fp, indent=2, sort_keys=True)
