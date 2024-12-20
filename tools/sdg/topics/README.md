# Generate Topic JSON and MCF for UN Data Commons

## Core Topics

There are a couple of special DC topics the scripts here generate.

1. `sdg`
   - [`sdg_topic_cache.json`](../../../server/config/nl_page/sdg_topic_cache.json)
   - `custom_topics_sdg.mcf`.
2. `undata`
   - [`undata_topic_cache.json`](../../../server/config/nl_page/undata_topic_cache.json)
   - `custom_topics_undata.mcf`.

The MCF is saved under a `tmp` folder and should be submitted to g3
[here](https://source.corp.google.com/piper///depot/google3/third_party/datacommons/schema/stat_vars/).

To run it:

```bash
export DC_API_KEY=<AUTOPUSH KEY>
./run.sh [--dc=sdg | --dc=undata | --dc=undata_ilo]
```

TODO: Since this is more general than sdg, move this to `tools/un/topics`.

## Enum Topics

These are identified as all SVs having a common constraint property value.
For example, in WHO there are a bunch of SVs spread across multiple themes /
topics but have to do with a specific disease (Tuberculosis).

This script puts all SVs with a constraint value together in a single topic,
and orders SVs within the topics from most general (totals) to specific (age
breakdowns).

To run it:

```bash
export DC_API_KEY=<AUTOPUSH KEY>
python3 enum_topics.py
```


## Generate Topic Cache

Generates topic cache JSON and NL sentences CSV from an input MCF file with Topic and StatVarPeerGroup nodes.

> NOTE: The core topics script takes a CSV and generates the MCF, JSON and CSV. This script takes a MCF and generates the JSON and CSV.

To run it:

```bash
./generate_topic_cache.sh
```