# Generate Place Summaries

This directory holds scripts used to generate the text summaries on the place
pages in our Place Explorer.

## How to Generate or Update Summaries

From this directory, run

```shell
# this dir
export MIXER_API_KEY=<your mixer API key here>
./run_summary_generation.sh
```

and review the diffs. The summary generation scripts fetch the latest data from
mixer, so values may change as data gets refreshed.

## Deploying Updated Summaries to GKE

Once you are happy with the summaries generated, send a pull request to
https://github.com/datacommonsorg/website so others on the team can review
and approve any changes.

After your PR is merged, you can deploy the new summaries to GKE by running
the following from the repo root directory:

```shell
# from repo root directory
./scripts/update_place_summary_config.sh $ENV
```

where `$ENV` is the environment to deploy to, e.g. `dev` or `staging`.

## LLM Enhancements

Currently, our summary generation includes summaries for US States and the
top 100 most populous US cities that have been edited by Bard, which are stored
in `priority-places-bard.tsv`.

The original summaries fed to Bard we created by running:

```shell
python3 -m venv .env
source .env/bin/activate
python3 -m pip install -r requirements.txt
python3 fetch_place_summaries.py ../../static/sitemap/PriorityPlaces.0.txt
```

Then, the following "Strict" Bard prompt was used to generate an edited summary:

> For all the paragraphs that I will give you I want you to rewrite them. Keep
> it factual and descriptive. The length should not be longer than a 120 words.
> Only use the information that I provide below. Don’t draw comparisons or
> conclusions in relation to other data sources. Stick to the information I
> provide in the paragraph. More than anything this is a grammar exercise.
> Include up to 5 numbers that I provide. Again, don’t include any other numbers
> outside the information given. Do not return markdown or lists. Use a natural 
> simple, professional, crisp and neutral tone of voice. Do not use phrases like
> 'According to the data’, ‘dipped’, ‘compared to’. Stick to the facts provided 
> here and include the year in relation to the stats provided.

The following "Carl Sagan" prompt was also tried during the process. Some
responses from that prompt are left in the .tsv for version control purposes:

> For all the paragraphs that I will give you I want you to rewrite them. Keep 
> it factual and descriptive. The length should not be longer than a 120 words. 
> Only use the information that I provide below. Include up to 5 numbers that I 
> provide. Don’t include any other numbers outside the information given. Do not
> return markdown or lists. Use a natural simple, professional, crisp and 
> neutral tone of voice. Do not use phrases like 'According to the data'. Think 
> you are carl Sagan

Responses were copied over manually into `priority-places-bard.tsv`

## Depreciated Instructions

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