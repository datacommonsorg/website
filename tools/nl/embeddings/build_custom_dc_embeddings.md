# Build Custom DC embeddings

Custom DC embeddings can be built by running the `build_custom_dc_embeddings.py`
script.

The SV sentences file should be a CSV with 2 columns: `dcid` and `sentence`.
The `sentence` column should be a list of sentences separated by `;`.
An example file is available [here](testdata/custom_dc/input/dcids_sentences.csv).

## Example Usage

```bash
./run_custom.sh --input_dir=$PWD/testdata/custom_dc/input --output_dir=/tmp
```

The script outputs `embeddings.csv` and `custom_catalog.yaml` in the output directory.
