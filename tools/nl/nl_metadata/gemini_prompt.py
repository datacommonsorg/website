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


def get_gemini_prompt(target_language: str, schema_json_string: str) -> str:
  return f"""You are an expert linguist and creative writer specializing in generating descriptive sentences of statistical variables for search applications.

  **Primary Goal:**
  Your most important task is to generate a set of 3-7 rich, diverse, and natural-sounding alternative descriptions for a given statistical variable. These sentences are critical for a search product, so they must anticipate the various ways a user might look for this data. Maximizing the use of diverse synonyms, phrasing, and sentence structures is the key to success. The generated sentences should be direct variable descriptions (e.g., "total population") rather than full questions (e.g. "What is the total population of the world?").

  **Process:**
  To achieve this goal, you will follow a two-step process:
  1.  **Translate & Understand:** First, translate the values from the input metadata into **{target_language}**. This step is for you to fully understand the variable's meaning in the target language. Use the provided schema to translate the top level fields of the metadata.
  2.  **Generate & Format:** Based on your translated understanding, perform your primary goal of generating creative, descriptive sentences. Then, place all the translated information and your newly generated sentences into the provided JSON schema.

  **Output Requirements:**
  While generating sentences is the primary goal, the output format must strictly follow these rules:

  1.  **Use the Schema Exactly**: You MUST use the provided schema as a rigid template. The final JSON keys must match the schema's keys exactly.
  2.  **Critical `dcid` Handling**: The `dcid` field is a permanent identifier. Its key and value MUST be copied from the input to the output exactly as they are, without any modification or translation.
  3.  **Place Generated Sentences Correctly**: The list of new sentences you generate must be placed into the appropriate field specified in the schema (e.g., `frasesGeneradas`).
  4.  **Translate All Other Values**: All other values from the input metadata must be translated correctly and placed in their corresponding fields within the schema.

  **Example for `target_language: "Spanish"`:**

  *Input Metadata:*
  Note that the input metadata is given as a list of Python dictionaries. 
  ```python
  [
      {{
          "dcid": "Count_Student_PreKindergarten",
          "name": "Count of Student: Pre Kindergarten",
          "measuredProperty": "count",
          "populationType": "Student",
          "statType": "measuredValue",
          "constraintProperties": [
              "schoolGradeLevel: PreKindergarten"
          ]
      }},
      {{
          "dcid": "Count_Person",
          "name": "Total population",
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": []
      }}
  ]
  ```

  *Expected Output:*
```json
  [
  {{
      "dcid": "Count_Student_PreKindergarten",
      "frasesGeneradas": [
          "Total de estudiantes en programas de preescolar",
          "Cantidad de alumnos en educación preescolar",
          "Estudiantes matriculados en preescolar"
      ],
      "nombre": "Cuenta de Estudiantes: Pre Kindergarten",
      "propiedadMedida": "count",
      "tipoPoblacion": "Estudiante",
      "tipoEstadistico": "valorMedido",
      "restricciones": {{
          "nivelGradoEscolar": "PreKindergarten"
      }}
  }},
  {{
      "dcid": "Count_Person",
      "frasesGeneradas": [
          "Total de la población",
          "Número total de personas",
          "Población total"
      ],
      "nombre": "Población total",
      "propiedadMedida": "count",
      "tipoPoblacion": "Persona",
      "tipoEstadistico": "valorMedido",
      "restricciones": {{}}
  }}
  ]
  ```
  ---

  Here is the metadata you need to process. Remember, focus on generating excellent, search-optimized sentences in **{target_language}**, and then format your response using the provided schema. Do not hallucinate or invent any data, and double check your response to ensure it adheres to the schema and provided list of dcids.

  **Schema to use:**
  `{schema_json_string}`

  **Metadata to process:**\n
  """
