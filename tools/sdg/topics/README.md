# Generate Topic JSON and MCF for SDG Data Commons

This is used to generate [`sdg_topic_cache.json`](../../../server/config/nl_page/sdg_topic_cache.json) and `custom_topics_sdg.mcf`.

The MCF is saved under a `tmp` folder and should be submitted to g3 [here](https://source.corp.google.com/piper///depot/google3/third_party/datacommons/schema/stat_vars/).

To run it:

bash```
export MIXER_API_KEY=<AUTOPUSH KEY>
python3 main.py
```