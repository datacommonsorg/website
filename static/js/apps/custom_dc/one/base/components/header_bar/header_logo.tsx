/**
 * Copyright 2025 Google LLC
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
 * /** One.org logo
 */

import React, { ReactElement } from "react";

const HeaderLogo = (): ReactElement => {
  return (
    <div className="navbar-brand">
      <div className="main-header-logo">
        <a
          href={"https://data.one.org"}
          aria-label={"Back to ONE Data Commons Homepage"}
        >
          <img
            src={"/custom_dc/one/images/one-logo.svg"}
            alt={`one.org logo`}
          />
        </a>
      </div>
      <a href={"/"} className="main-header-name">
        Data
      </a>
    </div>
  );
};

export default HeaderLogo;
