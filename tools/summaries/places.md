# Sample Places

The sample places in `places.json` can be generated using this SQL against [BigQuery](https://pantheon.corp.google.com/bigquery?project=datcom-store).

TODO: Group by place type and containment.

```sql
with 
partitioned as(
  SELECT type, id, name,
  row_number() over (partition by type order by rand()) as row_n
  FROM `datcom-store.dc_kg_latest.Place`
  where name is not null
),
twenty as(
  select *
  from partitioned
  where row_n <= 20 and type in ("Country", "State", "County", "EurostatNUTS1", "City")
)

select * from twenty;
```

Download the results as json and then run the following script to generate the final JSON. Alternatively, run the following [script online](https://trinket.io/python3/51df6be06f).

```python
import json

# places = UNCOMMENT THIS AND COPY THE DOWNLOADED JSON HERE

tuples = [(place["id"], place["name"]) for place in places]
tuples.sort(key=lambda x: x[1])
data = dict(tuples)

print(json.dumps(data, indent=True))
```