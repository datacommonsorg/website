/**
 * Copyright 2023 Google LLC
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

import styled from "styled-components";

/**
 * Styling for a section on the homepage.
 */
export const HomeSection = styled.div`
  padding: 64px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: Roboto;
  flex-shrink: 0;
`

/**
 * Styling for the header for each section.
 */
export const SectionHeader = styled.div`
  font-size: 24px;
  font-weight: 500;
  text-align: center;
`

/**
 * Styling for the description for each section.
 */
export const SectionDescription = styled.div`
  font-size: 16px;
  font-weight: 400;
  text-align: center;
  max-width: 886px;
`

/**
 * Styling for search bar containers on the home page.
 */
export const HomeSearchContainer = styled.div`
  max-width: 778px;
  width: 100%;
  height: 45px;
`