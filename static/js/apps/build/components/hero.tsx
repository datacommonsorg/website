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
 * A component to render the hero section of the build your own Data Commons page.
 */

const Hero = (): ReactElement => {
  return (
    <div>
      <p>
        Build your Data Commons, overlay your data with global data, and let
        everyone in your organization uncover insights with natural language
        questions. Learn how
      </p>
    </div>
  );
};

export default Hero;