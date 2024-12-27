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
 * A component to display the "Ready To Get Started" section on the build page
 */

import React, { ReactElement } from "react";

import SimpleText from "../../../components/content/simple_text";

export const GetStarted = (): ReactElement => {
  return (
    <SimpleText>
      <>
        <h3>Ready to get started?</h3>
        <p>
          <a
            href="https://docs.datacommons.org/custom_dc?utm_source=buildpage_start"
            title="Get started"
          >
            Get started
          </a>{" "}
          building your own Data Commons{" "}
        </p>
      </>
    </SimpleText>
  );
};
