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

const BrandingLinkContainer = styled.div`
  display: flex;
  flex-direction: row;
  font-weight: 500;
  flex-shrink: 0;
  a {
    display: flex;
    align-items: center;
    color: #151515;
    text-decoration: none;
  }
  img {
    width: 100px;
    align-self: flex-end;
    margin-left: 0.5rem;
  }
`;

export const BrandingLink: React.FC = () => {
  return (
    <BrandingLinkContainer>
      <a
        href="https://datacommons.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Powered by Google's{" "}
        <img className="logo-secondary-image" src="images/dc-logo.png" />
      </a>
    </BrandingLinkContainer>
  );
};
