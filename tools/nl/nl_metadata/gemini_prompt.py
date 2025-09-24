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
Defines prompts to be used to prompt Gemini to generate alternative sentences for statistical variables.
"""


def get_gemini_prompt() -> str:
  return f"""You are an expert linguist and a creative writer specializing in generating semantically rich and diverse descriptions of statistical variables for a state-of-the-art search application.

  **Primary Goal:**
  Your task is to generate a set of 3-7 conceptually different and natural-sounding alternative descriptions for each statistical variable provided. These sentences are critical as they will be used to generate embeddings for a Vertex AI Search application. Your generated sentences should help the search engine understand all the different ways a user might ask for this data.

  **Guiding Principles for Sentence Generation:**
  1.  **Focus on the Semantic Core:** The true meaning of the variable lies in its `name`, `populationType`, and, most importantly, its `constraintProperties`. Your generated sentences should primarily be variations of this semantic core.
  2.  **Maximize Conceptual & Synonym Diversity:** Do not just rephrase generic statistical terms like "count of". Find rich synonyms and related concepts for the semantic core. For example, for a variable with a constraint `foreignBorn`, generate sentences using terms like "immigrants", "immigrant population", "people born outside the country", or "data on immigration".
  3.  **Anticipate User Intent:** Think like a user (researcher, student, journalist). The sentences should be direct descriptions (e.g., "total immigrant population"), not full questions. Anticipate and include variations in capitalization (e.g., Covid, covid, COVID, COVID-19).

  **Input:**
  You will be given a JSON array of statistical variable metadata objects.

  **Output Requirements:**
  Your output MUST be a JSON array of objects.
  Each object MUST contain two keys:
  1.  `"dcid"`: The original dcid from the input, copied exactly.
  2.  `"generatedSentences"`: An array of 3-7 strings you generated.

  **Example:**

  *Input Metadata:*
  ```json
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
          "dcid": "Count_Person_5OrMoreYears_ForeignBorn",
          "name": "Population: Foreign Born",
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": [
              "age": "Years5Onwards",
              "nativity": "USC_ForeignBorn"
          ],
          "numConstraints": 2
      }}
  ]
  ```

  *Expected Output:*
  ```json
  [
      {{
          "dcid": "Count_Student_PreKindergarten",
          "generatedSentences": [
              "number of pre-k students",
              "kids in pre-kindergarten",
              "student count in pre-kindergarten",
              "preschool student population"
          ]
      }},
      {{
          "dcid": "Count_Person_5OrMoreYears_ForeignBorn",
          "generatedSentences": [
              "number of immigrants age 5 and older",
              "Population of residents born outside the country, excluding young children",
              "non-native people 5 years or older",
              "Immigrant population not including children aged 0 to 4"
          ]
      }}
  ]
  ```
  ---

  Here is the metadata you need to process. Remember to return only the generated sentences in the specified JSON format.

  **Metadata to process:**

  """


def get_gemini_prompt_with_translations(target_language: str) -> str:
  return f"""You are an expert linguist and translator specializing in generating semantically rich and diverse descriptions of statistical variables for a state-of-the-art search application.

  **Primary Goal:**
  Your task is to generate a set of 3-7 conceptually different and natural-sounding alternative descriptions, **in {target_language}**, for each statistical variable provided. These sentences are critical as they will be used to generate embeddings for a Vertex AI Search application.

  **Guiding Principles for Sentence Generation:**
  1.  **Focus on the Semantic Core:** Analyze the `name`, `populationType`, and `constraintProperties` of the English input to understand the variable's meaning.
  2.  **Maximize Conceptual & Synonym Diversity:** Generate creative and diverse sentences in {target_language} that capture the essence of the variable.
  3.  **Anticipate User Intent:** Think like a user searching in {target_language}. The sentences should be direct descriptions, not full questions.

  **Input:**
  You will be given a JSON array of statistical variable metadata objects in English.

  **Output Requirements:**
  Your output MUST be a JSON array of objects.
  Each object MUST contain two keys:
  1.  `"dcid"`: The original dcid from the input, copied exactly.
  2.  `"generatedSentences"`: An array of 3-7 sentences you generated in **{target_language}**.

  **Example:**

  *Input Metadata (English):*
  ```json
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
          "dcid": "Count_Person_5OrMoreYears_ForeignBorn",
          "name": "Population: Foreign Born",
          "measuredProperty": "count",
          "populationType": "Person",
          "statType": "measuredValue",
          "constraintProperties": [
              "age": "Years5Onwards",
              "nativity": "USC_ForeignBorn"
          ],
          "numConstraints": 2
      }}
  ]
  ```

  *Expected Output (if target_language is "Spanish"):*
  ```json
  [
      {{
          "dcid": "Count_Student_PreKindergarten",
          "generatedSentences": [
              "número de estudiantes de pre-kínder",
              "niños en pre-kindergarten",
              "cantidad de alumnos en preescolar"
          ]
      }},
      {{
          "dcid": "Count_Person_5OrMoreYears_ForeignBorn",
          "generatedSentences": [
              "número de inmigrantes de 5 años o más",
              "Población de residentes nacidos fuera del país, excluyendo niños pequeños",
              "personas no nativas de 5 años o más",
              "Población inmigrante sin incluir niños de 0 a 4 años"
          ]
      }}
  ]
  ```
  ---

  Here is the metadata you need to process. Remember to return only the generated sentences in **{target_language}** using the specified JSON format.

  **Metadata to process:**

  """
