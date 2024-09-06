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
 * Typing for components and TypeScript associated with the base template.
 */

// The top level of the header menu
export interface HeaderMenu {
  //the label that displays in the top level menu item of the header
  label: string;
  //the aria-label attribute for that header
  ariaLabel: string;
  //the children of the top-level menu (these populate the dropdowns that appear on click)
  subMenu: HeaderSubMenu[];
}

//The entries that populate the dropdown menus in the header menu
export interface HeaderSubMenu {
  //the link of the entry - these can be either a route, a url, or a route embedded into a string: {tools.visualization}#visType=timeline)
  href: string;
  //the label (the text) of the link
  label: string;
  //an option to hide the entry - this is to allow the json to contain items (for later forking) that will not display on the menu (such as BigQuery)
  hide?: boolean;
}

//The sections of the footer menu
export interface FooterMenu {
  //the label of the section: this appears directly above the list of links.
  label: string;
  //the list of links that appear in the section
  subMenu: FooterSubMenu[];
}

//The entries that populate a section of the footer.
interface FooterSubMenu {
  //the link of the entry - these can be either a route, a url, or a route embedded into a string: {tools.visualization}#visType=timeline)
  href: string;
  //the label (the text) of the link
  label: string;
  //an option to hide the entry - this is to allow the json to contain items (for later forking) that will not display on the menu (such as BigQuery)
  hide?: boolean;
}

// The top level of the header menu
export interface HeaderMenuV2 {
  //the label that displays in the top level menu item of the header
  label: string;
  //an optional url - if this is supplied, any subsequent information will be ignored as the rich menu cannot be clicked
  url?: string;
  //the aria-label attribute for that header
  ariaLabel: string;
  //text that displays in the introduction section of the desktop menu
  introduction?: string;
  //the content of the primary column (the column directly next to the introduction column;
  primarySectionGroups?: HeaderMenuGroup[];
  //the content of the secondary column (the smaller column to the right of the introduction column;
  secondarySectionGroups?: HeaderMenuGroup[];
}

// a subsection of the header menu. These contain an optional title and a list of content items.
export interface HeaderMenuGroup {
  id: string;
  //an optional title for the column group
  title?: string;
  //a list of the content items associated with each column
  items: HeaderMenuItem[];
}

// a header group content item - each group is populated by these.
export interface HeaderMenuItem {
  //the title of the header menu item - this can be a link if a link is given, otherwise a regular header
  title?: string;
  //the url of the header menu item - giving one will make the title clickable
  url?: string;
  //the type of link: internal, external or rss - this determines how the link is decorated.
  linkType?: LinkType;
  //a description of the item. This will go below the link, and is optional.
  description?: string;
  //an optional list of links that appear below the description.
  links?: HeaderMenuItemLink[];
}

// a header menu item link - these links will appear below the header item description if links are given.
export interface HeaderMenuItemLink {
  //the title of a header menu item link
  title: string;
  //the type of link: internal, external or rss - this determines how the link is decorated.
  linkType: LinkType;
  //the url of the link
  url: string;
}

//a union of possible link types for determining how links are decorated.
export type LinkType = "internal" | "external" | "rss";

//A dictionary of routes. These map route names, such as "tools.visualization" to the resolved route.
//These are implemented as a proxy object that will return the text of the key if the key is not found.
//This is to allow the flexibility using both urls and routes in source data such as JSON that will be passed through the object.
export type Routes = Record<string, string>;

//A dictionary of labels. These map words or phrases, such as "Data Commons" to a version that has been passed through a {% trans %} tag in the template.
//These are implemented as a proxy object that will return the text of the key if the key is not found.
//This is to allow the flexibility of putting in text in the source data such as JSON that may not have yet been provided.
export type Labels = Record<string, string>;
