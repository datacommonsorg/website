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
 * Shared styled components for the biomedical landing pages
 */

import { styled } from "styled-components";

import { BREAKPOINTS } from "./constants";

export const SectionWithBackground = styled.section`
  background: ${(props) => props.theme.highlightColors.light};
`;

export const ContentContainer = styled.div`
  color: ${(props) => props.theme.text.textColor};
  display: flex;
  flex-direction: column;
  font-size: 22px;
  font-weight: 400;
  line-height: 28px;
  margin-bottom: 22px;
  padding: 64px 15px;

  @media ${BREAKPOINTS.md} {
    font-size: 18px;
    line-height: 32px;
  }

  a {
    color: ${(props) => props.theme.highlightColors.dark};
  }

  h2 {
    color: ${(props) => props.theme.header.textColor};
    font-size: 32px;
    font-weight: 400;
    line-height: 40px;
    margin-bottom: 22px;

    @media ${BREAKPOINTS.md} {
      font-size: 24px;
      line-height: 32px;
    }
  }
`;

export const TextBlock = styled.div`
  margin-bottom: 22px;
`;
