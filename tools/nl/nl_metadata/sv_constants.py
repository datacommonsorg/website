# Copyright 2025 Google LLC
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

DOTENV_FILE_PATH = ".env_nl"

BATCH_SIZE = 100
STAT_VAR_SHEET = "tools/nl/embeddings/input/base/sheets_svs.csv"
EXPORTED_SV_FILE = "tools/nl/nl_metadata/alyssaguo_statvars.json"

# These are the properties common to evey stat var
MEASURED_PROPERTY = "measuredProperty"
NAME = "name"
POPULATION_TYPE = "populationType"
STAT_TYPE = "statType"

# Constants used for Gemini API calls
GEMINI_MODEL = "gemini-2.5-flash-preview-05-20"
GEMINI_PROMPT = """You are an expert in describing statistical variables clearly and concisely. Your task is to generate approximately 5 distinct and diverse alternative sentences for a given statistical variable, based on its provided metadata.

Each generated sentence should be a natural-sounding English sentence and should aim to cover as much of the provided metadata as possible, without being overly verbose or repetitive. The goal is to maximize linguistic diversity while accurately representing the variable. If you feel that more or fewer sentences are necessary to achieve this, feel free to generate between 3-7 sentences.
                                      
Avoid simply rephrasing the existing \"sentence\" field. Instead, use all available metadata (including DCID, name, measuredProperty, populationType, statType, and all constraint properties) to construct new, semantically rich descriptions. The generated sentences should be suitable for use in an NLP-powered search bar specifically for statistical variables, meaning they should anticipate various ways a user might search for this data.

Here's an example representing the expected input and output format. Note that the input is passed in as a List[Dict[str, str | Dict[str, str]]] python object:

---
**Example Input Metadata:**
[
{"dcid": "Count_Student_PreKindergarten",
"sentence": "Number of Students Enrolled in Pre Kindergarten Programs",
"name": "Count of Student: Pre Kindergarten",
"measuredProperty": "count",
"populationType": "Student",
"statType": "measuredValue",
"schoolGradeLevel": "PreKindergarten"
},
{"dcid": "Count_Person",
"sentence": "population count",
"name": "Total population",
"measuredProperty": "count",
"populationType": "Person",
"statType": "measuredValue"
}
]

**Example Output:**
[
{"dcid": "Count_Student_PreKindergarten",
"sentence": "Number of Students Enrolled in Pre Kindergarten Programs",
"altSentences": [
    "Count of students in pre-kindergarten programs.",
    "Total enrollment in pre-kindergarten education.",
    "The number of children attending pre-K.",
    "Pre-kindergarten student population.",
    "How many students are enrolled in pre-kindergarten?"
],
"name": "Count of Student: Pre Kindergarten",
"measuredProperty": "count",
"populationType": "Student",
"statType": "measuredValue",
"schoolGradeLevel": "PreKindergarten"
},
{"dcid": "Count_Person",
"sentence": "population count",
"altSentences": [
    "Number of people",
    "Population size",
    "Count of individuals"
],
"name": "Total population",
"measuredProperty": "count",
"populationType": "Person",
"statType": "measuredValue"
}
]

The generated output MUST match the above-specified JSON format, and must be parsable by a standard JSON parser. The other fields on the input must be copied over to the output exactly as is, without any modification.

Here is the metadata for the statistical variables you need to describe:\n"""