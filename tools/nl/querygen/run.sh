
# cat "get_schema_tokens.sql" | bq query --use_legacy_sql=false \
#   --format=csv --max_rows=10000 > data/schema_tokens_medium.csv

python3 generate_queries.py
