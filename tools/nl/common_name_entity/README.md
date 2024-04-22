# Common Name Entity Tool

This is a tool to take csv files with names and corresponding type of an entity & finds the entities that have names that are common words. This is then used in Mixer when doing entity recognition to guard against recognizing common words as entities. Mixer takes a json file of the format `{ <name>: [<type>, ...] , ...}`. To generate this json file using this tool:

1. Add csv files of names and types of entities to the [input_files folder](./input_files/) either manually or using the script to fetch from gcs. CSV files should have `name` and `type` columns. Sample BQ Query used to get the input files (for the list of entity types [here](https://source.corp.google.com/piper///depot/google3/datacommons/import/mcf_vocab.h;l=459-464;rcl=625130528) ):

```sql
SELECT
  t1.object_value as name,
  t2.object_id
FROM `datcom-store.dc_kg_latest.Triple` as t1
JOIN `datcom-store.dc_kg_latest.Triple` as t2
ON t1.subject_id = t2.subject_id 
WHERE 
  t1.predicate = 'name' and
  t2.predicate = 'typeOf' and
  t2.object_id in ("VirusGenusEnum", "VirusIsolate", "Virus", "Species", "BiologicalSpecimen", "GeneticVariant", "Gene", "Disease", "ICD10Section", "ICD10Code", "MeSHDescriptor", "Drug", "AnatomicalTherapeuticChemicalCode", "MeSHSupplementaryRecord")
```

2. Run the script which will output the flagged_names and flagged_tokens for each file in the [input_files_folder](./input_files/):

```bash
run.sh [-g <GCS_BUCKET>]
```

- GCS_BUCKET is the gcs bucket that you want to download the input files from

3. Manually go through the flagged_names and copy the ones that are actually common words into a new json file.