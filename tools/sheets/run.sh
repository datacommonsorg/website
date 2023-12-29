#!/bin/bash
# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

function help {
  echo "Usage: $0 -mswl"
  echo "-m      The mode to use. Options are csv2sheet or sheet2csv"
  echo "-s      The url of the Google Sheet to use."
  echo "-w      The name of the Google Sheet worksheet to use."
  echo "-l      The relative filepath to the local csv file to copy to Google Sheets."
}

while getopts ":m:s:w:l:" OPTION; do
  case $OPTION in
    m)
      export MODE=$OPTARG
      ;;
    s)
      export SHEETS_URL=$OPTARG
      ;;
    w)
      export WORKSHEET_NAME=$OPTARG
      ;;
    l)
      export LOCAL_CSV_FILEPATH=$OPTARG
      ;;
    *)
      help
      ;;
  esac
done

if [[ $MODE == "csv2sheet" && -z "$LOCAL_CSV_FILEPATH" ]]; then
  echo "To use csv2sheet, please set the local csv filepath with -l"
  exit 1
fi
if [[ $MODE == "sheet2csv" && ( -z "$SHEETS_URL" || -z "$WORKSHEET_NAME" )]]; then
  echo "To use sheet2csv, please set the Google Sheets url with -s and the worksheet name with -w"
  exit 1
fi

echo $LOCAL_CSV_FILEPATH
python3 -m venv .env
source .env/bin/activate
python3 -m pip install --upgrade pip
pip3 install -r requirements.txt
python3 sheets_tools.py --mode=$MODE --sheets_url=$SHEETS_URL --worksheet_name=$WORKSHEET_NAME --local_csv_filepath=$LOCAL_CSV_FILEPATH
