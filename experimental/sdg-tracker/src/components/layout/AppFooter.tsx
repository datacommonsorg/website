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

import { Layout } from "antd";
import styled from "styled-components";

const Byline = styled.div`
  .text {
    font-size: 0.75em;
    font-weight: 400;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .logo {
    margin-left: 0.3em;
    margin-top: -0.2em;
    height: 1.4em;
  }
`;

const AppFooter = () => {
  return (
    <Layout.Footer>
      Powered by Google's{" "}
      <a
        href="https://datacommons.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Data Commons
      </a>
    </Layout.Footer>
  );
};

export default AppFooter;
