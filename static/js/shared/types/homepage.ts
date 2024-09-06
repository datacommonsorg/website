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
 * Typing for components and TypeScript associated with the homepage template.
 */

//An interface for the partner objects that are passed through to the JavaScript from the template.
//These are then used to render the partner links on the homepage.
export interface Partner {
  //the id of the partner
  id: string;
  //the name of the partner
  title: string;
  //the url that the partner box links to
  url: string;
  //the sprite index of the partner's logo
  "sprite-index": number;
}

//An interface for the topic objects that are passed through to the JavaScript from the template.
//These are used to render the topics links on the homepage
export interface Topic {
  //the id of the topic
  id: string;
  //the title of the topic
  title: string;
  //a blurb describing the topic
  description: string;
  //the icon is currently unused by the homepage template
  icon: string;
  //the image is unused by the homepage template
  image: string;
  //the url is unused by the homepage template
  url: string;
  //the url that the topic box links to
  browseUrl: string;
  //the sprite index of the partner's logo
  "sprite-index": number;
}
