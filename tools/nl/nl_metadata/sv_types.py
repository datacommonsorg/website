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
from pydantic import BaseModel

class StatVarMetadata(BaseModel):
  """
    A class to structure and normalize metadata pulled for statistical variables from BigQuery and Gemini.
    Some static fields are common across all stat vars (i.e. dcid, measuredProperty, name, populationType, statType),
    whereas constraintProperties are dynamic and can vary for each stat var. The generatedSentences field is generated 
    by Gemini and contains a list of sentences that describe the stat var in a natural language format.
    """

  dcid: str
  generatedSentences: list[str]
  measuredProperty: str
  name: str
  populationType: str
  statType: str
  constraintProperties: list[str]

englishSchema: dict[str, str | list[str]] = {
    "dcid": "",
    "generatedSentences": [],
    "name": "",
    "measuredProperty": "",
    "populationType": "",
    "statType": "",
    "constraintProperties": [],
}

frenchSchema: dict[str, str | list[str]] = {
    "dcid": "",
    "phrasesGenerees": [],
    "nom": "",
    "proprieteMesuree": "",
    "typePopulation": "",
    "typeStatistique": "",
    "contraintes": []
}

spanishSchema: dict[str, str | list[str]] = {
    "dcid": "",
    "frasesGeneradas": [],
    "nombre": "",
    "propiedadMedida": "",
    "tipoPoblacion": "",
    "tipoEstadistico": "",
    "restricciones": []
}
