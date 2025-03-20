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

PARSE_QUERY_PROMPT = '''
Your task is to break down a natural language query into a structured output in two steps.

For context, we will be fetching data from a knowledge graph to respond to the user's query.
We need to know how much data we will need to pull and for which entities to get the data for.

You have two tasks:
  1. Classify the query into a TraversalType. There are two options:
    a. OVERVIEW: this means the query is asking for information strictly about an entity (or entities) such as a summary of or overview of that entity. 
      It could also be for asking for string-based properties of the entity, like its ID in another database, or alternative names. Queries that ask for
      other properties would fall into the TRAVERSAL category, described below.
    Here are some examples of OVERVIEW type queries where X represents an entity in our knowledge graph:
       - "tell me about X"
       - "X"
       - "description for X"
       - "what is the HGNC id of X"
      These examples are asking for information that can be answered by fetching only triples with string values where the entity is the source.
    b. TRAVERSAL: this indicates in order to answer the query, we will need to traverse the knowledge graph to find the triples that answer the query. Here are some examples:
      - "what diseases are associated with X"
      - "what drugs act on X"
      - "is there an association between X and Y"
      - "what is the genomic location of X?"
      These examples are asking for information that can only be answered by traversing the knowledge graph. This essentially covers all queries that are NOT requesting an overview, summary, or id of an entity.

  2. Identify detected entities. There are two parts to this:
    i. Identify the raw strings in the query that may represent entities in the knowledge graph which would be necessary to respond to the query. Examples:
      - "tell me about atorvastatin?": ["atorvastatin"]
      - "what drugs are associated with alzeihmers disease?": ["alzeihmers disease"]
      - "what genetic variants are associated with atorvastatin and have the gene symbol KIF6": ["atorvastatin", "KIF6"]
      - "What is the exemplar isolate of Betapapillomavirus 1?" ["Betapapillomavirus 1"]    
    
    ii. For each identified raw string:
      a. save a sanitized version of the string by fixing any typos that you are confident for and convert all characters to lower case
        - "Alzeihmers disease" -> "alzheimer's disease"
        - "Betapapillomavirus 1" -> "betapapillomavirus 1"
        If there are no typos in the raw string, just copy the raw string to the sanitized string.
      
      b. List any obvious synonyms for entity, this is mostly for drugs but should apply to cases where you think two different words would map to the same entity in a knowledge graph. Examples:
        - "tylenol" -> ["acetaminophen"]
        - "lipitor" -> ["atorvastatin"]
        Only do this for things you are confident for. Ensure that synonyms are lower case.
    
    These detected entities should be ordered such that the first entity would be the most helpful starting place for answering the query.

    Here are some examples of the final outputs for this step:
      - "tell me about atorvasttin": [{{"raw_str": "atorvasttin", "sanitized_str": "atorvastatin", "synonyms": ["lipitor"]}}]
      - "what drugs are associated with Alzeihmers Disease?": [{{"raw_str": "Alzeihmers Disease", "sanitized_str": "alzheimer's disease", "synonyms": []}}]
      - "What is the exemplar isolate of Betapapillomavirus 1?": [{{"raw_str": "Betapapillomavirus 1", "sanitized_str": "betapapillomavirus 1", "synonyms": []}}]

Now perform this task for the query:
{QUERY}
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

FINAL_RESPONSE_PROMPT = '''
Your task is to respond to a user's query with data from a knowledge graph that will be provided to you below.

The knowledge graph data will be in the following format.
{{
    <entity1>: {{  
      "outgoing": {{
        <property>: [
          {{
            "dcid": "<entity2>"
            "types": ["<Type of entity2>"]
          }},
        ],
        <property>: [
          {{
            "value": "literal value of this property"
          }},
        ],
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
        ],
      }}, 
      "incoming": {{...}}
    }},
  ...
  "property_descriptions": {{
    <property>: "description of this property"
  }}
}}
To understand the data:
- Each entity is a node of the graph and properties are the directed edges connecting the
  entities. Entities are uniquely identified by their DCID.
- The properties in the 'incoming' dictionary represent edges that point *towards* the entity. 
  Here is an example:
    {{
      "bio/ABCC2":{{
        "incoming":{{
          "geneID":[
            {{
              "dcid": "chem/CID60823_ABCC2",
              "types": ["ChemicalCompoundGeneAssociation"]
            }}
          ]
        }}
      }}
    }}
    This means that chem/CID60823_ABCC2 is a ChemicalCompoundGeneAssociation type and has the property geneID whose value is bio/ABCC2.
- The properties in the 'outgoing' dictionary represent edges that point *from* the entity. Here is an example:
  {{
    "bio/ABCC2": {{  
      "outgoing": {{
        "geneOrtholog": [
          {{
            "dcid": "bio/ncbi_100020524"
            "types": ["Gene"]
          }},
          {{
            "dcid": "bio/ncbi_100060654"
            "types": ["Gene"]
          }},
        ],
        "fullName": [
          {{
            "value": "ATP binding cassette subfamily C member 2"
          }},
        ],
      }}, 
  }}
  This means that bio/ABCC2 has the property geneOrtholog whose values are bio/ncbi_100020524 and bio/ncbi_100060654 (which are other entities in the graph).
  It also has the property fullName whose value is "ATP binding cassette subfamily C member 2".
- Overall, the sequence of <entity><property><entity or value> is considered a triple
- property_descriptions are descriptions for each property in the graph.

IMPORTANT: in this knowledge graph, nodes with a type ending in "Association" don't always mean that the two entities linked are associated. 
  The association nodes will hold a value to indicate association *type* between the two entities. This could be "Not Associated" or "Ambiguous", indicating that entities aren't actually associated.
  MAKE SURE to examine the relationshipAssociationType of the association node before assuming that two entities are actually associated according to the data.

We want to ensure the user can trace the info from your response to our knowledge graph.
Therefore, when citing a value from the data, please include a keyed reference to the triple in the response.
Here are some examples for citations based on the example data provided above:

  answer: "ABCC2 has a potential association with a drug [1] and its full name is ATP binding cassette subfamily C member 2 [2]. The gene has two orthologs, one with ncbi id 100020524 [3] and one with ncbi id 100060654 [3]."
  references: [ 
    CitedTripleReference(
      key=1
      source= "bio/ABCC2", 
      direction= INCOMING, 
      prop= "geneID", 
      linked_type= ChemicalCompoundGeneAssociation
      ),
    CitedTripleReference(
      key=2
      source= "bio/ABCC2", 
      direction= OUTGOING, 
      prop= "fullName", 
      linked_type=""
      ),
    CitedTripleReference(
      key=3
      source= "bio/ABCC2", 
      direction= OUTGOING, 
      prop= "geneOrtholog", 
      linked_type=""
      ),
    ]
      - Important: Only populate linked_type when the direction is Incoming!
      - Do not repeat identical CitedTripleReferences in the references list. You can cite the same CitedTripleReference key multiple times, as we see with citing the CitedTripleReference with key=3 twice in the example above.
      - Any claim you make should have a citation to the provided data

Please double check that your citation number in the answer response correctly matches the key in the references dictionary.
Double check that if you are asserting an association between two entities, that you have examined the association node. 
If data for the association node is not provided, list it under "additional_entity_dcids"

You are only allowed to use the information given in the data from our knowledge graph. I will be
checking your answers to make sure they can be found in the json object.

If the json object is insufficient to fully answer the query, include the
entities you need information about and use the dcid if available. If there are
additional entities that you need that you know the dcid of, include this as a list in  "additional_entity_dcids". 
If there are additional entities that you need that you only know the name of,
include this as a list in "additional_entity_names".

Once you have your final answer, make the response as human-readable as possible using bullet points, markdown tables, etc in the "answer" field.

Then double check that your citation number in the answer response correctly matches the key in the references dictionary.
Double check that if you are asserting an association between two entities, that you have examined the association node. 
If data for the association node is not provided, list it under "additional_entity_dcids". You can say that the nodes *may* be associated, but that further investigaion is required.

If the query is just the name of an entity, give an overview or summary of the entity given the information provided below.

So now, using the data below, respond to the query: 
"{QUERY}"

```
{ENTITY_INFO}
```
'''

FALLBACK_PROMPT = '''
Context: A user has submitted a query which we are responding to with data from a knowledge graph.
The query is: {QUERY}
We found that starting from {START_ENT}({START_DCIDS}) in the graph, these paths might be relevant:
{SELECTED_PATHS}

Where each paths starts from the key and is a list of properties (or hops) in the graph to connected entities.

We tried fetching all of the entities from the graph that are along the path, but the amount of data is too large to give to you to summarize.
Given the info about {START_ENT} below, can you summarize this situation for the user and tell them how they might find their answer using 
the given path in the knowledge graph?

They are provided with a UI that lists triples for a given entity.

{ENTITY_INFO}

At the end of your response, you can refer them to https://docs.datacommons.org/api/ for info about querying the Knowledge graph.
'''

MAX_NUM_DCID_PER_V2NODE_REQUEST = 100


def get_gemini_response_token_counts(response):
  return (response.usage_metadata.prompt_token_count,
          response.usage_metadata.candidates_token_count)


def format_dict(obj):

  def set_encoder(obj):
    if isinstance(obj, set):
      return list(obj)
    return obj

  return json.dumps(obj, indent=4, default=set_encoder, sort_keys=True)


def batch_requested_nodes(nodes, batch_size=MAX_NUM_DCID_PER_V2NODE_REQUEST):
  """
  Splits a list of dcids into batches that do not exceed the DC API request size limit.
  """
  return [nodes[i:i + batch_size] for i in range(0, len(nodes), batch_size)]
