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

/*
 * Material Icon: Arrow Outward
 * Source: https://fonts.google.com/icons
 */

import React, { ReactElement } from "react";

export const ArrowOutward = (
  props: React.SVGProps<SVGSVGElement>
): ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="1em"
    viewBox="0 -960 960 960"
    width="1em"
    fill="currentColor"
    {...props}
  >
    <path d="m256-240-56-56 384-384H240v-80h480v480h-80v-344L256-240Z" />
  </svg>
);
