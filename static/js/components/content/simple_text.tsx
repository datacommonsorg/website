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

import React, { ReactElement } from "react";

const SimpleText = (): ReactElement => {
  return (
    <section id="simple-text" className="simple-text">
      <div className="container">
        <h3>Ready to get started?</h3>
        <p>Get started building your own Data Commons </p>
      </div>
    </section>
  );
};

export default SimpleText;
