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

import json

ENTITY_RANK_PROMPT = '''We are going to traverse a knowledge graph to answer the query: {QUERY}

In order to respond to this query, we will be traversing a knowledge graph.
We are trying to determine which of the following would be the most helpful starting place to answer the query.

I'm providing you with a dictionary where the keys are the entities for you to rank and the values are the node types of those entities to help you determine the ranking.
Your response should only contain the keys of this dictionary.

{ENTS}

Rank the list above with each key on a newline. Then in a separate paragraph, explain your reasoning.

Your output should look like:
```
choice1
choice2
choice3
.
.
.

I ranked dcid1 first because....
```
(Don't include the backticks (`) in your response, those are to show you where the expected response starts and stops.)

If none of the entities make sense to start a graph traversal from to answer the query or if there is a significant mismatch between the word and the detected nodeType in the graph, then simply return the word NONE.
In this case your response should look like:
```
NONE
```
'''

TRAVERSAL_PROMPT = '''
We are traversing a knowledge graph to respond to the query "{QUERY}"

We are starting with {START_ENT} which has been matched to entities with the IDs {START_DCIDS} in our graph.

I will provide you with a dictionary where the keys are the IDs above and the values are paths that can be traversed starting from that ID. Each property traversed in the path is represented as (property) and each path should be read as a continuous traversal from left to right.
I will also provide you some descriptions of properties and NodeTypes to help you with your decisions.

You have two tasks: (1) Determine which paths are most relevant to the query so far and (2) whether the paths are sufficient or if we need to continue traversing them to get a complete answer for the query.
Check all paths from each startingId. It's okay if the picked paths only start from one or a subset of the start IDs.

To complete this task, follow the steps:
  1. Determine which paths are most relevant to the query so far.
  2. Are these paths sufficient to provide a complete answer to the query? (If you select yes, we will not be pulling any more additional information from the knowledge graph. To select yes, you must be confident that NO additional data is needed from the paths to fully and completely answer the query.)
  3. If yes, select the paths that pull in the least amount of irrelevant information to answer the query, or in other words the shortest paths. You can cut a path short if only the first N properties are needed to answer the query. The first line of your response will be "DONE" followed by the paths in format specified below.
     If no, select the paths that we should continue searching to get the necessary data. The first line of your response will be "CONTINUE" followed by the paths to continue searching in the format specified below.

  If none of the paths seem relevant to the query, simply respond with "NONE".

Examples:
{{
  'startId1': [
    "(propA) (propB)",
    "(propA) (propC) (propD)",
    "(propD)"
  ]
  'startId2': [
    "(propD) (propE)",
    "(propF) (propG) (propH)",
    "(propG)"
  ]
}}

1. If we needed both paths (propA -> propC) and (propD -> propE), then the output would be:
```
DONE
path1: startId1 (propA) (propC)
path2: startId2 (propD) (propE)

My reasoning for choosing DONE and selecting these paths are...
```
Notice in this example, we were provided with (propA -> propC -> propD) but only (propA -> propC) was necessary to answer the query so we only returned propA and propC in the output path.


2. If we needed to continue searching the path of (propF -> propG -> propH) to sufficiently answer the query, then the output would be:
```
CONTINUE
path2: startId2 (propF) (propG) (propH)

My reasoning for choosing CONTINUE and selecting this path is...
```

Then double check that all selected paths are either an exact match or a prefix of a path from the dictionary. Underneath your paths, let me know if you double checked this and your reasoning behind your selections.

Here are all of the paths we can traverse starting from {START_ENT}:
{LINKS}

Here is more information about each property and NodeType:
{METADATA}
'''

FINAL_PROMPT = """Using the json object below, respond to the query: "{sentence}"

The json object will be in the following format.
{{
    <entity1>: {{  
      "outgoing": {{
        <property>: [
          {{
            "dcid": "<entity2>"
            "types": ["<Type of entity2>"]
          }},
          {{
            "value": "literal value of this property"
          }},
          ...
        ],
        ...
      }}, 
      "incoming": {{
        <property>: [
          {{
            "dcid": "<another entity>"
            "types": ["<Type of this other entity>"]
          }},
        ],
      }}
    }},
    <entity2>: {{  
      "outgoing": {{
        <property>: [
          {{
            "dcid": "<another entity>"
            "types": ["<Type of this other entity>"]
          }},
        ],}}, 
      "incoming": {{
        ...
      }}
    }},
  ...
  "property_descriptions": {{}}
}}
To understand the json object:
- the json object is used to represent a knowledge graph where entities are
  nodes of the graph and properties are the directed edges connecting the
  entities.
- the 'incoming' dicts represent edges that pointing at the entity
- the 'outgoing'dicts represent edges that pointing away from the entity
- property_descriptions are descriptions for each property from in_arcs and
out_arcs


In your response, when citing a value from the text, please include the path to
get the value in square brackets.
For example, if the object contains:
{{
  "geoId/06"": {{
    "outgoing": {{
      "containedInPlace": {{
        "nodes": [{{
          "dcid": "country/USA",
          ...
        }}]
      }}
    }}
  }},
  ...
}}
To cite this fact, please cite it like:
 "... is contained in USA [geoId/06.outgoing.containedInPlace]"


You are only allowed to use the information given in the json object. I will be
checking your answers to make sure they can be found in the json object.

If the json object is insufficient to fully answer the query, include the
entities you need information about and use the dcid if available. If there are
additional entities that you need that you know the dcid of, include this at
the end of your response "ADDITIONAL_ENTITY_DCIDS: <list of entity dcids>". If
there are additional entities that you need that you only know the name of,
include at the end of your response "ADDITIONAL_ENTITY_NAMES: [entities you only have the name of]".

```
{json_str}
```

So now, using the json object above, respond to the query: "{sentence}"

Once you have your final answer, make the response as human-readable as possible using bullet points, markdown tables, etc but keep the sources (ie the [out_arcs..*] and [in_arcs..*].
"""


def get_gemini_response_token_counts(response):
  return (response.usage_metadata.prompt_token_count,
          response.usage_metadata.candidates_token_count)


def format_dict(obj):

  def set_encoder(obj):
    if isinstance(obj, set):
      return list(obj)
    return obj

  return json.dumps(obj, indent=4, default=set_encoder, sort_keys=True)
