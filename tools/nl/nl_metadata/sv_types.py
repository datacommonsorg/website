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
from dataclasses import dataclass
from dataclasses import field


@dataclass
class StatVarMetadata:
  """
    A dataclass to structure and normalize metadata pulled for statistical variables from the Data Commons API.
    Some static fields are common across all stat vars (i.e. dcid, sentence, measuredProperty, name, populationType, statType),
    whereas constraintProperties are dynamic and can vary for each stat var.
    """

  dcid: str
  sentence: str
  generatedSentences: list[str] | None = None
  measuredProperty: str | None = None
  name: str | None = None
  populationType: str | None = None
  statType: str | None = None
  constraintProperties: list[str] = field(default_factory=list)


englishSchema: dict[str, str | list[str]] = {
    "dcid": "",
    "sentence": "",
    "generatedSentences": [],
    "name": "",
    "measuredProperty": "",
    "populationType": "",
    "statType": "",
    "constraintProperties": []
}

frenchSchema: dict[str, str | list[str]] = {
    "dcid": "",
    "phrase": "",
    "phrasesGenerees": [],
    "nom": "",
    "proprieteMesuree": "",
    "typePopulation": "",
    "typeStatistique": "",
    "contraintes": []
}

spanishSchema: dict[str, str | list[str]] = {
    "dcid": "",
    "frase": "",
    "frasesGeneradas": [],
    "nombre": "",
    "propiedadMedida": "",
    "tipoPoblacion": "",
    "tipoEstadistico": "",
    "restricciones": []
}
