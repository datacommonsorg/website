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

2. Run the command below which will both generate a new embeddings in
   `gs://datcom-nl-models`, as well as update the corresponding csv under
   [sheets/](sheets/).

    ```bash
    ./run_.sh
    ```

3. Test the change locally, validate the csv diffs and send out a PR.


