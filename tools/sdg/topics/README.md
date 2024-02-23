# Generate Topic JSON and MCF for UN Data Commons

There are a couple of special DC topics the scripts here generate.

1. `sdg`
   * [`sdg_topic_cache.json`](../../../server/config/nl_page/sdg_topic_cache.json)
   * `custom_topics_sdg.mcf`.
2. `undata`
   * [`undata_topic_cache.json`](../../../server/config/nl_page/undata_topic_cache.json)
   * `custom_topics_undata.mcf`.


The MCF is saved under a `tmp` folder and should be submitted to g3
[here](https://source.corp.google.com/piper///depot/google3/third_party/datacommons/schema/stat_vars/).

To run it:

```bash
export DC_API_KEY=<AUTOPUSH KEY>
./run.sh [--dc=sdg | --dc=undata]
```

TODO: Since this is more general than sdg, move this to `tools/un/topics`.
