# Build Custom DC embeddings

Custom DC embeddings can be built by running the `build_custom_dc_embeddings.py` script.

## Example Usage

```bash
./run_custom.sh \
--sv_sentences_csv_path=$PWD/testdata/custom_dc/input/dcids_sentences.csv \
--output_dir=/tmp
```

The script outputs `custom_embeddings.csv` and `custom_embeddings.yaml` in the output directory.

The SV sentences file should be a CSV with 2 columns: `dcid` and `sentence`.
The `sentence` column should be a list of sentences separated by `;`.
An example file is available [here](testdata/custom_dc/input/dcids_sentences.csv).

## Override Model Version

The above usage uses the `medium_ft` model version from [embeddings.yaml](../../../deploy/nl/embeddings.yaml).
To use a different model version, specify the `--model-version` flag.

```bash
./run_custom.sh \
--model_version=ft_final_v20230717230459.all-MiniLM-L6-v2 \
--sv_sentences_csv_path=$PWD/testdata/custom_dc/input/dcids_sentences.csv \
--output_dir=/tmp
```
