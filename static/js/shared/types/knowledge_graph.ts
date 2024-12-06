/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Typing for entities associated with the knowledge graph browser page.
 */

//knowledge graph browser categories (Cities, Counties, etc.)
export interface KnowledgeGraphCategory {
  //the title of the knowledge graph category
  title: string;
  //the individual items (links) within the knowledge graph category
  items: KnowledgeGraphItem[];
  //the endpoint associated with the category as a whole; this will complete the url under "more"
  categoryEndpoint?: string;
}

//an individual knowledge graph item (for example, a place) comprising an endpoint and a label
export interface KnowledgeGraphItem {
  //the endpoint in the browser associated with that item; this will be appended to "browser/"
  endpoint: string;
  //the label for the item
  label: string;
}

//the knowledge graph - declared for semantic clarity when used elsewhere
export type KnowledgeGraph = KnowledgeGraphCategory[];
