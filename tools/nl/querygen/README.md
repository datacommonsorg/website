# Query Generation

As part of validating the NL system, we would like to prepare a queryset
of queries for variables + places for which we expect to have data.

The script in this directory helps generating such seed queries for all
StatVars in the medium index. It does so by extracting the distinctschema
tokens in every StatVar, and then together with a place (with data for the SV),
comes up with an english query.

The generated simplistic seed queries are then expanded with multiple
alternatives using PaLM.

Note that the queries might often not be properly formed, but that might be
okay since PaLM will rewrite it.

To run it:

```bash
./run.sh
```

This will produce a `data/seed_queries.csv` file.
