# Apigee Key Migration

This folder contains command line tools to migrate api keys to apigee.

> NOTE: This tool is currently a WIP and the usage below will change once it is finalized.

## Usage

To migrate keys in prod env:

```bash
./run.sh prod.env
```

To migrate keys in staging env:

```bash
./run.sh staging.env
```

To only export keys (i.e. fetch DC api keys and write to the spreadsheet) in staging env:

```bash
./run.sh staging.env
```

To only import keys (i.e. export keys from the spreadsheet to apigee) in staging env:

```bash
./run.sh staging.env
```