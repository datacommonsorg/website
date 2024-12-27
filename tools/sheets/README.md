# Sheets Tools

These are two command-line tools to copy csv files to and from Google Sheets.

## Copy a csv file to Google Sheets

To copy a csv file to Google sheets, run the following command:
```bash
./run.sh -m csv2sheet -l <csv_file_path> [-s <sheets_url>] [-w <worksheet_name>]
```

Where:
- csv_file_path is the file path to the csv file you want to copy. THis is required.
- sheets_url is the url to the Google Sheet you want to copy to. This is optional and if not provided, a new sheet will be created.
- worksheet_name is the name of the worksheet in the Google Sheet you want to copy to. This is optional and if not provided, a new worksheet will be created.

## Copy Google Sheet to a csv file

To copy a Google sheet to a csv file, run the following command:
```bash
./run.sh -m sheet2csv [-l <csv_file_path>] -s <sheets_url> -w <worksheet_name>
```

Where:
- csv_file_path is the file path to the csv file you want to copy the Google Sheet to. This is optional and if not provided, a temporary csv file will be created.
- sheets_url is the url to the Google Sheet you want to copy from. This is required.
- worksheet_name is the name of the worksheet in the Google Sheet you want to copy from. This is required.