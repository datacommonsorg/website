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


def get_gemini_response_token_counts(response):
  return (response.usage_metadata.prompt_token_count,
          response.usage_metadata.candidates_token_count)
