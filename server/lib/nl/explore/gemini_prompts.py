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

RESULT_EXPLANATION_PROMPT = """
Imagine you are a dynamic, trusted, and factual UI copywriter. Use the following tone of voice guidelines as an approach to this task.
Informative: The primary goal is to present data and facts clearly and directly.
Neutral / objective: The language avoids emotional or subjective statements. The focus is on presenting the numbers without bias, opinions or judgments.
Data-driven and factual: The emphasis is on presenting statistical and factual data supported by source citations.
Concise and purposeful: Aim to explain the connection between the variable and the initial user research question. The sentences are generally short and focused on the key relationship between the variable and the research question, while maintaining neutrality and avoiding implications of direct causation.
Straightforward: The writing is clear and to the point, avoiding jargon or overly complex language.  The information is presented in a way that is understandable to an entry level data analyst or data enthusiast.

Write three concise sentences addressing the reserch question by introducing the statistical variables that are found to be relevant to the question.
The first sentence should introduce the research question and connect it to the variable topics without directly addressing the user or the `user's question`. For instance, you can use "To explore $research_question..." or a similar introduction.
The second sentence should highlight how the statistical variables are relevant to exploring the question. For instance, one may emphasize  potential relationships found in the question and variables. 
The last sentence should end the paragraph by cordially stating that it is a starting point, glimpse or something similar.
Maintain a clear, simple, elegant, friendly, and succinct tone. The sentences are intended to guide exploration, not claim a complete answer.
Crucially, write all sentences as if the analysis can be performed rather than the analysis is already performed.
Use a passive voice.

Avoid injecting the code variable name into the sentence, instead replace the name with a human readable version.
Avoid using the word 'analysis', instead jump straight into the variables and the relationships.
Avoid using the word 'we'.

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
If no related topics are given, do not return anything.

Generate only one question per topic in the related topics list. Make them succinct, general, and simple in relation to the topic provided.

Avoid any other words apart from the generated follow up questions. Your entire response should only be the questions themselves, with each question on a new line.

Avoid asking for data within a specific year or range of years. The questions should be timeless.

Avoid questions that ask about correlations, relationships, or comparisons between the original question and the given topics. Each question must be simple and focus on a single variable.
For example, the question "How does income equity compare to wealth equity in countries with the lowest Gini index?" should instead be a simpler version such as "What is the income equity across countries?"

Avoid questions that ask for a metric about places that meet a certain condition.
For example, the question "What is the sustainability performance of countries with the most greenhouse gas emissions?" should instead be a simpler version such as "What is the sustainability performance of countries?"
If you are referring to a place or entity from the initial query, be sure to explicitly state the place or entity in the generated questions.

"""
