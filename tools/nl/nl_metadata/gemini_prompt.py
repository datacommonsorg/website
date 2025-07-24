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
"""
Defines two different prompts to be used to prompt Gemini to generate alternative sentences/translate metadata for statistical variables.
Currently, the first prompt is in use in add_metadata.py.
"""


def get_gemini_prompt(schema_json_string: str) -> str:
  return f"""You are an expert linguist and a creative writer specializing in generating semantically rich and diverse descriptions of statistical variables for a state-of-the-art search application.

  **Primary Goal:**
  Your task is to generate a set of 3-7 conceptually different and natural-sounding alternative descriptions for a given statistical variable. These sentences are the most critical part of the output, as they will be used as one of the fields in a Vertex AI Custom Search Application to generate embeddings from. Your generated sentences should help the Vertex AI search engine understand all the different ways a user might ask for this data, and be optimized specifically for use in Vertex AI search embeddings.

  **Guiding Principles for Sentence Generation:**
  To generate the best possible sentences, you must adhere to these principles:
  1.  **Focus on the Semantic Core:** The true meaning of the variable lies in its `name`, `populationType`, and, most importantly, its `constraintProperties`. Your generated sentences should primarily be variations of this semantic core. For example, for a variable about "count of women over the age of 50", your variations should explore synonyms and phrasing for "women" and "over 50".
  2.  **Maximize Conceptual & Synonym Diversity:** Do not just rephrase generic statistical terms like "count of" or "number of". Your main effort should be to find rich synonyms and related concepts for the semantic core. For example, for a variable with a constraint `foreignBorn`, you should generate sentences using terms like "immigrants", "immigrant population", "people born outside the country", or "data on immigration".
  3.  **Anticipate User Intent:** Think like a user. Generate descriptions that match how a researcher, a student, or a journalist might search for this information. The sentences should be direct descriptions (e.g., "total immigrant population") and not full questions (e.g., "What is the total immigrant population?"). This also means anticipating variations in capitalization, and reflecting such variations in your sentences (ex. Covid, covid, COVID, COVID-19, covid 19, coronavirus).

  **Process:**
  1.  **Analyze & Generate:** First, analyze the input metadata to understand its semantic core (`name` + `populationType` + `constraintProperties`). Then, perform your primary goal of generating 3-7 creative, diverse, and search-optimized sentences based on the guiding principles above.
  2.  **Format:** As a secondary step, assemble all the information—your newly generated sentences and the existing fields—into the provided JSON schema.

  **Output Requirements:**
  The output format must strictly follow these rules:

  1.  **Use the Schema Exactly**: You MUST use the provided schema as a rigid template. The final JSON keys must match the schema's keys exactly.
  2.  **Critical `dcid` Handling**: The `dcid` field is a permanent identifier. Its key and value MUST be copied from the input to the output exactly as they are, without any modification.
  3.  **Place Generated Sentences Correctly**: The list of new sentences you generate must be placed into the appropriate field specified in the schema (e.g., `generatedSentences`).

  **Example:**

  *Input Metadata:*
  Note that the input metadata is given as a list of Python dictionaries. The 'sentence' field in the schema is optional, and if missing from input data, should not be present in the output.
  ```python
  [
      {{
          "dcid": "Count_Student_PreKindergarten",
          "sentence": "Number of Students Enrolled in Pre Kindergarten Programs",
          "name": "Count of Student: Pre Kindergarten",
          "measuredProperty": "count",
          "populationType": "Student",
          "statType": "measuredValue",
          "constraintProperties": [
              "schoolGradeLevel: PreKindergarten"
          ],
          "numConstraints": 1,
      }},
      {{
          "dcid": "Count_Person",
          "sentence": "population count",
          "name": "Total population",
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": [],
		  "numConstraints": 0,
      }},
      {{
          "dcid": "Count_MedicalConditionIncident_COVID_19_PatientHospitalized",
          "name": "Count of Medical Condition Incident: COVID-19, Patient Hospitalized",
          "measuredProperty": "count",
          "populationType": "MedicalConditionIncident",
          "statType": "measuredValue",
          "constraintProperties": [
			"incidentType": "COVID_19",
  			"medicalStatus": "PatientHospitalized"
 		  ],
		  "numConstraints": 2,
      }},
      {{
          "dcid": "Count_Person_5OrMoreYears_ForeignBorn",
          "name": "Population: Foreign Born",
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": [
			"age": "Years5Onwards",
  			"nativity": "USC_ForeignBorn"
 	  	],
		"numConstraints": 2,
      }},
  ]

  *Expected Output:*
  ```json
  [
      {{
          "dcid": "Count_Student_PreKindergarten",
          "sentence": "Number of Students Enrolled in Pre Kindergarten Programs",
		  "generatedSentences": [
			"number of pre-k students",
			"kids in pre-kindergarten",
			"student count in pre-kindergarten",
			"preschool student population"
 		]
          "name": "Count of Student: Pre Kindergarten",
          "measuredProperty": "count",
          "populationType": "Student",
          "statType": "measuredValue",
          "constraintProperties": [
              "schoolGradeLevel: PreKindergarten"
          ],
		  "numConstraints": 1
      }},
      {{
          "dcid": "Count_Person",
          "sentence": "population count",
		  "generatedSentences": [
			"Population",
            "number of people",
			"overall population size",
            "count of inhabitats"
   	       ]
          "name": "Total population",
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": [],
		  "numConstraints": 0
      }},
      {{
          "dcid": "Count_MedicalConditionIncident_COVID_19_PatientHospitalized",
          "name": "Count of Medical Condition Incident: COVID-19, Patient Hospitalized",
  		  "generatedSentences": [
			"people hospitalized from covid",
            "covid-19 cases in hospitals",
			"Total coronavirus inpatient cases",
			"Covid 19 hospital admissions",
			"Number of patients hospitalized with COVID-19",
			"number of hospitalizations for sars-cov-2"
           ]
          "measuredProperty": "count",
          "populationType": "MedicalConditionIncident",
          "statType": "measuredValue",
          "constraintProperties": [
			"incidentType": "COVID_19",
  			"medicalStatus": "PatientHospitalized"
 		  ],
		  "numConstraints": 2,
      }},
      {{
          "dcid": "Count_Person_5OrMoreYears_ForeignBorn",
          "name": "Population: Foreign Born",
  		  "generatedSentences": [
            "number of immigrants age 5 and older",
            "Population of residents born outside the country, excluding young children",
            "non-native people 5 years or older",
            "Immigrant population not including children aged 0 to 4",
            "people older than 5 who are foreign-born",
            "immigration for the population 5+"
           ]
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": [
			"age": "Years5Onwards",
  			"nativity": "USC_ForeignBorn"
 	  	  ],
		  "numConstraints": 2,
      }},
  ]
  ```
  ---

  Here is the metadata you need to process. Remember, focus on generating diverse, Vertex AI search-optimized sentences targeting the semantic core of the statistical variable, and then format your response using the provided schema. Do not hallucinate or invent any data, and double check your response to ensure it adheres to the schema and provided list of dcids.

  **Schema to use:**
  `{schema_json_string}`

  **Metadata to process:**\n
  """


def get_gemini_prompt_with_translations(target_language: str,
                                        schema_json_string: str) -> str:
  return f"""You are an expert linguist and a creative writer specializing in generating semantically rich and diverse descriptions of statistical variables for a state-of-the-art search application.

  **Primary Goal:**
  Your most important task is to generate a set of 3-7 conceptually different and natural-sounding alternative descriptions for a given statistical variable. These sentences are the most critical part of the output, as they will be used as one of the fields in a Vertex AI Custom Search Application to generate embeddings from. Your generated sentences should help the Vertex AI search engine understand all the different ways a user might ask for this data, and be optimized specifically for use in Vertex AI search embeddings.

  **Guiding Principles for Sentence Generation:**
  To generate the best possible sentences, you must adhere to these principles:
  1.  **Focus on the Semantic Core:** The true meaning of the variable lies in its `name` and, most importantly, its `constraintProperties`. Your generated sentences should primarily be variations of this semantic core. For example, for a variable about "population of women over the age of 50", your variations should explore synonyms and phrasing for "women" and "over 50".
  2.  **Maximize Conceptual & Synonym Diversity:** Do not just rephrase generic statistical terms like "count of" or "number of". Your main effort should be to find rich synonyms and related concepts for the semantic core. For example, for a variable with a constraint `foreignBorn`, you should generate sentences using terms like "immigrants", "immigrant population", "people born outside the country", or "data on immigration".
  3.  **Anticipate User Intent:** Think like a user. Generate descriptions that match how a researcher, a student, or a journalist might search for this information. The sentences should be direct descriptions (e.g., "total immigrant population") and not full questions (e.g., "What is the total immigrant population?"). This also means anticipating variations in capitalization, and reflecting such variations in your sentences (ex. Covid, covid, COVID, COVID-19, covid 19, coronavirus).

  **Process:**
  1.  **Analyze & Generate:** First, analyze the input metadata to understand its semantic core (`name` + `constraintProperties`). Then, perform your primary goal of generating 3-7 creative, diverse, and search-optimized sentences in **{target_language}** based on the guiding principles above.
  2.  **Translate & Format:** As a secondary step, translate the other descriptive fields from the input metadata (like `name` and `sentence`) into **{target_language}**. Finally, assemble all the information—your newly generated sentences and the translated fields—into the provided JSON schema.

  **Output Requirements:**
  The output format must strictly follow these rules:

  1.  **Use the Schema Exactly**: You MUST use the provided schema as a rigid template. The final JSON keys must match the schema's keys exactly.
  2.  **Critical `dcid` Handling**: The `dcid` field is a permanent identifier. Its key and value MUST be copied from the input to the output exactly as they are, without any modification or translation.
  3.  **Place Generated Sentences Correctly**: The list of new sentences you generate must be placed into the appropriate field specified in the schema (e.g., `frasesGeneradas`).
  4.  **Translate Other Values**: All other values from the input metadata must be translated correctly and placed in their corresponding fields within the schema.

  **Example for `target_language: "Spanish"`:**

  *Input Metadata:*
  Note that the input metadata is given as a list of Python dictionaries. The 'sentence' field in the schema is optional, and if missing from input data, should not be present in the output.
  ```python
  [
      {{
          "dcid": "Count_Student_PreKindergarten",
          "sentence": "Number of Students Enrolled in Pre Kindergarten Programs",
          "name": "Count of Student: Pre Kindergarten",
          "measuredProperty": "count",
          "populationType": "Student",
          "statType": "measuredValue",
          "constraintProperties": [
              "schoolGradeLevel: PreKindergarten"
          ],
          "numConstraints": 1
      }},
      {{
          "dcid": "Count_Person",
          "sentence": "population count",
          "name": "Total population",
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": [],
          "numConstraints": 0
      }}
  ]

  *Expected Output:*
  ```json
  [
  {{
      "dcid": "Count_Student_PreKindergarten",
      "frase": "Número de estudiantes inscritos en programas de preescolar",
      "frasesGeneradas": [
          "Total de estudiantes en programas de preescolar",
          "Cantidad de alumnos en educación preescolar",
          "Estudiantes matriculados en preescolar",
          "Niños en pre-kindergarten"
      ],
      "nombre": "Cuenta de Estudiantes: Pre Kindergarten",
      "propiedadMedida": "count",
      "tipoPoblacion": "Estudiante",
      "tipoEstadistico": "valorMedido",
      "restricciones": [
          "nivelGradoEscolar: PreKindergarten"
      ],
      "numRestricciones": 1
  }},
  {{
      "dcid": "Count_Person",
      "frase": "conteo de población",
      "frasesGeneradas": [
          "Total de la población",
          "Número total de personas",
          "Población total",
          "Cantidad de habitantes"
      ],
      "nombre": "Población total",
      "propiedadMedida": "count",
      "tipoPoblacion": "Persona",
      "tipoEstadistico": "valorMedido",
      "restricciones": []
  }}
  ]
  ```
  ---

  Here is the metadata you need to process. Remember, focus on generating diverse, Vertex AI search-optimized sentences in **{target_language}**, and then format your response using the provided schema. Do not hallucinate or invent any data, and double check your response to ensure it adheres to the schema and provided list of dcids.

  **Schema to use:**
  `{schema_json_string}`

  **Metadata to process:**\n
  """
