# Fine Tuning the Model

A good guide to fine tuning Sentence Transformer models is [here](https://huggingface.co/blog/how-to-train-sentence-transformers).
To fine tune starting from an existing finetuned model (based on sentence alternatives) using sentence pairs provided in [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv), do the following (this is the default behavior):

```bash
    ./run.sh -f <tuned_alternatives_model_path_on_gcs>
```

The final finetuned model is uploaded to GCS and the path printed at the end.

To fine tune a base`sentence_transformer` model (first finetune using the sentence alternatives and then finetune further using sentence pairs provided in [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv)), do the following:

```bash
    ./run.sh -a
```
Both the alternatives-based finetuned model (starting from a base model) and the final finetuned model are uploaded to GCS and the paths printed at the end. It is expected that the sentence pairs provided in [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv) will be much fewer (read below) than the alternatives under [`data/alternatives/`](../data/alternatives/) and [`data/autogen/*`](../data/autogen_input/). This means that the default path to finetune starting from an exsiting finetuned (alternatives-based) model will be the quicker path (takes about 3-5mins) and should be used any time the updates are made to [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv). However, if updates are also made to the alternatives under [`data/alternatives/`](../data/alternatives/) and [`data/autogen/*`](../data/autogen_input/), then the full finetuning should take place (which can take a couple of hours).

This process requires non-empty `.csv` files under [`data/alternatives/`](../data/alternatives/) and [`data/autogen/*`](../data/autogen_input/) from which to pick synonymous pairs of sentences/descriptions. These pairs are formed between StatVar `Name`, `Description` and `Alternatives` (either human curated or LLM-generated). The goal is to fine tune the model by understanding that these pairs are close. Additionally, and perhaps more importantly, the [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv) file contains pairs of sentences and a relative similarity indicator ranging between `[0, 1]` where close to `0` means very dissimilar and close to `1` means very similar. 

Nore that [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv) is hand-curated. The similarity indicator (`label`) does not need to be exact--it is simply a helpful indicator for the fine tuning processs to refine the model by taking in to account the pairs and their suggested labels (scores). We assign high scores (close to 1) to the pairs generated from the various alternatives files. We use [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv) to get the pairs with low similarity scores. These are essentially the pairs for which we want the model to produce very dissimilar scores.

Some suggestions for scores/labels to use for sentence pairs:

i. To disassociate `poverty` from `prison` or `incarceration`, a very low score should be used (e.g. 0.01).

ii. To strongly associate `african americans` with `black and african american demographic`, use a high score, e.g. 0.99 or 1.0. On the other hand, while we do not want to associate `african americans` with `people living in africa`, we may not want to use a prohibitively low score for this. Therefore, a low (but not very low) score would suffice, e.g. 0.2.

iii. For sentence pairs where the association is not incorrect but also not a high priority association, using a middling score like 0.5 might be better.