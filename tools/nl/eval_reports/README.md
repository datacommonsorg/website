# Query Eval Differ Report

This directory contains scripts which produce summary reports for various Query Evaluations.


## Manual Query Evaluations Differ

This tool takes two Manual Query Evaluations, e.g. https://docs.google.com/spreadsheets/d/13RokLsUSX0L3TwuxVoHmaYxQnNmhB6piZCWOzOh1Kvk
and produces a differ report which flags regressions and potential problems which remain across both evaluations.

This tool needs three inputs:

1. The url of a Google Sheet with the reference (older) Evaluations.

2. The url of a Google Sheet with the latets (new) Evaluations.

3. The url of a Google Sheet where you want the results to be written to. All results are written to this sheet.

Note that the results sheet will have the same tabs as the two input sheets. It is assumed that the two input sheets will
have the same Tabs and the queries in each row will be the same. The titles of the columns is also expected to be the same.

#### Usage

To generate this report, run:

1. `./eval_differ.sh <old_eval_sheets_url> <new_eval_sheets_url> <output_sheets_url>`