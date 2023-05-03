# Tools and Data for Stat Var Embeddings Index

This directory contains the data sheets (containing StatVar DCID and
descriptions) and script used to construct the Stat Var Embeddings Index that
is loaded into the NL Server in Website.

## Latest Embeddings Google Sheet

Latest sheet as of May 2023 is
[`DC_NL_SVs_Curated`](https://docs.google.com/spreadsheets/d/1-QPDWqD131LcDTZ4y_nnqllh66W010HDdows1phyneU)).

## Making a change to the embeddings.

1. Make edits to the [latest sheet](https://docs.google.com/spreadsheets/d/1-QPDWqD131LcDTZ4y_nnqllh66W010HDdows1phyneU). Note that if the sheets file has a valid string entry for the `Override_Alternatives` column, then all other alternatives are ignored. The column `Curated_Alternatives` is supposed to be used to provide `;` (semi-colon) delimited human curated alternatives. The `Description` field can also be a manually curated best description string for the StatVar and it can be expected to be used as part of any automated alternative generation processed, e.g. using an LLM. The `Name` field is legacy and will eventually be removed once the new process and embeddings are established to lead to no regressions based on the current state.

2. Ensure any updated alternatives, i.e. PaLM alternatives, Other alternatives, are available as csv files: [`palm_alternatives.csv`](csv/palm_alternatives.csv), [`other_alternatives.csv`](csv/other_alternatives.csv). The columns in these CSV files are: `Id`, `Alternatives`. These files are expected to be updated using (currently) separate processes.

3. Run the command below which will both generate a new embeddings csv in
   `gs://datcom-nl-models`, as well as update the corresponding csv under
   [sheets/](sheets/).  Note down the embeddings file version printed at
   the end of the run.

    ```bash
    ./run.sh
    ```
4. Validate the CSV diffs, update [`model.yaml`](../../../deploy/base/model.yaml) with the generated embeddings version and test out locally.

5. Generate an SV embeddings differ report by following the process under the [`sv_index_differ`](../svindex_differ/README.md) folder (one level up). Look at the diffs and evaluate whether they make sense.

5. If everything looks good, send out a PR with the `model.yaml`, the differ_html file (as a linked attachement) and CSV changes.

## One time setup

To allow the `gspread` library access to the google sheets above, you will need [credentials downloaded to your computer](https://docs.gspread.org/en/latest/oauth2.html#for-end-users-using-oauth-client-id).

As of Feb 2023, you can download the gspread-python-app credentials [found here](https://pantheon.corp.google.com/apis/credentials/oauthclient/878764285063-2tqmvvstv8k8cdl7ougccd7ptpnat8d5.apps.googleusercontent.com?project=datcom-204919) to `~/.config/gspread/credentials.json`.


