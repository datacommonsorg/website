# Tools and Data for Stat Var Embeddings Index

This directory contains the data sheets (containing StatVar DCID and
descriptions) and script used to construct the Stat Var Embeddings Index that
is loaded into the NL Server in Website.

## Latest Embeddings Google Sheet

Latest sheet as of Feb 2023 is
[`Combined_Filtered_US`](https://docs.google.com/spreadsheets/d/1evJAt0iaPWt5pcw3B7xeAtnp_mneDkUrTL_KMyyS-RQ/edit#gid=212787095).
It includes ~1.3K curated variables.

## Making a change to the embeddings.

1. Make edits to the latest sheet above.

2. Run the command below which will both generate a new embeddings csv in
   `gs://datcom-nl-models`, as well as update the corresponding csv under
   [sheets/](sheets/).  Note down the embeddings file version printed at
   the end of the run.

    ```bash
    ./run.sh
    ```
3. Validate the CSV diffs, update [`model.yaml`](../../../deploy/base/model.yaml) with the generated embeddings version and test out locally.

4. If everything looks good, send out a PR with the `model.yaml` and CSV changes.


## Generating Sentence Alternatives using the PaLM API.
To run the `run_gen_palm_alts.sh` script, you'll need the PaLM API Key which should be set as the Environment variable, e.g. 

```
export PALM_API_KEy=<key>
```

Then, you can run:

```bash
    ./run_gen_palm_alts.sh
```

This script, upon completion, should update the `palm_alternatives.csv` under the `csv` folder. Note, the API could be throttled so there are several timeouts in the scripts. That, along with the fact that the API response can be on O(seconds), this script can take a while to complete. For ~1500 SVs, this may take 1-2 hours.

## One time setup

To allow the `gspread` library access to the google sheets above, you will need [credentials downloaded to your computer](https://docs.gspread.org/en/latest/oauth2.html#for-end-users-using-oauth-client-id).

As of Feb 2023, you can download the gspread-python-app credentials [found here](https://pantheon.corp.google.com/apis/credentials/oauthclient/878764285063-2tqmvvstv8k8cdl7ougccd7ptpnat8d5.apps.googleusercontent.com?project=datcom-204919) to `~/.config/gspread/credentials.json`.


