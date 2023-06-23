# Fine Tuning the Model

To fine tune an existing  `sentence_transformer` model, do the following:

```bash
    ./run.sh (small | medium)
```

This process requires non-empty `.csv` files under [`data/alternatives/`](../data/alternatives/) and [`data/autogen/*`](../data/autogen_input/) from which to pick synonymous pairs of sentences/descriptions. These pairs are formed between StatVar `Name`, `Description` and `Alternatives` (either human curated or LLM-generated). The goal is to fine tune the model by understanding that these pairs are close. Additionally, and perhaps more importantly, the [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv) file contains pairs of sentences and a relative similarity indicator ranging between `[0, 1]` where close to `0` means very dissimilar and close to `1` means very similar. 

Nore that [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv) is hand-curated. The similarity indicator (`label`) does not need to be exact--it is simply a helpful indicator for the fine tuning processs to refine the model by taking in to account the pairs and their suggested labels (scores). We assign high scores (close to 1) to the pairs generated from the various alternatives files. We use [`finetuning/sentence_pairs.csv`](../data/finetuning/sentence_pairs.csv) to get the pairs with low similarity scores. These are essentially the pairs for which we want the model to produce very dissimilar scores.

Some suggestions for scores/labels to use for sentence pairs:

i. To disassociate `poverty` from `prison` or `incarceration`, a very low score should be used (e.g. 0.01).

ii. To strongly associate `african americans` with `black and african american demographic`, use a high score, e.g. 0.99 or 1.0. On the other hand, while we do not want to associate `african americans` with `people living in africa`, we may not want to use a prohibitively low score for this. Therefore, a low (but not very low) score would suffice, e.g. 0.2.

iii. For sentence pairs where the association is not incorrect but also not a high priority association, using a middling score like 0.5 might be better.