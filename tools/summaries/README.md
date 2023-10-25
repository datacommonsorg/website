# Generate Place Summaries

This script generates NL summaries for Place Explorer.

To run:

```shell
python3 main.py
```

To debug:

```shell
python3 main.py --num_processes=1 --places_in_file=places-short.json --save_prompt=True --dc_base_url=http://localhost:8080
```

The PaLM API Key must be specified under an environment variable named `PALM_API_KEY`.