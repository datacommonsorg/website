
cat "sv_quantity_cvals.sql" | bq query --use_legacy_sql=false \
  --format=csv --max_rows=10000 > data/sv_quantity_cvals.csv

cat "sv_schemaful.sql" | bq query --use_legacy_sql=false \
  --format=csv --max_rows=1000000 > data/sv_schemaful.csv

python3 curate_nl_svs.py
