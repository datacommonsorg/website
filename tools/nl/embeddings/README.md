# Tools and Data for Stat Var Embeddings Index

This directory contains the data CSV (containing StatVar DCID and
descriptions) and script used to construct the Stat Var Embeddings Index that
is loaded into the NL Server in Website.

There are multiple sizes of indexes: small, medium.

As of May 2023, the small index has ~1.3K variables and medium index has 5.3K
variables.

## Making a change to the embeddings

1. For any carefully curated SVs/topics, make edits to the [curated input CSVs](data/curated_input/)<a name="curated-input"></a>.

   - The columns in this csv are:

     - `dcid`: the StatVar DCID.
     - `sentence`: the description(s) of the StatVar. Multiple descriptions are acceptable. If multiple description strings are provided, they must be semi-colon delimited. This column can be expected to be used as part of any automated alternative generation processed, e.g. using an LLM.

   - To easily edit the curated csv in Google sheets, you can go use the sheets command-line tools [here](../../sheets/).
     - E.g., To copy the curated input for the base embeddings to a google sheet, go to the sheets command line tools folder and run:
     ```bash
     ./run.sh -m csv2sheet -l ../nl/embeddings/data/curated_input/base/sheets_svs.csv [-s <sheets_url>] [-w <worksheet_name>]
     ```
     - E.g., To copy the contents of the google sheet back as the curated input for the base embeddings, go to the sheets command line tools folder and run:
     ```bash
     ./run.sh -m sheet2csv -l ../nl/embeddings/data/curated_input/base/sheets_svs.csv -s <sheets_url> -w <worksheet_name>
     ```

2. Run the command below which will generate a new embeddings csv in
   `gs://datcom-nl-models`. Note down the embeddings file version printed at the end of the run.

   To generate the `sdg_ft` embeddings:

   ```bash
   ./run.sh -c sdg
   ```

   To generate the `undata_ft` embeddings:

   ```bash
   ./run.sh -c undata
   ```

   To generate the `undata_ilo_ft` embeddings:

   ```bash
   ./run.sh -c undata_ilo
   ```

   To generate the `bio_ft` embeddings:

   ```bash
   ./run.sh -c bio
   ```

   Note: Bio embeddings uses the alternatives from main dc for now.

   To generate the embeddings using vertex AI model endpoint for base embeddings:

   ```bash
   ./run.sh -e base <vertex_ai_endpoint_id>
   ```

   All the endpoints can be found in this [page](https://pantheon.corp.google.com/vertex-ai/online-prediction/endpoints?mods=-monitoring_api_staging&project=datcom-website-dev).

   TODO: Add improved alternative descriptions to undata topics

   Notes:

   - curated_input_dirs is a list of directories separated by `,` which contains the CSVs with the curated inputs to use. The format of the CSVs should follow the description of [point 1](#curated-input).

3. Validate the CSV diffs, update [`catalog.yaml`](../../../deploy/nl/embeddings.yaml) with the generated embeddings version and test out locally.

4. Generate an SV embeddings differ report by following the process under the [`sv_index_differ`](../svindex_differ/README.md) folder (one level up). Look at the diffs and evaluate whether they make sense.

5. Update goldens by running `./run_test.sh -g` from the repo root.

6. If everything looks good, send out a PR with the `catalog.yaml`, the
   `differ_report.html` file (as a linked attachement), CSV changes, and updated
   goldens.

## Production Config Files

### [`catalog.yaml`](../../../deploy/nl/catalog.yaml)

Lists the embeddings CSV files (generated using the steps above).

The keys are index names (specified as `idx=` param value), and the values are file names (with the assumption that the files are stored in gs://datcom-nl-models/).

These files, generated from a fine-tuned model (as of Q2 2023), have the following structure: `<version>.<fine-tuned-model-version>.<base-model-name>.csv` (e.g., `datcom-nl-models/embeddings_sdg_2023_09_12_16_38_04.ft_final_v20230717230459.all-MiniLM-L6-v2.csv`).
