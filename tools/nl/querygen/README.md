# Query Generation

This directory contains scripts for generating seed queries for all the
StatVars in the medium index.  It does so by extracting the distinctschema
tokens in every StatVar, and then together with a place (with data for the SV),
comes up with an english query.

Note that the query might often not be properly formed, but that is okay
since it forms the seed for rewriting by PaLM.

To run it:

```bash
./run.sh
```

This will produce a `data/seed_queries.csv` file.
