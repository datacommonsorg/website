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

import React, { ReactElement } from "react";

export const SocialInstagram = (
  props: React.SVGProps<SVGSVGElement>
): ReactElement => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="m8 3c-2.761 0-5 2.239-5 5v8c0 2.761 2.239 5 5 5h8c2.761 0 5-2.239 5-5v-8c0-2.761-2.239-5-5-5zm10 2c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1zm-6 2c2.761 0 5 2.239 5 5s-2.239 5-5 5-5-2.239-5-5 2.239-5 5-5zm0 2a3 3 0 0 0 -3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 -3-3z" />
  </svg>
);
