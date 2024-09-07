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

/**
 * A component to render the splash quote of the about page.
 */

const SplashQuote = (): ReactElement => {
  return (
    <div>
      <p>
        “Every moment around the world people and organizations are generating
        data that can be extraordinary useful and I think we have to find the
        way to harness that to solve problems. The challenge is that a lot of
        this data is very fragmented.”
      </p>
      <p className="byline">
        James Manyika, Senior Vice President, Research, Technology & Society at
        Google
      </p>
    </div>
  );
};

export default SplashQuote;
