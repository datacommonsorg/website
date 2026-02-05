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

export const SocialYouTube = (
  props: React.SVGProps<SVGSVGElement>
): ReactElement => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="m21.582 6.186c-.23-.86-.908-1.538-1.768-1.768-1.56-.418-7.814-.418-7.814-.418s-6.254 0-7.814.418c-.86.23-1.538.908-1.768 1.768-.418 1.56-.418 5.814-.418 5.814s0 4.254.418 5.814c.23.86.908 1.538 1.768 1.768 1.56.418 7.814.418 7.814.418s6.254 0 7.814-.418c.861-.23 1.538-.908 1.768-1.768.418-1.56.418-5.814.418-5.814s0-4.254-.418-5.814zm-11.582 9.278v-6.928l6 3.464z" />
  </svg>
);
