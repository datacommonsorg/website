# Build Custom DC embeddings

Custom DC embeddings can be built by running the `build_custom_dc_embeddings.py` script.

## Example Usage

```bash
python3 build_custom_dc_embeddings.py \
--model_version=ft_final_v20230717230459.all-MiniLM-L6-v2 \
--sv_sentences_csv_path=testdata/customdc/input/dcids_sentences.csv \
--output_dir=/tmp
```

The script outputs `custom_embeddings.csv` and `custom_embeddings.yaml` in the output directory.

## Help

To see help on flags, run:

```bash
python3 build_custom_dc_embeddings.py --help
```

