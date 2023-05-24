# Trim Stat Vars from DC

Code in this directory is used for creating a subset of stat-vars from DC KG
suitable for addition to NL.

It uses a bunch of heuristics to skip SVs with very many PVs, schema-less SVs,
SVs without data, certain spammy SVs, SVs with quantity constraint values, etc.

To run it:

```
./run.sh
```

This will produce `sv_trimmed.csv` and `sv_trimmed_dbg_info.json` as output.

As of Q2 2023, this produced ~5280 SVs.

