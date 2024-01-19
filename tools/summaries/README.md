# Generate Place Summaries

This script generates NL summaries for Place Explorer.

To run:

```shell
> git root
python3 -m venv .env
source .env/bin/activate

> this dir
# Generate list of SVs
python3 build_sv_list.py

# Generate summaries
python3 main.py
```

To debug:

```shell
python3 main.py --num_processes=1 --places_in_file=places-short.json --save_prompts=True
```

A GenAI API Key must be specified under an environment variable named `LLM_API_KEY`.
A Mixer API Key must be specified under an environment variable named `MIXER_API_KEY`.