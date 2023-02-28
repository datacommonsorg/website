# Tools and Data for Stat Var Embeddings Index

This directory contains the data sheets (containing StatVar DCID and
descriptions) and script used to construct the Stat Var Embeddings Index that
is loaded into the NL Server in Website.

## Latest Sheet

Latest sheet as of Feb 2023 is
[`Combined_Filtered_US`](https://docs.google.com/spreadsheets/d/1evJAt0iaPWt5pcw3B7xeAtnp_mneDkUrTL_KMyyS-RQ/edit#gid=212787095).
It includes ~1.3K curated variables.

## Making a change

1. Make edits to the latest sheet above.

2. Run the command below which will both generate a new embeddings csv in
   `gs://datcom-nl-models`, as well as update the corresponding csv under
   [sheets/](sheets/).

    ```bash
    ./run_.sh
    ```

3. Test the change locally, validate the csv diffs and send out a PR.

## One time setup

To allow the `gspread` library access to the google sheets above, you will need [credentials downloaded to your computer](https://docs.gspread.org/en/latest/oauth2.html#for-end-users-using-oauth-client-id).

As of Feb 2023, you can download the gspread-python-app credentials [found here](https://pantheon.corp.google.com/apis/credentials/oauthclient/878764285063-2tqmvvstv8k8cdl7ougccd7ptpnat8d5.apps.googleusercontent.com?project=datcom-204919) to `~/.config/gspread/credentials.json`.