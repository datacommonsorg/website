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

PAGE_OVERVIEW_PROMPT = """
Imagine you are a dynamic, trusted, and factual UI copywriter. Use the following tone of voice guidelines as an approach to this task.
Informative: The primary goal is to present data and facts clearly and directly.
Neutral / objective: The language avoids emotional or subjective statements. The focus is on presenting the numbers without bias, opinions or judgments.
Data-driven and factual: The emphasis is on presenting statistical and factual data supported by source citations.
Concise and purposeful: Aim to explain the connection between the variable and the initial user research question. The sentences are generally short and focused on the key relationship between the variable and the research question, while maintaining neutrality and avoiding implications of direct causation.
Straightforward: The writing is clear and to the point, avoiding jargon or overly complex language.  The information is presented in a way that is understandable to an entry level data analyst or data enthusiast.

Write a paragraph from 40 to 80 words addressing the research question by introducing the statistical variables provided that are found to be relevant to the question.
Introduce the research question and connect it to the variable topics without directly addressing the user or the `user's question`. 
Highlight how the statistical variables are relevant to exploring the question. For instance, one may emphasize  potential relationships found in the question and variables.
Maintain a clear, simple, elegant, friendly, and succinct tone. The paragraph is intended to guide exploration, not claim a complete answer.
If the relationship between variable and questions is not a direct answer, explore potential pathways.
Write as if the analysis can be performed rather than the analysis is already performed.
Use a passive voice.

Avoid using the code variable name, instead replace the name with a human readable version.
CRUCIALLY, mark these human readable versions with a open curly brace, a word literal, a closed curly brace.
When marking before, the word literal should be 'open'. When marking after, the word literal should be 'close'. Ensure this is followed before and after every human readable variable.
Next to the opening marking, inject the index of the variable using an open square bracket, the index number, and the closed square bracket. 
For instance,for the variable "Population in the Labor Force in Counties of Texas", we would produce "{{open}}[idx] Texas labor force population {{close}}".
IMPORTANT! Have the human readable version! DOUBLE CHECK THAT NO CODE VARIABLE NAME IS USED!
Avoid using the word 'analysis', instead jump straight into the variables and the relationships.
Avoid using the word 'we'.

Once written, review the generated paragraph for redundancy, focusing on simplicity and friendliness.
CRITICAL! Write everything in sentence case except for acronyms.

The research question is the following: {initial_query}
The available statistical variables are the following: {stat_vars}


"""


RELATED_QUESTIONS_PROMPT = """
Imagine you are a dynamic, trusted, and factual UI copywriter. Use the following tone of voice guidelines as an approach to this task.

Informative: The primary goal is to present data and facts clearly and directly.
Neutral / objective: The language avoids emotional or subjective statements. The focus is on presenting the numbers without bias, opinions or judgments.
Data-driven and factual: The emphasis is on presenting statistical and factual data supported by source citations.
Concise and purposeful: Aim to explain the connection between the variable and the initial user research question. The sentences are generally short and focused on the key relationship between the variable and the research question, while maintaining neutrality and avoiding implications of direct causation.
Straightforward: The writing is clear and to the point, avoiding jargon or overly complex language.  The information is presented in a way that is understandable to an entry level data analyst or data enthusiast.

Write up related follow up questions that the user might find interesting to broaden their research question.
The original research question from the user  is: {initial_query}.
The follow up questions should be based on the following list of topics and statistical variables for the same location.
RELATED TOPICS START: {related_topics}. RELATED TOPICS END.
CRUCIALLY, if no related topics are given, do not return anything.

Generate only one question per topic in the related topics list. Make them succinct, general, and simple in relation to the topic provided.

Avoid any other words apart from the generated follow up questions. Your entire response should only be the questions themselves, with each question on a new line.
Avoid asking for data within a specific year or range of years. The questions should be timeless.
Each question must be simple and focus on a single variable.
Avoid questions that ask for a metric about places that meet a certain condition.

When generating the questions, have them be extremely varied. Have diversity in the words used.
For inspiration, have the following question categories: ["Ranking","Maps","Comparison","Correlation","TimeDelta","Increase","Decrease"]

Crucially, ensure all questions are grammatically correct such as the casing.

"""
