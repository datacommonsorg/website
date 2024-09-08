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

const Quote = (): ReactElement => {
  return (
    <section id="quote" className="quote">
      <div className="container">
        <blockquote>
          “We were spending most of our time and resources cleaning data sets.
          Then we heard that there was this tool that essentially did that. When
          you fire up your data Commons instance, the first thing you see is
          there are billions of data points already available covering basically
          every country in the world, with data on a whole range of issues.”
        </blockquote>
        <p>- ONE.org</p>
      </div>
    </section>
  );
};

export default Quote;
